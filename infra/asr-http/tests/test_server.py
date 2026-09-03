import asyncio
import http.client
import importlib.util
import io
import json
import os
import threading
import unittest
import wave
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch


SERVER_PATH = Path(__file__).resolve().parents[1] / "server.py"


def load_server():
    spec = importlib.util.spec_from_file_location("lifeos_asr_http_server", SERVER_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot load {SERVER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def wav_bytes(pcm: bytes) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(pcm)
    return output.getvalue()


class WyomingFake:
    def __init__(self, transcript="hello world"):
        self.events = []
        self.transcript = transcript

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return False

    async def write_event(self, event):
        self.events.append(event)

    async def read_event(self):
        if not self.events or self.events[-1].type != "audio-stop":
            raise AssertionError("transcript requested before AudioStop")
        return self.transcript_event()

    def transcript_event(self):
        from wyoming.asr import Transcript

        return Transcript(text=self.transcript).event()


class FailingWyoming:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return False

    async def write_event(self, event):
        pass

    async def read_event(self):
        raise RuntimeError("ASR failed")


class UnavailableWyoming:
    async def __aenter__(self):
        raise ConnectionRefusedError("bridge unavailable")

    async def __aexit__(self, exc_type, exc_value, traceback):
        return False


class TimeoutWyoming:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return False

    async def write_event(self, event):
        pass

    async def read_event(self):
        await asyncio.sleep(1)
        return None


class DummySocket:
    def close(self):
        pass


class ServerTests(unittest.TestCase):
    def setUp(self):
        if not SERVER_PATH.is_file():
            self.fail("server.py is missing")

        self.env_patch = patch.dict(os.environ, {"LIFEOS_ASR_TOKEN": "test-token"})
        self.env_patch.start()
        self.module = load_server()
        self.httpd = self.module.ThreadingHTTPServer(
            ("127.0.0.1", 0), self.module.ASRHandler
        )
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=2)
        self.env_patch.stop()

    def request(
        self,
        method,
        path,
        body=b"",
        token="test-token",
        content_type=None,
        content_length=None,
    ):
        headers = {}
        if token is not None:
            headers["X-ASR-Token"] = token
        if content_type is not None:
            headers["Content-Type"] = content_type
        if content_length is not None:
            headers["Content-Length"] = str(content_length)
        connection = http.client.HTTPConnection("127.0.0.1", self.httpd.server_port)
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        response_body = response.read()
        connection.close()
        return response.status, json.loads(response_body)

    def test_token_auth_protects_health_and_transcription(self):
        for path in ("/health", "/v1/audio/transcriptions"):
            with self.subTest(path=path):
                status, body = self.request("POST", path, token="wrong")
                self.assertEqual(status, 401)
                self.assertEqual(body, {"error": "unauthorized"})

    def test_post_health_returns_ok_and_unavailable_is_503(self):
        create_connection = Mock(return_value=DummySocket())
        fake_socket_module = SimpleNamespace(create_connection=create_connection)
        with patch.object(self.module, "socket", fake_socket_module):
            status, body = self.request("POST", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(body, {"ok": True})
        self.assertEqual(create_connection.call_args.args[0], ("127.0.0.1", 10300))
        self.assertLessEqual(create_connection.call_args.kwargs["timeout"], 2)

        create_connection = Mock(side_effect=TimeoutError)
        with patch.object(
            self.module,
            "socket",
            SimpleNamespace(create_connection=create_connection),
        ):
            status, body = self.request("POST", "/health")
        self.assertEqual(status, 503)
        self.assertEqual(body, {"error": "wyoming_unavailable"})

    def test_post_transcription_verifies_exact_raw_pcm_event_flow(self):
        pcm = bytes(range(256)) * 6
        fake = WyomingFake()
        ffmpeg = SimpleNamespace(returncode=0, stdout=wav_bytes(pcm), stderr=b"")
        with patch.object(
            self.module.subprocess, "run", return_value=ffmpeg
        ) as run, patch.object(self.module.AsyncClient, "from_uri", return_value=fake):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"encoded audio",
                content_type="audio/webm;codecs=opus",
            )

        self.assertEqual(status, 200)
        self.assertEqual(body, {"text": "hello world"})
        self.assertEqual(run.call_args.kwargs["input"], b"encoded audio")
        command = run.call_args.args[0]
        self.assertIn("pipe:0", command)
        self.assertIn("-ar", command)
        self.assertIn("16000", command)
        self.assertIn("-ac", command)
        self.assertIn("1", command)

        from wyoming.audio import AudioChunk
        from wyoming.asr import Transcribe

        self.assertEqual(
            [event.type for event in fake.events],
            ["transcribe", "audio-start", "audio-chunk", "audio-chunk", "audio-stop"],
        )
        self.assertEqual(Transcribe.from_event(fake.events[0]).language, "en")
        self.assertEqual(
            fake.events[1].data,
            {"rate": 16000, "width": 2, "channels": 1, "timestamp": None},
        )
        chunks = [AudioChunk.from_event(event).audio for event in fake.events[2:4]]
        self.assertEqual(b"".join(chunks), pcm)
        self.assertTrue(all(len(chunk) <= 1024 for chunk in chunks))
        self.assertTrue(all(b"RIFF" not in chunk for chunk in chunks))

    def test_non_post_and_unknown_paths_return_404(self):
        for method, path in (
            ("GET", "/health"),
            ("PUT", "/v1/audio/transcriptions"),
            ("POST", "/unknown"),
        ):
            with self.subTest(method=method, path=path):
                status, body = self.request(method, path)
                self.assertEqual(status, 404)
                self.assertEqual(body, {"error": "not_found"})

    def test_bad_content_type_returns_415(self):
        with patch.object(self.module.subprocess, "run") as run:
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"not audio",
                content_type="text/plain",
            )
        self.assertEqual(status, 415)
        self.assertEqual(body, {"error": "unsupported_audio"})
        run.assert_not_called()

    def test_bridge_unavailable_returns_502(self):
        ffmpeg = SimpleNamespace(returncode=0, stdout=wav_bytes(b"\x00\x00"), stderr=b"")
        with patch.object(self.module.subprocess, "run", return_value=ffmpeg), patch.object(
            self.module.AsyncClient, "from_uri", return_value=UnavailableWyoming()
        ):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"encoded audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 502)
        self.assertEqual(body, {"error": "wyoming_failed"})

    def test_timeout_returns_504(self):
        ffmpeg = SimpleNamespace(returncode=0, stdout=wav_bytes(b"\x00\x00"), stderr=b"")
        with patch.object(self.module, "TRANSCRIPTION_TIMEOUT", 0.01), patch.object(
            self.module.subprocess, "run", return_value=ffmpeg
        ), patch.object(
            self.module.AsyncClient, "from_uri", return_value=TimeoutWyoming()
        ):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"encoded audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 504)
        self.assertEqual(body, {"error": "transcription_timeout"})

    def test_wyoming_asr_failure_returns_503(self):
        ffmpeg = SimpleNamespace(returncode=0, stdout=wav_bytes(b"\x00\x00"), stderr=b"")
        with patch.object(self.module.subprocess, "run", return_value=ffmpeg), patch.object(
            self.module.AsyncClient, "from_uri", return_value=FailingWyoming()
        ):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"encoded audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 503)
        self.assertEqual(body, {"error": "wyoming_unavailable"})

    def test_empty_transcript_returns_422(self):
        ffmpeg = SimpleNamespace(returncode=0, stdout=wav_bytes(b"\x00\x00"), stderr=b"")
        with patch.object(self.module.subprocess, "run", return_value=ffmpeg), patch.object(
            self.module.AsyncClient, "from_uri", return_value=WyomingFake("")
        ):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"encoded audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 422)
        self.assertEqual(body, {"error": "empty_transcript"})

    def test_empty_and_oversized_audio_are_rejected(self):
        status, body = self.request(
            "POST", "/v1/audio/transcriptions", body=b"", content_type="audio/wav"
        )
        self.assertEqual(status, 400)
        self.assertEqual(body, {"error": "empty_audio"})

        status, body = self.request(
            "POST",
            "/v1/audio/transcriptions",
            content_length=15 * 1024 * 1024 + 1,
            content_type="audio/wav",
        )
        self.assertEqual(status, 413)
        self.assertEqual(body, {"error": "too_large"})


if __name__ == "__main__":
    unittest.main()

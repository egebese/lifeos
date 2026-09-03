import asyncio
import http.client
import importlib.util
import io
import json
import os
import socket
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


class FakeClock:
    def __init__(self):
        self.value = 10.0

    def monotonic(self):
        return self.value


class TricklingReader:
    def __init__(self, clock):
        self.clock = clock
        self.sizes = []

    def read1(self, size):
        self.sizes.append(size)
        self.clock.value += 0.006
        return b"x"


class FakeBodyConnection:
    def __init__(self):
        self.timeouts = []

    def settimeout(self, value):
        self.timeouts.append(value)


class ServerTests(unittest.TestCase):
    def setUp(self):
        if not SERVER_PATH.is_file():
            self.fail("server.py is missing")

        self.env_patch = patch.dict(os.environ, {"ASR_HTTP_TOKEN": "test-token"})
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
        for method, path in (
            ("GET", "/health"),
            ("POST", "/v1/audio/transcriptions"),
        ):
            for token in (None, "wrong"):
                with self.subTest(method=method, path=path, token=token):
                    status, body = self.request(method, path, token=token)
                    self.assertEqual(status, 401)
                    self.assertEqual(body, {"error": "unauthorized"})

    def test_get_health_returns_ok_and_unavailable_is_503(self):
        create_connection = Mock(return_value=DummySocket())
        fake_socket_module = SimpleNamespace(create_connection=create_connection)
        with patch.object(self.module, "socket", fake_socket_module):
            status, body = self.request("GET", "/health")
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
            status, body = self.request("GET", "/health")
        self.assertEqual(status, 503)
        self.assertEqual(body, {"error": "wyoming_unavailable"})

    def test_handler_setup_sets_fixed_header_timeout(self):
        connection = Mock()
        handler = object.__new__(self.module.ASRHandler)
        handler.connection = connection
        with patch.object(self.module.BaseHTTPRequestHandler, "setup"):
            self.module.ASRHandler.setup(handler)
        connection.settimeout.assert_called_once_with(self.module.HTTP_HEADER_TIMEOUT)

    def test_handler_watchdog_closes_connection_and_is_cancelled(self):
        connection = Mock()
        timer = Mock()
        handler = object.__new__(self.module.ASRHandler)
        handler.connection = connection
        with patch.object(self.module.threading, "Timer", return_value=timer) as timer_factory, patch.object(
            self.module.BaseHTTPRequestHandler, "setup"
        ), patch.object(self.module.BaseHTTPRequestHandler, "finish"):
            self.module.ASRHandler.setup(handler)

            timer_factory.assert_called_once_with(
                self.module.TRANSCRIPTION_TIMEOUT, unittest.mock.ANY
            )
            timer.start.assert_called_once_with()
            timer_factory.call_args.args[1]()
            self.module.ASRHandler.finish(handler)

        connection.shutdown.assert_called_once_with(self.module.socket.SHUT_RDWR)
        connection.close.assert_called_once_with()
        timer.cancel.assert_called_once_with()

    def test_transcription_uses_setup_deadline_after_header_parsing(self):
        clock = FakeClock()
        connection = Mock()
        handler = object.__new__(self.module.ASRHandler)
        handler.connection = connection
        handler.headers = {"Content-Type": "audio/wav"}
        handler._send_json = Mock()
        with patch.object(self.module, "TRANSCRIPTION_TIMEOUT", 1.0), patch.object(
            self.module, "time", SimpleNamespace(monotonic=clock.monotonic)
        ), patch.object(self.module.BaseHTTPRequestHandler, "setup"), patch.object(
            self.module, "_convert_audio", return_value=b"wav"
        ) as convert_audio, patch.object(
            self.module, "_transcribe_with_timeout", return_value="text"
        ) as transcribe:
            self.module.ASRHandler.setup(handler)
            setup_deadline = handler._deadline
            clock.value += 1.1
            handler._audio_body = Mock(return_value=b"encoded")
            self.module.ASRHandler._transcription(handler)

        self.assertEqual(setup_deadline, 11.0)
        handler._send_json.assert_called_once_with(
            504, {"error": "transcription_timeout"}
        )
        convert_audio.assert_not_called()
        transcribe.assert_not_called()

    def test_post_transcription_verifies_exact_raw_pcm_event_flow(self):
        pcm = bytes(range(256)) * 16
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
        self.assertIn("-c:a", command)
        self.assertIn("pcm_s16le", command)
        self.assertIn("-t", command)
        self.assertIn("60", command)
        self.assertIn("-fs", command)
        self.assertIn(str(self.module.MAX_DECODED_WAV_BYTES), command)
        self.assertEqual(command[-3:], ["-f", "wav", "pipe:1"])

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
        chunks = [AudioChunk.from_event(event) for event in fake.events[2:4]]
        self.assertEqual([chunk.samples for chunk in chunks], [1024, 1024])
        self.assertEqual([len(chunk.audio) for chunk in chunks], [2048, 2048])
        self.assertEqual(b"".join(chunk.audio for chunk in chunks), pcm)
        self.assertTrue(all(b"RIFF" not in chunk.audio for chunk in chunks))

    def test_non_post_and_unknown_paths_return_404(self):
        for method, path in (
            ("POST", "/health"),
            ("GET", "/v1/audio/transcriptions"),
            ("PUT", "/v1/audio/transcriptions"),
            ("TRACE", "/health"),
            ("CONNECT", "/health"),
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

    def test_ffmpeg_undecodable_input_returns_415(self):
        ffmpeg = SimpleNamespace(returncode=1, stdout=b"", stderr=b"decode failed")
        with patch.object(self.module.subprocess, "run", return_value=ffmpeg):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"not audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 415)
        self.assertEqual(body, {"error": "unsupported_audio"})

    def test_missing_ffmpeg_returns_502(self):
        with patch.object(self.module.subprocess, "run", side_effect=OSError("missing")):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"not audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 502)
        self.assertEqual(body, {"error": "wyoming_failed"})

    def test_decoded_output_over_limit_returns_415(self):
        ffmpeg = SimpleNamespace(
            returncode=0,
            stdout=b"x" * (self.module.MAX_DECODED_WAV_BYTES + 1),
            stderr=b"",
        )
        with patch.object(self.module.subprocess, "run", return_value=ffmpeg):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"encoded audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 415)
        self.assertEqual(body, {"error": "unsupported_audio"})

    def test_saturated_transcription_returns_safe_503(self):
        with patch.object(self.module, "TRANSCRIPTION_SLOTS") as slots, patch.object(
            self.module.subprocess, "run"
        ) as run:
            slots.acquire.return_value = False
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"encoded audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 503)
        self.assertEqual(body, {"error": "busy"})
        slots.acquire.assert_called_once_with(blocking=False)
        run.assert_not_called()

    def test_bridge_unavailable_returns_503(self):
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
        self.assertEqual(status, 503)
        self.assertEqual(body, {"error": "wyoming_unavailable"})

    def test_timeout_returns_504(self):
        ffmpeg = SimpleNamespace(returncode=0, stdout=wav_bytes(b"\x00\x00"), stderr=b"")
        with patch.object(self.module, "TRANSCRIPTION_TIMEOUT", 0.01), patch.object(
            self.module.threading, "Timer", return_value=Mock()
        ), patch.object(self.module.subprocess, "run", return_value=ffmpeg), patch.object(
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

    def test_ffmpeg_and_wyoming_share_one_deadline(self):
        clock = FakeClock()
        fake = WyomingFake()
        ffmpeg = SimpleNamespace(returncode=0, stdout=wav_bytes(b"\x00\x00"), stderr=b"")

        def run_ffmpeg(*args, **kwargs):
            clock.value += 0.02
            return ffmpeg

        with patch.object(self.module, "TRANSCRIPTION_TIMEOUT", 0.01), patch.object(
            self.module.threading, "Timer", return_value=Mock()
        ), patch.object(
            self.module, "time", SimpleNamespace(monotonic=clock.monotonic), create=True
        ), patch.object(
            self.module.subprocess, "run", side_effect=run_ffmpeg
        ), patch.object(self.module.AsyncClient, "from_uri", return_value=fake):
            status, body = self.request(
                "POST",
                "/v1/audio/transcriptions",
                body=b"encoded audio",
                content_type="audio/wav",
            )
        self.assertEqual(status, 504)
        self.assertEqual(body, {"error": "transcription_timeout"})

    def test_trickled_body_recalculates_bounded_read_deadline(self):
        clock = FakeClock()
        reader = TricklingReader(clock)
        connection = FakeBodyConnection()
        request = SimpleNamespace(
            headers={"Content-Length": "4"},
            connection=connection,
            rfile=reader,
            _send_json=Mock(),
        )
        deadline = clock.monotonic() + 0.01
        with patch.object(
            self.module, "time", SimpleNamespace(monotonic=clock.monotonic)
        ):
            with self.assertRaises(self.module.TranscriptionTimeout):
                self.module.ASRHandler._audio_body(request, deadline)
        self.assertEqual(reader.sizes, [4, 3])
        self.assertEqual(len(connection.timeouts), 2)
        self.assertLess(connection.timeouts[1], connection.timeouts[0])

    def test_malformed_content_length_returns_400(self):
        status, body = self.request(
            "POST",
            "/v1/audio/transcriptions",
            body=b"",
            content_type="audio/wav",
            content_length="not-a-number",
        )
        self.assertEqual(status, 400)
        self.assertEqual(body, {"error": "bad_request"})

    def stalled_request(self, content_length):
        connection = socket.create_connection(
            ("127.0.0.1", self.httpd.server_port), timeout=2
        )
        connection.sendall(
            (
                "POST /v1/audio/transcriptions HTTP/1.1\r\n"
                "Host: 127.0.0.1\r\n"
                "X-ASR-Token: test-token\r\n"
                "Content-Type: audio/wav\r\n"
                f"Content-Length: {content_length}\r\n"
                "Connection: close\r\n\r\n"
            ).encode()
        )
        try:
            response = connection.makefile("rb")
            status = int(response.readline().split()[1])
            headers = {}
            for line in response:
                if line in (b"\r\n", b"\n"):
                    break
                name, value = line.decode().split(":", 1)
                headers[name.lower()] = value.strip()
            body = json.loads(response.read(int(headers["content-length"])))
            response.close()
            return status, body
        finally:
            connection.close()

    def test_stalled_audio_body_hits_shared_deadline(self):
        with patch.object(self.module, "TRANSCRIPTION_TIMEOUT", 0.01), patch.object(
            self.module.threading, "Timer", return_value=Mock()
        ), patch.object(self.module.subprocess, "run") as run:
            status, body = self.stalled_request(10)
        self.assertEqual(status, 504)
        self.assertEqual(body, {"error": "transcription_timeout"})
        run.assert_not_called()

    def test_wyoming_asr_failure_returns_502(self):
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
        self.assertEqual(status, 502)
        self.assertEqual(body, {"error": "wyoming_failed"})

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

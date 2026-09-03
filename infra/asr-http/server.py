import asyncio
import hmac
import io
import json
import os
import socket
import subprocess
import threading
import time
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from wyoming.asr import Transcribe, Transcript
from wyoming.audio import AudioStart, AudioStop, wav_to_chunks
from wyoming.client import AsyncClient
from wyoming.error import Error


BIND_HOST = "0.0.0.0"
BIND_PORT = 10202
WYOMING_HOST = "127.0.0.1"
WYOMING_PORT = 10300
WYOMING_URI = f"tcp://{WYOMING_HOST}:{WYOMING_PORT}"
MAX_UPLOAD = 15 * 1024 * 1024
HEALTH_TIMEOUT = 2.0
TRANSCRIPTION_TIMEOUT = 45.0
BODY_READ_CHUNK_BYTES = 64 * 1024
MAX_AUDIO_SECONDS = 60
MAX_DECODED_WAV_BYTES = 2_000_000
TRANSCRIPTION_SLOTS = threading.BoundedSemaphore(2)
HTTP_HEADER_TIMEOUT = 10.0


class UnsupportedAudio(Exception):
    pass


class ProcessFailure(Exception):
    pass


class BridgeUnavailable(Exception):
    pass


class AsrFailure(Exception):
    pass


class TranscriptionTimeout(Exception):
    pass


def _json_bytes(value):
    return json.dumps(value, separators=(",", ":")).encode("utf-8")


def _input_format(content_type):
    mime = content_type.split(";", 1)[0].strip().lower()
    return {
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/mpeg": "mp3",
        "audio/mp4": "mp4",
        "audio/x-m4a": "mp4",
        "audio/aac": "aac",
        "audio/flac": "flac",
    }.get(mime)


def _remaining(deadline):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TranscriptionTimeout
    return remaining


def _convert_audio(body, content_type, deadline):
    command = ["ffmpeg", "-nostdin", "-loglevel", "error"]
    input_format = _input_format(content_type)
    if input_format:
        command.extend(("-f", input_format))
    command.extend(
        (
            "-i",
            "pipe:0",
            "-t",
            str(MAX_AUDIO_SECONDS),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            "-fs",
            str(MAX_DECODED_WAV_BYTES),
            "-f",
            "wav",
            "pipe:1",
        )
    )
    try:
        result = subprocess.run(
            command,
            input=body,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=_remaining(deadline),
        )
    except subprocess.TimeoutExpired as exc:
        raise TranscriptionTimeout from exc
    except OSError as exc:
        raise ProcessFailure from exc
    _remaining(deadline)
    if result.returncode != 0 or not result.stdout:
        raise UnsupportedAudio
    if len(result.stdout) > MAX_DECODED_WAV_BYTES:
        raise UnsupportedAudio
    return result.stdout


async def _transcribe(wav_data):
    connected = False
    try:
        client = AsyncClient.from_uri(WYOMING_URI)
        try:
            async with client:
                connected = True
                await client.write_event(Transcribe(language="en").event())
                with wave.open(io.BytesIO(wav_data), "rb") as wav_file:
                    await client.write_event(
                        AudioStart(rate=16000, width=2, channels=1).event()
                    )
                    for chunk in wav_to_chunks(wav_file, samples_per_chunk=1024):
                        await client.write_event(chunk.event())
                    await client.write_event(AudioStop().event())

                while True:
                    event = await client.read_event()
                    if event is None:
                        raise AsrFailure
                    if Transcript.is_type(event.type):
                        return Transcript.from_event(event).text.strip()
                    if Error.is_type(event.type):
                        raise AsrFailure
        except (BridgeUnavailable, AsrFailure):
            raise
        except Exception as exc:
            if connected:
                raise AsrFailure from exc
            raise BridgeUnavailable from exc
    except (BridgeUnavailable, AsrFailure):
        raise
    except Exception as exc:
        raise BridgeUnavailable from exc


def _transcribe_with_timeout(wav_data, deadline):
    try:
        return asyncio.run(
            asyncio.wait_for(_transcribe(wav_data), timeout=_remaining(deadline))
        )
    except asyncio.TimeoutError as exc:
        raise TranscriptionTimeout from exc


class ASRHandler(BaseHTTPRequestHandler):
    def setup(self):
        self._deadline = time.monotonic() + TRANSCRIPTION_TIMEOUT
        self._watchdog = threading.Timer(
            TRANSCRIPTION_TIMEOUT, self._close_connection
        )
        self._watchdog.daemon = True
        self._watchdog.start()
        try:
            super().setup()
            self.connection.settimeout(
                min(HTTP_HEADER_TIMEOUT, _remaining(self._deadline))
            )
        except Exception:
            self._watchdog.cancel()
            raise

    def _close_connection(self):
        try:
            self.connection.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        try:
            self.connection.close()
        except OSError:
            pass

    def finish(self):
        watchdog = getattr(self, "_watchdog", None)
        if watchdog is not None:
            watchdog.cancel()
        super().finish()

    def log_message(self, format, *args):
        return

    def _send_json(self, status, value):
        body = _json_bytes(value)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        try:
            self.wfile.write(body)
        except OSError:
            pass
        self.close_connection = True

    def _not_found(self):
        self._send_json(404, {"error": "not_found"})

    def _authorized(self):
        expected = os.environ.get("ASR_HTTP_TOKEN", "")
        provided = self.headers.get("X-ASR-Token", "")
        return bool(expected) and hmac.compare_digest(provided, expected)

    def _health(self):
        try:
            connection = socket.create_connection(
                (WYOMING_HOST, WYOMING_PORT), timeout=HEALTH_TIMEOUT
            )
            connection.close()
        except OSError:
            self._send_json(503, {"error": "wyoming_unavailable"})
            return
        self._send_json(200, {"ok": True})

    def _audio_body(self, deadline):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except (TypeError, ValueError):
            self._send_json(400, {"error": "bad_request"})
            return None
        if length <= 0:
            self._send_json(400, {"error": "empty_audio"})
            return None
        if length > MAX_UPLOAD:
            self._send_json(413, {"error": "too_large"})
            return None
        body = bytearray()
        while len(body) < length:
            try:
                self.connection.settimeout(_remaining(deadline))
                chunk = self.rfile.read1(
                    min(BODY_READ_CHUNK_BYTES, length - len(body))
                )
            except (OSError, TimeoutError) as exc:
                raise TranscriptionTimeout from exc
            if not chunk:
                self._send_json(400, {"error": "empty_audio"})
                return None
            body.extend(chunk)
        _remaining(deadline)
        return bytes(body)

    def _transcription(self):
        deadline = self._deadline
        try:
            _remaining(deadline)
        except TranscriptionTimeout:
            self._send_json(504, {"error": "transcription_timeout"})
            return
        content_type = self.headers.get("Content-Type", "")
        if not content_type.lower().startswith("audio/"):
            self._send_json(415, {"error": "unsupported_audio"})
            return
        if not TRANSCRIPTION_SLOTS.acquire(blocking=False):
            self._send_json(503, {"error": "busy"})
            return
        try:
            body = self._audio_body(deadline)
            if body is None:
                return
            wav_data = _convert_audio(body, content_type, deadline)
            text = _transcribe_with_timeout(wav_data, deadline)
        except UnsupportedAudio:
            self._send_json(415, {"error": "unsupported_audio"})
            return
        except ProcessFailure:
            self._send_json(502, {"error": "wyoming_failed"})
            return
        except BridgeUnavailable:
            self._send_json(503, {"error": "wyoming_unavailable"})
            return
        except TranscriptionTimeout:
            self._send_json(504, {"error": "transcription_timeout"})
            return
        except AsrFailure:
            self._send_json(502, {"error": "wyoming_failed"})
            return
        except Exception:
            self._send_json(502, {"error": "wyoming_failed"})
            return
        finally:
            TRANSCRIPTION_SLOTS.release()
        if not text:
            self._send_json(422, {"error": "empty_transcript"})
            return
        self._send_json(200, {"text": text})

    def do_POST(self):
        if self.path != "/v1/audio/transcriptions":
            self._not_found()
            return
        if not self._authorized():
            self._send_json(401, {"error": "unauthorized"})
            return
        self._transcription()

    def do_GET(self):
        if self.path != "/health":
            self._not_found()
            return
        if not self._authorized():
            self._send_json(401, {"error": "unauthorized"})
            return
        self._health()

    def do_HEAD(self):
        self._not_found()

    def do_OPTIONS(self):
        self._not_found()

    def do_PATCH(self):
        self._not_found()

    def do_PUT(self):
        self._not_found()

    def do_DELETE(self):
        self._not_found()

    def send_error(self, code, message=None, explain=None):
        if code == 501:
            self._not_found()
            return
        super().send_error(code, message, explain)


def main():
    httpd = ThreadingHTTPServer((BIND_HOST, BIND_PORT), ASRHandler)
    httpd.daemon_threads = True
    httpd.serve_forever()


if __name__ == "__main__":
    main()

# Portable local-AI deployment

This package connects LifeOS to services you host yourself. It installs LifeOS
and a small HTTP-to-Wyoming speech-to-text bridge; it does not download model
weights, install GPU runtimes, or replace an existing LLM/STT/TTS service.

## 1. Install LifeOS

Requirements on the LifeOS host:

- Linux with GNU coreutils (the installer uses realpath and stat)
- Docker Engine with the Compose plugin
- Bash, curl, openssl, ffmpeg, and a systemd user manager
- A Python interpreter with the Wyoming client package
- Network access to your local LLM and model services

From the repository:

    cp deploy/config.env.example "$HOME/.config/lifeos.env"
    chmod 600 "$HOME/.config/lifeos.env"
    "$EDITOR" "$HOME/.config/lifeos.env"
    ./deploy/install.sh "$HOME/.config/lifeos.env"

The config must be outside the checkout. Required values are intentionally
blank in the example. The installer rejects an insecure config, validates
local paths and dependencies, renders a user service, and starts the Compose
stack. It never prints the password, session secret, or ASR token.

For a safe preview:

    ./deploy/install.sh --dry-run "$HOME/.config/lifeos.env"

The installer uses LIFEOS_PROJECT_NAME and LIFEOS_VOLUME_PREFIX to keep the
Compose stack and its Postgres/uploads volumes stable when the checkout moves.
Keep both values unchanged after the first install. Never use docker compose
down -v for maintenance.

## 2. Host llama.cpp text and vision

Build or install llama.cpp, then run a compatible text GGUF with its matching
multimodal projection file:

    ./build/bin/llama-server \
      -m /models/your-model.gguf \
      --mmproj /models/mmproj-your-model.gguf \
      --host 0.0.0.0 \
      --port 8081 \
      --alias lifeos-vision \
      --jinja

Use GPU offload when available (for example, -ngl 999) and reduce context,
batch, or GPU layers if the model does not fit. Keep the server on a trusted
LAN or behind an authenticated TLS reverse proxy; the LifeOS client does not
add an LLM API key.

Check the OpenAI-compatible API:

    curl -fsS http://LLM_HOST:8081/v1/models

Set LLAMA_CPP_BASE_URL to the server's /v1 URL and LLAMA_CPP_MODEL to the
exact data[].id returned by that command. The configured model must be
reported as multimodal by llama.cpp. The --mmproj file is required for
food-photo vision; a text-only server is not a valid vision provider.

See the llama.cpp server guide:
https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md

See the llama.cpp multimodal guide:
https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md

If LifeOS runs in Docker and llama.cpp runs on the same host, the example
config uses host.docker.internal; the Compose file maps that name to the host
gateway on Linux. If the LLM is on another machine, use its LAN address.

## 3. Host English STT

LifeOS sends browser audio to the installed bridge. The bridge converts
WebM/OGG/MP4/WAV with ffmpeg and forwards English PCM frames over Wyoming to
the WYOMING_URI backend.

For NeMo/Parakeet, wyoming-onnx-asr provides a Wyoming server. Its upstream
local-install flow is:

    git clone https://github.com/tboby/wyoming-onnx-asr.git
    cd wyoming-onnx-asr
    uv sync
    uv run --uri tcp://0.0.0.0:10300

Choose the English model and CPU/GPU flags supported by the version you
install. Docker is also documented upstream. Keep the Wyoming port private.

Set these values in the LifeOS config:

    ASR_HTTP_HOST=0.0.0.0
    ASR_HTTP_PORT=10202
    ASR_HTTP_URL=http://host.docker.internal:10202
    WYOMING_URI=tcp://127.0.0.1:10300
    ASR_PYTHON=$HOME/wyoming-onnx-asr/.venv/bin/python
    FFMPEG_BIN=/usr/bin/ffmpeg
    ASR_HTTP_TOKEN=generate-a-long-random-value

The installer writes the token-protected bridge as
lifeos-asr-http.service in the user's systemd directory and restarts that
bridge when its configuration changes. It does not restart the Wyoming server.
If the Wyoming server is on another host, set
WYOMING_URI=tcp://that-host:10300 and restrict the firewall accordingly.

Verify after installation:

    systemctl --user status lifeos-asr-http.service
    curl -fsS -H "X-ASR-Token: $ASR_HTTP_TOKEN" \
      http://127.0.0.1:10202/health

## 4. Host local TTS

TTS is not called by the current LifeOS UI. You can still run a local TTS
provider for Home Assistant or a future spoken-output client and record its
URL in TTS_BASE_URL.

For a Wyoming Piper server, the upstream project documents:

    git clone https://github.com/OHF-Voice/wyoming-piper.git
    cd wyoming-piper
    script/setup
    script/run --voice en_US-lessac-medium \
      --uri tcp://0.0.0.0:10200 --data-dir /data --download-dir /data

The project is documented here:
https://github.com/OHF-Voice/wyoming-piper

Use a provider's documented HTTP endpoint only if your client needs HTTP;
Wyoming TCP and HTTP are different protocols. Keep TTS on the private network.
Setting TTS_BASE_URL does not add speech output to current LifeOS.

## 5. Configuration and updates

At minimum, edit these fields:

    LIFEOS_DIR=$HOME/lifeos
    LIFEOS_PROJECT_NAME=lifeos
    LIFEOS_VOLUME_PREFIX=lifeos
    NEXT_PUBLIC_APP_URL=http://YOUR_LIFEOS_HOST:3000
    LLAMA_CPP_BASE_URL=http://YOUR_LLM_HOST:8081/v1
    LLAMA_CPP_MODEL=THE_EXACT_ID_FROM_v1_MODELS
    ASR_HTTP_URL=http://YOUR_LIFEOS_HOST:10202
    ASR_HTTP_TOKEN=THE_SAME_TOKEN_USED_BY_THE_BRIDGE
    TTS_BASE_URL=http://YOUR_TTS_HOST:10200
    ASR_HTTP_HOST=0.0.0.0
    ASR_HTTP_PORT=10202
    WYOMING_URI=tcp://127.0.0.1:10300
    ASR_PYTHON=$HOME/wyoming-onnx-asr/.venv/bin/python
    FFMPEG_BIN=/usr/bin/ffmpeg
    ADMIN_EMAIL=you@example.com
    ADMIN_PASSWORD=choose-a-unique-first-login-password
    SESSION_SECRET=openssl-rand-base64-output
    SESSION_COOKIE_SECURE=false

After updating the checkout:

    git pull --ff-only
    ./deploy/update.sh "$HOME/.config/lifeos.env"

The update path preserves the private config, named volumes, uploads, and
systemd unit. It stages a clean source tree and keeps the previous tree as a
hidden recoverable backup. It does not delete data or run down -v. If you move
the checkout, keep LIFEOS_PROJECT_NAME and LIFEOS_VOLUME_PREFIX unchanged so
Compose attaches the same stack and volumes.

For HTTPS behind a reverse proxy, set NEXT_PUBLIC_APP_URL to the HTTPS origin
and SESSION_COOKIE_SECURE=true. For plain HTTP on a trusted LAN, leave it
false.

## Troubleshooting

    docker compose --env-file "$HOME/.config/lifeos.env" ps
    docker compose --env-file "$HOME/.config/lifeos.env" logs -f web
    systemctl --user status lifeos-asr-http.service
    journalctl --user -u lifeos-asr-http.service -n 100 --no-pager
    curl -fsS http://YOUR_LLM_HOST:8081/v1/models

A missing multimodal capability means the model server was started without the
matching projection/configuration. A 401 from the bridge means the
ASR_HTTP_TOKEN value in the LifeOS config does not match the value loaded by
the user service.

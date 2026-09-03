# Portable Local AI Deployment Design

## Goal

Package the local-AI LifeOS deployment so another self-hosting user can clone the repository, edit one private configuration file, run one installer, and connect LifeOS to their own llama.cpp vision, STT, and TTS services without changing application source.

## User experience

1. Copy `deploy/config.env.example` to a private config file.
2. Set the user's URLs, model id, local paths, credentials, and service ports.
3. Run `./deploy/install.sh /path/to/config.env`.
4. Update source and rerun `./deploy/update.sh /path/to/config.env`; the config, database, uploads, and user service remain intact.

The config is a trusted shell-style environment file. It is mode 600 and is never copied into the repository or printed by the scripts.

## Architecture

- LifeOS remains a Docker Compose application with named Postgres and uploads volumes. Compose uses explicit `LIFEOS_VOLUME_PREFIX` names (default `lifeos`) so moving the checkout does not silently create a new empty database or uploads volume. Existing deployments set the prefix matching their current Compose project name before migration.
- The application receives `LLAMA_CPP_BASE_URL`, `LLAMA_CPP_MODEL`, `ASR_HTTP_URL`, `ASR_HTTP_TOKEN`, and `TTS_BASE_URL` from the config file.
- The local AI client validates any configured exact model id by reading `/v1/models`; it requires the matching llama.cpp metadata to advertise `multimodal`. The original deployment's model path is no longer hard-coded as the only accepted value.
- The generated user systemd unit loads the private config with `EnvironmentFile=`, so the Python ASR bridge receives `ASR_HTTP_HOST`, `ASR_HTTP_PORT`, and `WYOMING_URI` from the same config file. It continues to forward English audio to an existing Wyoming-compatible STT server; it does not download or own a model.
- TTS is a configured provider endpoint for future spoken-output clients. Current LifeOS routes do not call TTS, so the package documents hosting and configuration without claiming an unused integration.
- The installer renders a user-level systemd service from a template using configured absolute paths, enables it, and starts only that bridge. Existing model services are dependencies and are not stopped, reconfigured, or replaced.

## Config contract

Required application values:

| Variable | Meaning |
| --- | --- |
| `LIFEOS_DIR` | Install directory |
| `LIFEOS_VOLUME_PREFIX` | Stable Compose volume prefix; keep it unchanged after first install |
| `NEXT_PUBLIC_APP_URL` | Browser-visible LifeOS URL |
| `LLAMA_CPP_BASE_URL` | OpenAI-compatible llama.cpp `/v1` base URL |
| `LLAMA_CPP_MODEL` | Exact id returned by llama.cpp `/v1/models` |
| `ASR_HTTP_URL` | LifeOS ASR bridge URL |
| `ASR_HTTP_TOKEN` | Shared bridge secret |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` | First-boot/auth values |
| `SESSION_COOKIE_SECURE` | `false` for plain HTTP LAN, `true` behind HTTPS |

Required bridge values:

| Variable | Meaning |
| --- | --- |
| `ASR_HTTP_HOST`, `ASR_HTTP_PORT` | Bridge bind address and port |
| `WYOMING_URI` | Existing Wyoming STT endpoint |
| `ASR_PYTHON` | Python interpreter containing the Wyoming client package |
| `FFMPEG_BIN` | ffmpeg executable |

Optional provider value:

| Variable | Meaning |
| --- | --- |
| `TTS_BASE_URL` | User's TTS endpoint; informational until LifeOS adds spoken output |

No public default contains a personal IP address, username, home path, model path, or credential. Required values fail validation when empty. The main Compose file and runtime client use generic localhost/empty defaults only; deployment-specific values live in the private config.

## Installer and update behavior

`deploy/install.sh`:

- reads and validates the supplied config without printing secret values;
- checks Docker, ffmpeg, the configured Wyoming Python interpreter, and systemd user support in normal mode;
- copies source into `LIFEOS_DIR` when the install directory differs from the checkout, excluding `.env`, the private config, dependency/build directories, and runtime uploads;
- renders `lifeos-asr-http.service` under the user's systemd directory with configured paths and an explicit `EnvironmentFile=`;
- enables linger when possible, reloads the user manager, and starts the bridge;
- runs `docker compose --env-file CONFIG up -d --build`;
- performs configuration/dependency preflight and Compose validation before service restart, then endpoint health checks;
- never runs `docker compose down -v`, removes named volumes, or overwrites an existing private config.

`deploy/update.sh` calls the same idempotent install path after source has been updated. Updates preserve the external config and named volumes; changing an endpoint requires editing only that config and rerunning the script.

A `--dry-run` mode validates the config and local file paths and prints planned non-secret actions without copying files, invoking Docker, or invoking systemd. Normal mode additionally checks Docker/systemd availability.

If an image build or preflight fails, the installer exits before the Compose restart and leaves the private config and persistent volumes unchanged. A successfully recreated container is not rolled back automatically; operators can rerun the previous source with the same config if needed.

## Hosting guide

The package documents four independent services:

1. llama.cpp text/vision: run `llama-server` with the text GGUF and matching `--mmproj`, bind the chosen port, and set the returned model id in `LLAMA_CPP_MODEL`.
2. Vision: verify `/v1/models` includes `multimodal`; without the mmproj the text endpoint is not a valid LifeOS vision provider.
3. STT: run any Wyoming-compatible English server (for example NeMo/Parakeet through `wyoming-onnx-asr`), keep it on a private interface, and point `WYOMING_URI` at its TCP endpoint. The installer supplies the HTTP bridge.
4. TTS: run a local provider such as a Wyoming Piper service or another local HTTP service, bind it to a private interface, and record its URL in `TTS_BASE_URL`. The guide explicitly notes that current LifeOS has no speech-output route.

The guide includes health checks, firewall boundaries, token handling, CPU/GPU placement guidance, and update instructions. It avoids installing model runtimes or downloading model weights because those are hardware/provider-specific.

## Acceptance checks

- A copied config with empty required values fails before any state-changing command.
- `--dry-run` succeeds with a complete config and does not invoke Docker/systemd.
- A temporary install target receives source and a rendered unit while preserving a pre-existing private config.
- Compose volume names remain stable when the install directory changes as long as `LIFEOS_VOLUME_PREFIX` is unchanged.
- Endpoint/model paths are fully driven by config; no personal deployment values remain in runtime defaults.
- LLM model validation accepts a non-default exact id when its metadata is multimodal and rejects missing/mismatched capability.
- ASR bridge tests cover configured host/port/Wyoming URI and preserve existing auth/error behavior.
- The installer/update scripts pass shell syntax checks and a dry-run test.
- Existing LifeOS, ASR, search, vision, typecheck, and production build checks remain green.

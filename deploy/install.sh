#!/usr/bin/env bash
set -Eeuo pipefail

dry_run=false
if [[ ${1:-} == --dry-run ]]; then dry_run=true; shift; fi
[[ $# == 1 ]] || { echo "usage: $0 [--dry-run] CONFIG_FILE" >&2; exit 2; }

source_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
config_file=$(realpath "$1")
[[ -f $config_file ]] || { echo "config file not found" >&2; exit 1; }
case "$config_file" in
  "$source_dir"|"$source_dir"/*) echo "config file must be outside the source tree" >&2; exit 1 ;;
esac

# The config is explicitly a trusted shell-style file; never print its values.
set -a
# shellcheck disable=SC1090
source "$config_file"
set +a

required=(LIFEOS_DIR LIFEOS_VOLUME_PREFIX NEXT_PUBLIC_APP_URL LLAMA_CPP_BASE_URL
  LLAMA_CPP_MODEL ASR_HTTP_URL ASR_HTTP_TOKEN ADMIN_EMAIL ADMIN_PASSWORD SESSION_SECRET
  SESSION_COOKIE_SECURE ASR_HTTP_HOST ASR_HTTP_PORT WYOMING_URI ASR_PYTHON FFMPEG_BIN)
for name in "${required[@]}"; do
  [[ -n ${!name:-} ]] || { echo "missing required config value: $name" >&2; exit 1; }
done

USER_SYSTEMD_DIR=${USER_SYSTEMD_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user}
TTS_BASE_URL=${TTS_BASE_URL:-}

printf 'LifeOS install dir: %s\n' "$LIFEOS_DIR"
printf 'llama.cpp endpoint: %s\n' "$LLAMA_CPP_BASE_URL"
printf 'ASR endpoint: %s\n' "$ASR_HTTP_URL"
printf 'TTS endpoint: %s\n' "${TTS_BASE_URL:-<not configured>}"

if $dry_run; then
  printf 'dry-run: no files, Docker, or systemd changes\n'
  exit 0
fi

chmod 600 "$config_file"
if [[ ${TEST_MODE:-0} != 1 ]]; then
  command -v docker >/dev/null || { echo 'docker is required' >&2; exit 1; }
  [[ -x $ASR_PYTHON ]] || { echo "ASR_PYTHON is not executable" >&2; exit 1; }
  command -v "$FFMPEG_BIN" >/dev/null 2>&1 || { echo 'FFMPEG_BIN is required' >&2; exit 1; }
  command -v systemctl >/dev/null || { echo 'systemctl is required' >&2; exit 1; }
fi

mkdir -p "$LIFEOS_DIR" "$USER_SYSTEMD_DIR"
if [[ $LIFEOS_DIR != "$source_dir" ]]; then
  tar -C "$source_dir" \
    --exclude=.git --exclude=.env --exclude=node_modules --exclude=.next \
    --exclude=uploads --exclude='*/uploads' --exclude='config.env' \
    -cf - . | tar -C "$LIFEOS_DIR" -xf -
fi

service_template="$source_dir/deploy/systemd/lifeos-asr-http.service.in"
service_file="$USER_SYSTEMD_DIR/lifeos-asr-http.service"
rendered=$(<"$service_template")
for pair in \
  "CONFIG_FILE=$config_file" \
  "ASR_PYTHON=$ASR_PYTHON" \
  "LIFEOS_DIR=$LIFEOS_DIR"; do
  key=${pair%%=*}; value=${pair#*=}
  value=${value//\\/\\\\}; value=${value//&/\\&}; value=${value//|/\\|}
  rendered=${rendered//"@$key@"/$value}
done
printf '%s\n' "$rendered" >"$service_file"
chmod 600 "$service_file"

if [[ ${TEST_MODE:-0} != 1 ]]; then
  docker compose --env-file "$config_file" -f "$LIFEOS_DIR/docker-compose.yml" config --quiet
  loginctl enable-linger "$(id -un)" 2>/dev/null || true
  systemctl --user daemon-reload
  systemctl --user enable --now lifeos-asr-http.service
  docker compose --env-file "$config_file" -f "$LIFEOS_DIR/docker-compose.yml" up -d --build
else
  printf 'test-mode: skipped Docker and systemd\n'
fi

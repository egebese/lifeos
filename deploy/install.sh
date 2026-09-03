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
config_mode=$(stat -c '%a' "$config_file")
(( (8#$config_mode & 077) == 0 )) || {
  echo 'config file permissions must not allow group/other read, write, or execute' >&2
  exit 1
}

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

reject_unit_unsafe() {
  local name=$1 value=$2
  [[ ! $value =~ [[:space:][:cntrl:]] ]] || {
    echo "$name must not contain whitespace or control characters" >&2
    exit 1
  }
}
reject_unit_unsafe LIFEOS_DIR "$LIFEOS_DIR"
reject_unit_unsafe ASR_PYTHON "$ASR_PYTHON"
reject_unit_unsafe USER_SYSTEMD_DIR "$USER_SYSTEMD_DIR"
reject_unit_unsafe CONFIG_FILE "$config_file"

is_executable() {
  if [[ $1 == */* ]]; then [[ -x $1 ]]; else command -v "$1" >/dev/null 2>&1; fi
}
is_executable "$ASR_PYTHON" || { echo 'ASR_PYTHON must be an executable path or PATH command' >&2; exit 1; }
is_executable "$FFMPEG_BIN" || { echo 'FFMPEG_BIN must be an executable path or PATH command' >&2; exit 1; }

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
  command -v curl >/dev/null || { echo 'curl is required' >&2; exit 1; }
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

  health_check() {
    local name=$1 url=$2
    if ! curl --fail --silent --show-error --connect-timeout 5 --max-time 15 -o /dev/null "$url"; then
      echo "health check failed: $name" >&2
      exit 1
    fi
  }
  health_check login "${NEXT_PUBLIC_APP_URL%/}/login"
  health_check llama-models "${LLAMA_CPP_BASE_URL%/}/models"
  if ! curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
    -H "X-ASR-Token: $ASR_HTTP_TOKEN" -o /dev/null "${ASR_HTTP_URL%/}/health"; then
    echo 'health check failed: asr-health' >&2
    exit 1
  fi
else
  printf 'test-mode: skipped Docker and systemd\n'
fi

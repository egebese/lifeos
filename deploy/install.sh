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
[[ $config_mode == 600 ]] || {
  echo 'config file permissions must be exactly 600' >&2
  exit 1
}

# The config is explicitly a trusted shell-style file; never print its values.
# shellcheck disable=SC1090
source "$config_file"

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
  [[ $value != *\\* && $value != *\"* && $value != *\|* && $value != *\&* && $value != *%* &&
    ! $value =~ [[:space:][:cntrl:]] ]] || {
    echo "$name must not contain backslash, quote, pipe, ampersand, percent, whitespace, or control characters" >&2
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

redact_endpoint() {
  local value=$1 rest authority path
  [[ $value == *://* ]] || { printf '<configured>'; return; }
  rest=${value#*://}
  rest=${rest%%\#*}
  rest=${rest%%\?*}
  authority=${rest%%/*}
  path=
  [[ $rest == */* ]] && path=/${rest#*/}
  authority=${authority##*@}
  printf '%s://%s%s' "${value%%://*}" "$authority" "$path"
}

printf 'LifeOS install dir: %s\n' "$LIFEOS_DIR"
printf 'llama.cpp endpoint: %s\n' "$(redact_endpoint "$LLAMA_CPP_BASE_URL")"
printf 'ASR endpoint: %s\n' "$(redact_endpoint "$ASR_HTTP_URL")"
if [[ -n $TTS_BASE_URL ]]; then
  printf 'TTS endpoint: %s\n' "$(redact_endpoint "$TTS_BASE_URL")"
else
  printf 'TTS endpoint: <not configured>\n'
fi

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
  shopt -s nullglob dotglob
  target_entries=("$LIFEOS_DIR"/*)
  shopt -u nullglob dotglob
  if ((${#target_entries[@]})) && [[ ! -f "$LIFEOS_DIR/.lifeos-install" ]]; then
    echo 'existing non-empty target is not a LifeOS directory (missing .lifeos-install marker)' >&2
    exit 1
  fi
  [[ -f "$LIFEOS_DIR/.lifeos-install" ]] || touch "$LIFEOS_DIR/.lifeos-install"
  staging_dir=$(mktemp -d "$(dirname "$LIFEOS_DIR")/.lifeos-staging.XXXXXX")
  if ! tar -C "$source_dir" \
    --exclude=.git --exclude=.env --exclude=node_modules --exclude=.next \
    --exclude=uploads --exclude='*/uploads' --exclude='config.env' --exclude=.lifeos-install \
    -cf - . | tar -C "$staging_dir" -xf -; then
    rm -rf "$staging_dir"
    exit 1
  fi
  for preserved in .env config.env uploads; do
    [[ -e "$LIFEOS_DIR/$preserved" ]] && cp -a "$LIFEOS_DIR/$preserved" "$staging_dir/$preserved"
  done
  touch "$staging_dir/.lifeos-install"
  previous_dir="$(dirname "$LIFEOS_DIR")/.$(basename "$LIFEOS_DIR").previous.$(date +%Y%m%d%H%M%S)"
  if ! mv "$LIFEOS_DIR" "$previous_dir"; then
    rm -rf "$staging_dir"
    exit 1
  fi
  if ! mv "$staging_dir" "$LIFEOS_DIR"; then
    mv "$previous_dir" "$LIFEOS_DIR"
    exit 1
  fi
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
  systemctl --user enable lifeos-asr-http.service
  systemctl --user restart lifeos-asr-http.service
  docker compose --env-file "$config_file" -f "$LIFEOS_DIR/docker-compose.yml" up -d --build

  health_attempts=30
  health_delay=2
  health_check() {
    local name=$1 url=$2 attempt
    for ((attempt = 1; attempt <= health_attempts; attempt++)); do
      if curl --fail --silent --connect-timeout 5 --max-time 15 -o /dev/null "$url"; then
        return 0
      fi
      if ((attempt < health_attempts)); then sleep "$health_delay"; fi
    done
    echo "health check failed: $name" >&2
    exit 1
  }
  health_check_asr() {
    local attempt
    for ((attempt = 1; attempt <= health_attempts; attempt++)); do
      if printf 'X-ASR-Token: %s\n' "$ASR_HTTP_TOKEN" | \
        curl --fail --silent --connect-timeout 5 --max-time 15 \
          -H @- -o /dev/null "${ASR_HTTP_URL%/}/health"; then
        return 0
      fi
      if ((attempt < health_attempts)); then sleep "$health_delay"; fi
    done
    echo 'health check failed: asr-health' >&2
    exit 1
  }
  health_check_llama() {
    local attempt
    for ((attempt = 1; attempt <= health_attempts; attempt++)); do
      if docker compose --env-file "$config_file" -f "$LIFEOS_DIR/docker-compose.yml" \
        exec -T -e "LIFEOS_LLM_HEALTH_URL=${LLAMA_CPP_BASE_URL%/}/models" web node \
        -e 'fetch(process.env.LIFEOS_LLM_HEALTH_URL).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))'; then
        return 0
      fi
      if ((attempt < health_attempts)); then sleep "$health_delay"; fi
    done
    echo 'health check failed: llama-models' >&2
    exit 1
  }
  health_check login "${NEXT_PUBLIC_APP_URL%/}/login"
  health_check_llama
  health_check_asr
else
  printf 'test-mode: skipped Docker and systemd\n'
fi

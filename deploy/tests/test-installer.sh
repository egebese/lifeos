#!/usr/bin/env bash
set -u

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
installer="$repo_dir/deploy/install.sh"
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
pass() { printf 'ok - %s\n' "$1"; }

config="$tmp_dir/config.env"
target="$tmp_dir/install"
systemd_dir="$tmp_dir/systemd"
cat >"$config" <<EOF
LIFEOS_DIR=$target
LIFEOS_VOLUME_PREFIX=portable-lifeos
NEXT_PUBLIC_APP_URL=http://localhost:3000
LLAMA_CPP_BASE_URL=http://localhost:8081/v1
LLAMA_CPP_MODEL=portable-model
ASR_HTTP_URL=http://localhost:10202
ASR_HTTP_TOKEN=asr-secret-value
TTS_BASE_URL=http://localhost:5002
ADMIN_EMAIL=admin@example.test
ADMIN_PASSWORD=admin-secret-value
SESSION_SECRET=session-secret-value
SESSION_COOKIE_SECURE=false
ASR_HTTP_HOST=127.0.0.1
ASR_HTTP_PORT=10202
WYOMING_URI=tcp://127.0.0.1:10300
ASR_PYTHON=/usr/bin/python3
FFMPEG_BIN=/usr/bin/ffmpeg
USER_SYSTEMD_DIR=$systemd_dir
EOF
chmod 600 "$config"

output=$(TEST_MODE=1 bash "$installer" --dry-run "$config" 2>&1) || fail "complete dry-run failed: $output"
grep -Fq "$target" <<<"$output" || fail "dry-run omitted install directory"
grep -Fq 'http://localhost:8081/v1' <<<"$output" || fail "dry-run omitted LLM endpoint"
grep -Fq 'http://localhost:10202' <<<"$output" || fail "dry-run omitted ASR endpoint"
for secret in asr-secret-value admin-secret-value session-secret-value; do
  ! grep -Fq "$secret" <<<"$output" || fail "dry-run printed a secret"
done
pass "dry-run reports non-secret configuration"

missing="$tmp_dir/missing.env"
sed '/^SESSION_SECRET=/d' "$config" >"$missing"
log="$tmp_dir/commands.log"
mkdir -p "$tmp_dir/bin"
cat >"$tmp_dir/bin/docker" <<EOF
#!/usr/bin/env bash
printf 'docker\n' >>"$log"
EOF
cat >"$tmp_dir/bin/systemctl" <<EOF
#!/usr/bin/env bash
printf 'systemctl\n' >>"$log"
EOF
chmod +x "$tmp_dir/bin/docker" "$tmp_dir/bin/systemctl"
if PATH="$tmp_dir/bin:$PATH" TEST_MODE=1 bash "$installer" "$missing" >"$tmp_dir/missing.out" 2>&1; then
  fail "missing required value unexpectedly succeeded"
fi
[[ ! -e "$target" ]] || fail "missing config changed target state"
[[ ! -s "$log" ]] || fail "missing config invoked Docker/systemd"
pass "missing required value fails before state changes"

mkdir -p "$target"
printf 'keep this target config\n' >"$target/config.env"
TEST_MODE=1 bash "$installer" "$config" >/dev/null 2>&1 || fail "normal test-mode install failed"
[[ -f "$target/README.md" ]] || fail "source marker was not copied"
grep -Fxq 'keep this target config' "$target/config.env" || fail "target config was overwritten"
[[ -f "$systemd_dir/lifeos-asr-http.service" ]] || fail "service was not rendered"
pass "normal install copies source and preserves target config"

service="$systemd_dir/lifeos-asr-http.service"
grep -Fq "ExecStart=/usr/bin/python3 $target/infra/asr-http/server.py" "$service" || fail "service has wrong configured paths"
grep -Fq "EnvironmentFile=$config" "$service" || fail "service lacks configured EnvironmentFile"
pass "rendered service contains configured paths"

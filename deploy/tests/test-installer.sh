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

insecure="$tmp_dir/insecure.env"
cp "$config" "$insecure"
chmod 400 "$insecure"
if TEST_MODE=1 bash "$installer" --dry-run "$insecure" >"$tmp_dir/insecure.out" 2>&1; then
  fail "non-600 config unexpectedly succeeded"
fi
grep -Fq 'permissions' "$tmp_dir/insecure.out" || fail "insecure config error was unclear"
[[ $(stat -c '%a' "$insecure") == 400 ]] || fail "dry-run changed config permissions"
pass "dry-run rejects readable config without chmod"

output=$(TEST_MODE=1 bash "$installer" --dry-run "$config" 2>&1) || fail "complete dry-run failed: $output"
grep -Fq "$target" <<<"$output" || fail "dry-run omitted install directory"
grep -Fq 'http://localhost:8081/v1' <<<"$output" || fail "dry-run omitted LLM endpoint"
grep -Fq 'http://localhost:10202' <<<"$output" || fail "dry-run omitted ASR endpoint"
for secret in asr-secret-value admin-secret-value session-secret-value; do
  ! grep -Fq "$secret" <<<"$output" || fail "dry-run printed a secret"
done
pass "dry-run reports non-secret configuration"

credential_urls="$tmp_dir/credential-urls.env"
sed -e 's|^LLAMA_CPP_BASE_URL=.*|LLAMA_CPP_BASE_URL=https://user:secret@example.test:8081/v1?key=secret|' \
  -e 's|^ASR_HTTP_URL=.*|ASR_HTTP_URL=https://user:secret@example.test:10202/v1?key=secret|' \
  -e 's|^TTS_BASE_URL=.*|TTS_BASE_URL=https://user:secret@example.test:10201/v1?key=secret|' \
  "$config" >"$credential_urls"
chmod 600 "$credential_urls"
output=$(TEST_MODE=1 bash "$installer" --dry-run "$credential_urls" 2>&1) || fail "credential URL dry-run failed: $output"
grep -Fq 'https://example.test:8081/v1' <<<"$output" || fail "redacted URL omitted endpoint"
for secret in 'user:secret' 'key=secret'; do
  ! grep -Fq "$secret" <<<"$output" || fail "credential URL leaked in dry-run"
done
pass "dry-run redacts credential-bearing URLs"

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

bad_python="$tmp_dir/bad-python.env"
sed 's|^ASR_PYTHON=.*|ASR_PYTHON=/no/such/python|' "$config" >"$bad_python"
chmod 600 "$bad_python"
if TEST_MODE=1 bash "$installer" --dry-run "$bad_python" >"$tmp_dir/bad-python.out" 2>&1; then
  fail "missing ASR_PYTHON unexpectedly succeeded"
fi
grep -Fq 'ASR_PYTHON' "$tmp_dir/bad-python.out" || fail "missing ASR_PYTHON error was unclear"
pass "dry-run validates executable paths"

unsafe="$tmp_dir/unsafe.env"
sed "s|^LIFEOS_DIR=.*|LIFEOS_DIR='$tmp_dir/with space'|" "$config" >"$unsafe"
chmod 600 "$unsafe"
if TEST_MODE=1 bash "$installer" --dry-run "$unsafe" >"$tmp_dir/unsafe.out" 2>&1; then
  fail "whitespace path unexpectedly succeeded"
fi
grep -Fq 'must not contain' "$tmp_dir/unsafe.out" || fail "unsafe path error was unclear"
pass "dry-run rejects unsafe unit paths"

percent="$tmp_dir/percent.env"
sed "s|^LIFEOS_DIR=.*|LIFEOS_DIR='$tmp_dir/with%percent'|" "$config" >"$percent"
chmod 600 "$percent"
if TEST_MODE=1 bash "$installer" --dry-run "$percent" >"$tmp_dir/percent.out" 2>&1; then
  fail "percent path unexpectedly succeeded"
fi
grep -Fq 'must not contain' "$tmp_dir/percent.out" || fail "percent path error was unclear"
pass "dry-run rejects percent in unit paths"

foreign="$tmp_dir/foreign"
mkdir -p "$foreign"
printf 'do not overwrite\n' >"$foreign/important.txt"
foreign_config="$tmp_dir/foreign.env"
sed "s|^LIFEOS_DIR=.*|LIFEOS_DIR=$foreign|" "$config" >"$foreign_config"
chmod 600 "$foreign_config"
if TEST_MODE=1 bash "$installer" "$foreign_config" >"$tmp_dir/foreign.out" 2>&1; then
  fail "non-LifeOS target unexpectedly succeeded"
fi
grep -Fq 'missing .lifeos-install marker' "$tmp_dir/foreign.out" || fail "foreign target error was unclear"
grep -Fxq 'do not overwrite' "$foreign/important.txt" || fail "foreign target file changed"
pass "normal install rejects non-LifeOS target"

retry_target="$tmp_dir/retry"
retry_config="$tmp_dir/retry.env"
sed "s|^LIFEOS_DIR=.*|LIFEOS_DIR=$retry_target|" "$config" >"$retry_config"
chmod 600 "$retry_config"
mkdir -p "$tmp_dir/fail-tar"
cat >"$tmp_dir/fail-tar/tar" <<'EOF'
#!/usr/bin/env bash
if [[ " $* " == *" -cf - "* ]]; then exit 1; fi
cat >/dev/null
EOF
chmod +x "$tmp_dir/fail-tar/tar"
if PATH="$tmp_dir/fail-tar:$PATH" TEST_MODE=1 bash "$installer" "$retry_config" >"$tmp_dir/retry.out" 2>&1; then
  fail "simulated tar failure unexpectedly succeeded"
fi
[[ -f "$retry_target/.lifeos-install" ]] || fail "failed copy did not leave retry marker"
TEST_MODE=1 bash "$installer" "$retry_config" >/dev/null 2>&1 || fail "marked target retry failed"
[[ -f "$retry_target/README.md" ]] || fail "marked target retry did not copy source"
pass "marker permits retry after partial copy"

normal_target="$tmp_dir/normal"
normal_config="$tmp_dir/normal.env"
normal_systemd="$tmp_dir/normal-systemd"
sed -e "s|^LIFEOS_DIR=.*|LIFEOS_DIR=$normal_target|" -e "s|^USER_SYSTEMD_DIR=.*|USER_SYSTEMD_DIR=$normal_systemd|" "$config" >"$normal_config"
chmod 600 "$normal_config"
fake_normal="$tmp_dir/fake-normal"
mkdir -p "$fake_normal"
cat >"$fake_normal/docker" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$fake_normal/loginctl" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$fake_normal/systemctl" <<EOF
#!/usr/bin/env bash
printf 'systemctl %s\n' "\$*" >>"$log"
exit 0
EOF
cat >"$fake_normal/curl" <<EOF
#!/usr/bin/env bash
log="$tmp_dir/health-curl.log"
printf '%s\n' "\$*" >>"\$log"
if [[ "\$*" == *"/login"* ]]; then
  count_file="$tmp_dir/login-health-count"
  count=0
  [[ -f "\$count_file" ]] && count=\$(<"\$count_file")
  count=\$((count + 1))
  printf '%s\n' "\$count" >"\$count_file"
  ((count < 3)) && exit 7
fi
exit 0
EOF
chmod +x "$fake_normal"/*
if ! PATH="$fake_normal:$PATH" bash "$installer" "$normal_config" >"$tmp_dir/normal.out" 2>&1; then
  fail "normal install did not retry health checks: $(<"$tmp_dir/normal.out")"
fi
[[ $(<"$tmp_dir/login-health-count") == 3 ]] || fail "health check did not retry twice"
grep -Fq 'systemctl --user restart lifeos-asr-http.service' "$log" || fail "normal install did not restart the bridge"
pass "normal install retries services until healthy"

mkdir -p "$target"
printf 'keep this target config\n' >"$target/config.env"
printf 'stale source file\n' >"$target/stale-source-file.txt"
touch "$target/.lifeos-install"
TEST_MODE=1 bash "$installer" "$config" >/dev/null 2>&1 || fail "normal test-mode install failed"
[[ -f "$target/README.md" ]] || fail "source marker was not copied"
[[ -f "$target/.lifeos-install" ]] || fail "install marker was not preserved"
grep -Fxq 'keep this target config' "$target/config.env" || fail "target config was overwritten"
[[ ! -e "$target/stale-source-file.txt" ]] || fail "stale source file was preserved"
[[ -f "$systemd_dir/lifeos-asr-http.service" ]] || fail "service was not rendered"
pass "normal install copies source and preserves target config"

service="$systemd_dir/lifeos-asr-http.service"
grep -Fq "ExecStart=/usr/bin/python3 $target/infra/asr-http/server.py" "$service" || fail "service has wrong configured paths"
grep -Fq "EnvironmentFile=$config" "$service" || fail "service lacks configured EnvironmentFile"
pass "rendered service contains configured paths"

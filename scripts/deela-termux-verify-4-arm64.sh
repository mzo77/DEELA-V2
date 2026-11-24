#!/usr/bin/env bash
# DEELA owner: local Ubuntu/ARM64 verification only. No APK builds,
# external targets, new accounts, payments, or public service ports.
set -u
export DEBIAN_FRONTEND=noninteractive
BASE=/root/DEELA-ENGINES
LOG="$BASE/setup-logs"
mkdir -p "$LOG"
REPORT="$LOG/results.txt"
: > "$REPORT"
record() { printf '%s: %s\n' "$1" "$2" | tee -a "$REPORT"; }
cd "$BASE" || exit 1
printf '===== DEELA / ARM64 =====\n'
python3 --version
go version
# HexStrike: HTTP dependencies only, not optional angr or external tools.
python3 -m venv "$BASE/.hexstrike-venv"
if timeout 480 "$BASE/.hexstrike-venv/bin/pip" install --disable-pip-version-check --only-binary=:all: \
  'flask>=2.3,<4' 'requests>=2.31,<3' 'psutil>=5.9,<6' \
  'beautifulsoup4>=4.12,<5' 'aiohttp>=3.8,<4' 'selenium>=4.15,<5' \
  'webdriver-manager>=4,<5' 'mitmproxy==12.3.1' \
  > "$LOG/hexstrike-install.log" 2>&1; then
  cd "$BASE/hexstrike" || exit 1
  timeout 35 "$BASE/.hexstrike-venv/bin/python" -c \
    'from hexstrike_server import app; app.run(host="127.0.0.1",port=8888,debug=False)' \
    > "$LOG/hexstrike-server.log" 2>&1 &
  SERVER_PID=$!
  HEALTH=fail
  for i in $(seq 1 15); do
    if curl -fsS --max-time 2 http://127.0.0.1:8888/api/process/health-check 2>/dev/null | \
       python3 -c 'import json,sys; assert json.load(sys.stdin).get("success") is True' 2>/dev/null; then
      HEALTH=pass
      break
    fi
    sleep 1
  done
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  record HEXSTRIKE_HTTP "$HEALTH"
else
  record HEXSTRIKE_HTTP failed_install
  tail -n 6 "$LOG/hexstrike-install.log"
fi
# PentestGPT: real CLI version test, no AI model credentials added.
cd "$BASE" || exit 1
python3 -m venv "$BASE/.uv-tools"
if timeout 120 "$BASE/.uv-tools/bin/pip" install --disable-pip-version-check --only-binary=:all: uv > "$LOG/uv-install.log" 2>&1 && \
   (cd "$BASE/pentestgpt" && timeout 600 env UV_NO_PROGRESS=1 "$BASE/.uv-tools/bin/uv" sync --no-dev --python /usr/bin/python3 > "$LOG/pentestgpt-install.log" 2>&1) && \
   (cd "$BASE/pentestgpt" && .venv/bin/pentestgpt-legacy --version > "$LOG/pentestgpt-version.log" 2>&1); then
  record PENTESTGPT_CLI pass
else
  record PENTESTGPT_CLI failed
  tail -n 6 "$LOG/pentestgpt-install.log" 2>/dev/null || tail -n 6 "$LOG/uv-install.log" 2>/dev/null || true
fi
# Go projects need Go 1.26+, GOTOOLCHAIN=auto fetches a compatible compiler.
# Compile sequentially to limit RAM pressure.
for item in pentagi pentest-swarm; do
  case "$item" in
    pentagi) DIR="$BASE/pentagi/backend"; LABEL=PENTAGI_BUILD ;;
    pentest-swarm) DIR="$BASE/pentest-swarm"; LABEL=PENTEST_SWARM_BUILD ;;
  esac
  if (cd "$DIR" && timeout 600 env GOTOOLCHAIN=auto GOMAXPROCS=2 GOFLAGS=-p=1 GOMEMLIMIT=1800MiB go build ./... > "$LOG/$item-build.log" 2>&1); then
    record "$LABEL" pass
  else
    record "$LABEL" failed
    tail -n 7 "$LOG/$item-build.log" 2>/dev/null || true
  fi
done
printf '\n===== RESULTS =====\n'
cat "$REPORT"
printf 'Full logs inside Ubuntu: %s\n' "$LOG"
printf 'NOTE: build success is NOT a deployed AI model or a persistent server.\n'
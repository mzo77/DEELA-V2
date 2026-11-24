#!/usr/bin/env bash
# DEELA PentAGI — Codespaces environment readiness check (read-only).
# No installations, service restarts, file modifications, secret collection, or network calls.
set -u
printf '\n=========================================\n'
printf ' DEELA / PentAGI Codespaces PRE-FLIGHT\n'
printf '=========================================\n'
printf 'Date: %s\n' "$(date -u '+%Y-%m-%d %H:%M UTC')"
printf 'Architecture: %s\n' "$(uname -m)"
printf 'Working directory: %s\n' "$PWD"
printf '\n[CPU]\n'
if command -v nproc >/dev/null 2>&1; then
  cores="$(nproc)"
  printf 'Detected CPUs: %s (minimum 2)\n' "$cores"
else
  printf 'nproc not available\n'
fi
printf '\n[RAM]\n'
if command -v free >/dev/null 2>&1; then
  free -h | head -n 3
else
  grep -E '^MemTotal:|^MemAvailable:' /proc/meminfo || :
fi
printf '\n[DISK: HOME]\n'
df -h "$HOME" || :
printf '\n[DISK: WORKSPACE]\n'
if [ -d /workspaces ]; then df -h /workspaces || :; else df -h . || :; fi
printf '\n[DOCKER]\n'
if command -v docker >/dev/null 2>&1; then
  docker --version || :
  if docker info >/dev/null 2>&1; then
    printf 'Docker daemon: READY\n'
    docker info --format 'Docker root: {{.DockerRootDir}}; Storage driver: {{.Driver}}' 2>/dev/null || :
    if docker info --format '{{.DockerRootDir}}' 2>/dev/null | grep -q '^/'; then
      docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || :)"
      if [ -d "$docker_root" ]; then
        printf 'Docker storage free space:\n'
        df -h "$docker_root" || :
      fi
    fi
  else
    printf 'Docker daemon: NOT READY / PERMISSION DENIED\n'
  fi
  if docker compose version >/dev/null 2>&1; then docker compose version; else printf 'Docker Compose: NOT AVAILABLE\n'; fi
else
  printf 'Docker CLI: NOT INSTALLED\n'
fi
printf '\n[THRESHOLDS]\n'
avail_kb="$(df -Pk "$HOME" 2>/dev/null | awk 'NR==2 {print $4}')"
if [[ "$avail_kb" =~ ^[0-9]+$ ]]; then
  if [ "$avail_kb" -ge 26214400 ]; then
    printf 'Home filesystem >=25 GiB free: YES\n'
  else
    printf 'Home filesystem >=25 GiB free: NO (do not install PentAGI yet)\n'
  fi
else
  printf 'Home filesystem free space: UNKNOWN\n'
fi
printf 'Do not make Codespaces ports public or run PentAGI against unapproved systems.\n'
printf 'No files changed. No software installed.\n'
printf '=========================================\n'

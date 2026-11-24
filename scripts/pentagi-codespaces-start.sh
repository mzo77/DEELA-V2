#!/usr/bin/env bash
# DEELA-PentAGI / GitHub Codespaces guided bootstrap.
# Only downloads the official PentAGI installer after resource checks.
# Does not expose ports, collect credentials, modify DEELA, or create paid resources.
set -euo pipefail

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
info() { printf '\n>>> %s\n' "$*"; }

info "DEELA PentAGI bootstrap (Codespaces only)"
[ "${CODESPACES:-}" = "true" ] || fail "This command is intended only for a GitHub Codespace."
[ "$(uname -s)" = Linux ] || fail "Linux is required."
[ "$(uname -m)" = x86_64 ] || [ "$(uname -m)" = aarch64 ] || fail "Unsupported architecture."
for cmd in curl unzip nproc docker awk df; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
cpu="$(nproc)"
mem_kib="$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)"
info "CPU: $cpu; RAM reported: $((mem_kib / 1024)) MiB"
[ "$cpu" -ge 2 ] || fail "PentAGI requires at least 2 CPU cores."
[ "$mem_kib" -ge 4194304 ] || fail "PentAGI requires at least 4 GiB RAM."
# Check cgroup memory cap too, if visible in Codespaces.
for cg in /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory/memory.limit_in_bytes; do
  if [ -r "$cg" ]; then
    limit="$(cat "$cg" 2>/dev/null || :)"
    if [[ "$limit" =~ ^[0-9]+$ ]] && [ "$limit" -lt 4294967296 ]; then
      fail "Container memory limit is lower than 4 GiB."
    fi
  fi
done

info "Storage"
df -h "$HOME"
free_kib="$(df -Pk "$HOME" | awk 'NR==2 {print $4}')"
[[ "$free_kib" =~ ^[0-9]+$ ]] || fail "Unable to read available disk space."
[ "$free_kib" -ge 26214400 ] || fail "Less than 25 GiB free in HOME. This Codespace cannot safely run a full PentAGI install."

info "Docker"
docker info >/dev/null 2>&1 || fail "Docker daemon unavailable. Open the preflight results and fix Docker first."
docker compose version || fail "Docker Compose plugin is unavailable."
docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || :)"
if [ -n "$docker_root" ] && [ -d "$docker_root" ]; then
  df -h "$docker_root"
  docker_free="$(df -Pk "$docker_root" | awk 'NR==2 {print $4}')"
  if [[ "$docker_free" =~ ^[0-9]+$ ]] && [ "$docker_free" -lt 26214400 ]; then
    fail "Less than 25 GiB free on Docker storage. Stopping to protect existing Codespaces files."
  fi
else
  info "Docker root filesystem not visible: cannot verify Docker image storage separately."
  fail "Docker image-storage capacity could not be verified; not installing blindly."
fi

info "The official installer is interactive. You will choose a model provider, configure security, and accept the PentAGI EULA."
info "Never switch Codespaces ports to PUBLIC. Keep PentAGI's 8443 and sandbox callback ports private."
info "Use PentAGI only for systems you own or are explicitly authorized to test."
read -r -p "Download and start the official PentAGI installer? [y/N] " reply
[[ "$reply" =~ ^[Yy]$ ]] || { info "Cancelled without installing."; exit 0; }

arch="amd64"
[ "$(uname -m)" = aarch64 ] && arch="arm64"
url="https://pentagi.com/downloads/linux/${arch}/installer-latest.zip"
runtime="$HOME/deela-pentagi-runtime"
mkdir -p "$runtime"
cd "$runtime"
info "Downloading official installer from $url"
curl -fL --retry 2 --connect-timeout 15 -o installer.zip "$url"
unzip -o installer.zip >/dev/null
[ -f ./installer ] || fail "Official installer executable not found in archive."
chmod u+x ./installer
info "Launching official interactive installer..."
if [ "$(id -u)" -eq 0 ]; then
  ./installer
elif command -v sudo >/dev/null 2>&1; then
  sudo ./installer
else
  fail "Installer requires Docker root or sudo privileges."
fi

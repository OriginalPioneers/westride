#!/bin/sh
# WeStride supporter runner installer (macOS / Linux).
#
#   curl -fsSL https://westride.org/install.sh | sh -s -- --code XXXX-XXXX
#
# Installs nothing on the host besides a Docker container. The runner only
# takes agent jobs for ideas you pledged compute to, clones public
# repositories, and never holds GitHub credentials. Stop it any time with
#   docker rm -f westride-runner
set -eu

IMAGE="${WESTRIDE_RUNNER_IMAGE:-ghcr.io/westrideorg/westride-runner:latest}"
CONTAINER="westride-runner"
VOLUME="westride-runner-state"
WESTRIDE_URL="${WESTRIDE_URL:-https://westride.org}"
CODE=""
NAME=""
META_KEY="${META_API_KEY:-}"
MEMORY="${WESTRIDE_RUNNER_MEMORY:-6g}"
CPUS="${WESTRIDE_RUNNER_CPUS:-4}"

while [ $# -gt 0 ]; do
  case "$1" in
    --code) CODE="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --url) WESTRIDE_URL="$2"; shift 2 ;;
    --meta-key) META_KEY="$2"; shift 2 ;;
    --image) IMAGE="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: install.sh --code XXXX-XXXX [--name \"My laptop\"] [--meta-key KEY] [--url https://westride.org]"
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

say() { printf '%s\n' "$*"; }
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

# Read from the terminal even when piped through sh.
ask() {
  prompt="$1"; default="$2"
  if [ -r /dev/tty ]; then
    printf '%s' "$prompt" > /dev/tty
    IFS= read -r answer < /dev/tty || answer=""
  else
    answer=""
  fi
  [ -n "$answer" ] && printf '%s' "$answer" || printf '%s' "$default"
}

say ""
say "WeStride supporter runner"
say "========================="

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Get it from https://docs.docker.com/get-docker/ and run this again."
docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker Desktop (or the docker service) and run this again."

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  say "A runner container already exists."
  answer=$(ask "Replace it? [y/N] " "n")
  case "$answer" in
    y|Y|yes|YES) docker rm -f "$CONTAINER" >/dev/null ;;
    *) say "Leaving the existing runner alone. Logs: docker logs -f $CONTAINER"; exit 0 ;;
  esac
fi

HAS_TOKEN=0
if docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  # A token survives from an earlier install; the pairing code is optional then.
  if docker run --rm -v "$VOLUME:/state:ro" alpine:3 sh -c 'test -s /state/device-token' >/dev/null 2>&1; then
    HAS_TOKEN=1
  fi
fi

if [ -z "$CODE" ] && [ "$HAS_TOKEN" -eq 0 ]; then
  CODE=$(ask "Pairing code from WeStride → Supporting → Link a computer: " "")
  [ -n "$CODE" ] || fail "A pairing code is required the first time."
fi

if [ -z "$NAME" ]; then
  default_name=$(hostname 2>/dev/null || echo "My computer")
  NAME=$(ask "Name for this computer [$default_name]: " "$default_name")
fi

if [ -z "$META_KEY" ]; then
  say ""
  say "Optional: a Meta API key lets jobs that need one run here. It stays on this"
  say "computer and is never sent to WeStride. Leave blank to only run jobs with"
  say "local Ollama models."
  META_KEY=$(ask "Meta API key (optional): " "")
fi

# Ollama check is advisory; the runner probes it on every heartbeat.
if command -v curl >/dev/null 2>&1 && curl -fsS -m 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
  say "Ollama is running; local models will be offered."
else
  say "Ollama was not found on port 11434. Jobs that need a local model will wait until it runs."
fi

say ""
say "Pulling $IMAGE…"
docker pull "$IMAGE" >/dev/null
docker volume create "$VOLUME" >/dev/null

set -- \
  -d --name "$CONTAINER" --restart unless-stopped \
  --cap-drop ALL --security-opt no-new-privileges --pids-limit 512 \
  --memory "$MEMORY" --cpus "$CPUS" \
  --add-host host.docker.internal:host-gateway \
  -v "$VOLUME:/state" \
  -e "WESTRIDE_URL=$WESTRIDE_URL" \
  -e "WESTRIDE_DEVICE_NAME=$NAME"
[ -n "$CODE" ] && set -- "$@" -e "WESTRIDE_PAIRING_CODE=$CODE"
[ -n "$META_KEY" ] && set -- "$@" -e "META_API_KEY=$META_KEY"

docker run "$@" "$IMAGE" >/dev/null

say ""
say "The runner is starting. It shows up on your Supporting page within a minute."
say "  Logs:  docker logs -f $CONTAINER"
say "  Stop:  docker rm -f $CONTAINER"

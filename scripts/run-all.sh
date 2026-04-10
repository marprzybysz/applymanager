#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-up}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd docker

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is not available."
  exit 1
fi

wait_for_app() {
  local attempts=30
  local delay=2
  local url="http://localhost:3000/api/health"

  echo "Waiting for API health: $url"
  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "App is ready."
      return 0
    fi
    sleep "$delay"
  done

  echo "App did not become ready in time. Check logs:"
  echo "docker compose logs app db"
  exit 1
}

case "$MODE" in
  up)
    docker compose up --build -d
    wait_for_app
    echo
    echo "ApplyManager started."
    echo "App: http://localhost:3000"
    echo "Health: http://localhost:3000/api/health"
    echo "Sources: http://localhost:3000/api/scrape/sources"
    ;;
  down)
    docker compose down
    echo "ApplyManager stopped."
    ;;
  logs)
    docker compose logs -f app db
    ;;
  restart)
    docker compose down
    docker compose up --build -d
    wait_for_app
    echo "ApplyManager restarted."
    ;;
  *)
    echo "Usage: $0 [up|down|logs|restart]"
    exit 1
    ;;
esac

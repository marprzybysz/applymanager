#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-up}"
COMPOSE="docker compose -f docker-compose.dev.yml"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd docker

wait_for_dev() {
  local attempts=40
  local delay=2
  local api_url="http://localhost:3000/api/health"
  local web_url="http://localhost:1420"

  echo "Waiting for API: $api_url"
  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$api_url" >/dev/null 2>&1; then
      break
    fi
    sleep "$delay"
  done

  echo "Waiting for Web: $web_url"
  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$web_url" >/dev/null 2>&1; then
      echo "Dev stack is ready."
      return 0
    fi
    sleep "$delay"
  done

  echo "Dev stack did not become ready in time. Check logs:"
  echo "$COMPOSE logs api web db"
  exit 1
}

case "$MODE" in
  up)
    $COMPOSE up --build -d
    wait_for_dev
    echo
    echo "ApplyManager dev started."
    echo "Web (Vite): http://localhost:1420"
    echo "API: http://localhost:3000/api/health"
    ;;
  down)
    $COMPOSE down
    echo "ApplyManager dev stopped."
    ;;
  logs)
    $COMPOSE logs -f api web db
    ;;
  restart)
    $COMPOSE down
    $COMPOSE up --build -d
    wait_for_dev
    echo "ApplyManager dev restarted."
    ;;
  *)
    echo "Usage: $0 [up|down|logs|restart]"
    exit 1
    ;;
esac

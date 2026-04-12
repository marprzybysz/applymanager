#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-up}"
COMPOSE="docker compose -f docker-compose.dev.yml"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
RESET_VOLUMES_ON_THIS_BRANCH="feature/exportassistant"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd docker

show_ports() {
  echo
  echo "==============================================="
  echo "ApplyManager READY (dev compose)"
  echo "==============================================="
  echo "Frontend (web/Vite):    http://localhost:1420"
  echo "Backend (api/FastAPI):  http://localhost:3000"
  echo "Backend base:           http://localhost:3000/api"
  echo "Backend health:         http://localhost:3000/api/health"
  echo "Database (PostgreSQL):  localhost:5432"
  echo
  echo "Containers running:"
  echo "- applymanager-web-dev"
  echo "- applymanager-api-dev"
  echo "- applymanager-db-dev"
  echo "==============================================="
}

show_images() {
  echo
  echo "Compose images (dev):"
  $COMPOSE images
  echo
  echo "Docker disk usage:"
  docker system df
}

clean_images() {
  echo "Stopping dev stack and removing local build images for dev compose..."
  $COMPOSE down --rmi local --remove-orphans
  echo "Done. Removed compose local images."
}

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

maybe_reset_volumes() {
  if [[ "$CURRENT_BRANCH" == "$RESET_VOLUMES_ON_THIS_BRANCH" ]]; then
    echo "Branch '$CURRENT_BRANCH': resetting DB volumes for fresh data..."
    $COMPOSE down -v --remove-orphans || true
  fi
}

case "$MODE" in
  up)
    maybe_reset_volumes
    $COMPOSE up --build -d
    wait_for_dev
    echo "ApplyManager dev started."
    show_ports
    ;;
  down)
    $COMPOSE down
    echo "ApplyManager dev stopped."
    ;;
  logs)
    $COMPOSE logs -f api web db
    ;;
  images)
    show_images
    ;;
  clean-images)
    clean_images
    ;;
  restart)
    maybe_reset_volumes
    $COMPOSE down
    $COMPOSE up --build -d
    wait_for_dev
    echo "ApplyManager dev restarted."
    show_ports
    ;;
  ports)
    show_ports
    ;;
  *)
    echo "Usage: $0 [up|down|logs|restart|ports|images|clean-images]"
    exit 1
    ;;
esac

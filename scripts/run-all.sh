#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-up}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
RESET_VOLUMES_ON_THIS_BRANCH=""

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

show_ports() {
  echo
  echo "==============================================="
  echo "ApplyManager READY (production compose)"
  echo "==============================================="
  echo "Frontend (UI):          http://localhost:3000"
  echo "Backend (API):          http://localhost:3000/api"
  echo "Backend health:         http://localhost:3000/api/health"
  echo "Backend sources:        http://localhost:3000/api/scrape/sources"
  echo "Database (PostgreSQL):  localhost:5432"
  echo
  echo "Containers running:"
  echo "- applymanager-app"
  echo "- applymanager-db"
  echo "==============================================="
}

show_images() {
  echo
  echo "Compose images (production):"
  docker compose images
  echo
  echo "Docker disk usage:"
  docker system df
}

clean_images() {
  echo "Stopping stack and removing local build images for production compose..."
  docker compose down --rmi local --remove-orphans
  echo "Done. Removed compose local images."
}

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

maybe_reset_volumes() {
  if [[ -n "$RESET_VOLUMES_ON_THIS_BRANCH" && "$CURRENT_BRANCH" == "$RESET_VOLUMES_ON_THIS_BRANCH" ]]; then
    echo "Branch '$CURRENT_BRANCH': resetting DB volumes for fresh data..."
    docker compose down -v --remove-orphans || true
  fi
}

case "$MODE" in
  up)
    maybe_reset_volumes
    docker compose up --build -d
    wait_for_app
    echo "ApplyManager started."
    show_ports
    ;;
  down)
    docker compose down
    echo "ApplyManager stopped."
    ;;
  logs)
    docker compose logs -f app db
    ;;
  images)
    show_images
    ;;
  clean-images)
    clean_images
    ;;
  restart)
    maybe_reset_volumes
    docker compose down
    docker compose up --build -d
    wait_for_app
    echo "ApplyManager restarted."
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

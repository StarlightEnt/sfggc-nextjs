#!/usr/bin/env bash
set -euo pipefail

# docker-db.sh - Throwaway MariaDB in Docker for local development.
#
#   bash scripts/dev/docker-db.sh up      Start (or create) the container and wait until ready
#   bash scripts/dev/docker-db.sh init    up + apply the schema and all migrations
#   bash scripts/dev/docker-db.sh down    Stop the container (data is kept)
#   bash scripts/dev/docker-db.sh status  Show container state
#   bash scripts/dev/docker-db.sh shell   Open a mariadb client in the container
#   bash scripts/dev/docker-db.sh reset --yes   Delete the container AND its data
#
# The container binds to 127.0.0.1 only. Connection settings live in .env.local (gitignored);
# the file is created if missing and is otherwise never modified. The password is generated
# once, never printed, and handed to Docker through the environment rather than the command line.
#
# Overrides: SFGGC_DOCKER_DB_NAME, SFGGC_DOCKER_DB_PORT, SFGGC_DOCKER_DB_IMAGE,
#            SFGGC_DOCKER_DB_DATABASE, SFGGC_ENV_FILE (not supported by init), SFGGC_INIT_SCRIPT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

NAME="${SFGGC_DOCKER_DB_NAME:-sfggc-dev-mariadb}"
PORT="${SFGGC_DOCKER_DB_PORT:-3307}"
IMAGE="${SFGGC_DOCKER_DB_IMAGE:-mariadb:11}"
DB_NAME="${SFGGC_DOCKER_DB_DATABASE:-sfggc_portal}"
VOLUME="${NAME}-data"
ENV_FILE="${SFGGC_ENV_FILE:-$PROJECT_ROOT/.env.local}"
INIT_SCRIPT="${SFGGC_INIT_SCRIPT:-$SCRIPT_DIR/init-portal-db.sh}"

usage() {
  sed -n '4,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_docker() {
  command -v docker >/dev/null 2>&1 || die "docker not found. Install Docker Desktop (or Docker Engine) first."
  docker info >/dev/null 2>&1 || die "The Docker daemon is not running. Start Docker Desktop (or the docker service) and try again."
}

container_exists() {
  [[ -n "$(docker ps -a --filter "name=^${NAME}\$" --format '{{.Names}}')" ]]
}

container_running() {
  [[ -n "$(docker ps --filter "name=^${NAME}\$" --format '{{.Names}}')" ]]
}

volume_exists() {
  docker volume inspect "$VOLUME" >/dev/null 2>&1
}

# Prints the value of KEY from the env file (without sourcing it), or nothing.
env_value() {
  [[ -f "$ENV_FILE" ]] || return 0
  sed -n "s#^$1=##p" "$ENV_FILE" | head -n 1
}

# Prints the password stored in the env file's PORTAL_DATABASE_URL, or nothing.
env_password() {
  [[ -f "$ENV_FILE" ]] || return 0
  sed -n 's#^PORTAL_DATABASE_URL=mysql://[^:@/]*:\([^@]*\)@.*#\1#p' "$ENV_FILE" | head -n 1
}

# Appends one line to the env file, first ending any unterminated last line.
append_env_line() {
  if [[ -s "$ENV_FILE" && -n "$(tail -c1 "$ENV_FILE")" ]]; then
    printf '\n' >> "$ENV_FILE"
  fi
  printf '%s\n' "$1" >> "$ENV_FILE"
}

# Makes sure the env file holds settings for this container, creating or extending it only
# when it has none. Refuses (without touching the file) if it already targets another database.
ensure_env_file() {
  local url
  url="$(env_value PORTAL_DATABASE_URL)"

  if [[ -n "$url" ]]; then
    case "$url" in
      mysql://*:*@127.0.0.1:"$PORT"/*) return 0 ;;
      *) die "PORTAL_DATABASE_URL in $ENV_FILE does not point at the Docker database (127.0.0.1:$PORT). Edit or remove it, or use SFGGC_ENV_FILE to point at a different file." ;;
    esac
  fi

  # A fresh password cannot unlock existing data: MariaDB only applies it when it first creates the volume.
  if container_exists || volume_exists; then
    die "A database container or volume ($NAME / $VOLUME) already exists, but $ENV_FILE has no database password to match it. Restore the file, or run 'reset --yes' to delete the old data and start fresh."
  fi

  local password secret
  password="$(openssl rand -hex 16)"
  secret="$(openssl rand -hex 32)"
  ( umask 077
    touch "$ENV_FILE"
    append_env_line "PORTAL_DATABASE_URL=mysql://root:${password}@127.0.0.1:${PORT}/${DB_NAME}"
    if [[ -z "$(env_value ADMIN_SESSION_SECRET)" ]]; then
      append_env_line "ADMIN_SESSION_SECRET=${secret}"
    fi
  )
  chmod 600 "$ENV_FILE"
  echo "Wrote database settings to $ENV_FILE"
}

wait_until_ready() {
  local attempt
  for attempt in $(seq 1 30); do
    if MYSQL_PWD="$(env_password)" docker exec -e MYSQL_PWD "$NAME" mariadb -uroot -e "select 1" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  die "MariaDB did not become ready in time. Check: docker logs $NAME"
}

cmd_up() {
  require_docker
  ensure_env_file
  local password
  password="$(env_password)"

  if container_running; then
    echo "Container $NAME is already running."
  elif container_exists; then
    echo "Starting existing container $NAME..."
    docker start "$NAME" >/dev/null
  else
    echo "Creating container $NAME ($IMAGE) on 127.0.0.1:$PORT..."
    MARIADB_ROOT_PASSWORD="$password" docker run -d --name "$NAME" \
      -p "127.0.0.1:${PORT}:3306" \
      -v "${VOLUME}:/var/lib/mysql" \
      -e MARIADB_ROOT_PASSWORD \
      -e "MARIADB_DATABASE=${DB_NAME}" \
      "$IMAGE" >/dev/null
  fi

  wait_until_ready
  echo "MariaDB is ready on 127.0.0.1:$PORT (database: $DB_NAME). Settings are in $ENV_FILE."
}

cmd_init() {
  # The repo's init script always reads <project>/.env.local itself, so a different file would be ignored.
  if [[ -z "${SFGGC_INIT_SCRIPT:-}" && "$ENV_FILE" != "$PROJECT_ROOT/.env.local" ]]; then
    die "init uses the project's .env.local; SFGGC_ENV_FILE is not supported for init."
  fi
  cmd_up
  # Put the shim first on PATH so the repo's scripts can use the container's mysql client.
  PORTAL_DATABASE_URL="$(env_value PORTAL_DATABASE_URL)" \
  SFGGC_DOCKER_DB_NAME="$NAME" \
  PATH="$SCRIPT_DIR/docker:$PATH" \
    bash "$INIT_SCRIPT"
}

cmd_down() {
  require_docker
  container_running || { echo "Container $NAME is not running."; return 0; }
  docker stop "$NAME" >/dev/null
  echo "Stopped $NAME. Data is kept; run 'up' to start it again."
}

cmd_status() {
  require_docker
  if container_exists; then
    docker ps -a --filter "name=^${NAME}\$" --format 'Container {{.Names}}: {{.Status}} ({{.Ports}})'
  else
    echo "Container $NAME does not exist. Run: bash scripts/dev/docker-db.sh up"
  fi
}

cmd_shell() {
  require_docker
  container_running || die "Container $NAME is not running. Run 'up' first."
  MYSQL_PWD="$(env_password)" docker exec -it -e MYSQL_PWD "$NAME" mariadb -uroot "$DB_NAME"
}

cmd_reset() {
  [[ "${1:-}" == "--yes" ]] || die "reset deletes the container and all its data. Re-run with --yes to confirm."
  require_docker
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
  echo "Removed $NAME and its data volume. $ENV_FILE was left in place."
}

case "${1:-help}" in
  up)     cmd_up ;;
  init)   cmd_init ;;
  down)   cmd_down ;;
  status) cmd_status ;;
  shell)  cmd_shell ;;
  reset)  shift; cmd_reset "$@" ;;
  help|-h|--help) usage ;;
  *) usage >&2; die "unknown command: $1" ;;
esac

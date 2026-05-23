#!/usr/bin/env bash
set -euo pipefail

# wait_for_mariadb - Wait for MariaDB to accept connections with progressive backoff.
# Returns 0 if server responds, 1 if all attempts exhausted.
wait_for_mariadb() {
  local waits=(0.5 1 2 4 8)
  local attempt=0

  for delay in "${waits[@]}"; do
    attempt=$((attempt + 1))
    sleep "$delay"

    local result
    result=$(mysqladmin ping 2>&1) && {
      echo "MariaDB is running. ($result)"
      return 0
    }

    echo "  Waiting for MariaDB (attempt $attempt/${#waits[@]}: $result)"
  done

  return 1
}

if command -v brew >/dev/null 2>&1; then
  if mysqladmin ping &>/dev/null; then
    echo "MariaDB is already running."
    exit 0
  fi

  echo "Starting MariaDB via Homebrew..."
  if brew services start mariadb 2>/dev/null; then
    wait_for_mariadb && exit 0
  fi

  echo "brew services start failed (common if your home is on an external drive)."
  echo "Falling back to 'brew services run'..."
  if brew services run mariadb 2>/dev/null; then
    wait_for_mariadb && exit 0
  fi

  echo "Could not start MariaDB automatically."
  echo "Run mysqld directly in a separate terminal:"
  if command -v /opt/homebrew/opt/mariadb/bin/mysqld >/dev/null 2>&1; then
    echo '  /opt/homebrew/opt/mariadb/bin/mysqld --basedir=/opt/homebrew/opt/mariadb --datadir=/opt/homebrew/var/mysql'
  fi
  exit 1
fi

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet mariadb; then
    echo "MariaDB is already running."
  else
    echo "Starting MariaDB via systemctl..."
    sudo systemctl start mariadb
    wait_for_mariadb || { echo "MariaDB failed to start."; exit 1; }
  fi
  exit 0
fi

echo "Could not detect brew or systemctl. Start MariaDB manually."

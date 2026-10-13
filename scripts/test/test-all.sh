#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/_helpers.sh"
load_env_local

FRONTEND_TEST_FILES=()
while IFS= read -r test_file; do
  FRONTEND_TEST_FILES+=("${test_file}")
done < <(find tests/unit tests/frontend -type f -name '*.test.js' | sort)

INTEGRATION_TEST_FILES=()
while IFS= read -r test_file; do
  INTEGRATION_TEST_FILES+=("${test_file}")
done < <(find tests/integration -type f -name '*.test.js' | sort)

status=0
run_test_command "frontend unit + route tests" node --test --test-concurrency=1 "${FRONTEND_TEST_FILES[@]}" || status=$?
# With a database configured, an integration test that skips gave no coverage, so treat it as a failure.
run_test_command --no-skips-when-db-configured "integration tests" node --test --test-concurrency=1 "${INTEGRATION_TEST_FILES[@]}" || status=$?
run_test_command "backend tests" npm --prefix backend test || status=$?

print_summary
drop_test_db_if_success "$status"
exit "$status"

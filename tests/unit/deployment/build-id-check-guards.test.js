const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('fs');
const { join } = require('path');

const readFile = (relativePath) =>
  readFileSync(join(__dirname, '..', '..', '..', relativePath), 'utf8');

/**
 * Regression guard for verify_build_id_served in deploy_scripts/lib/deploy-app.sh.
 *
 * deploy.sh enables `set -euo pipefail`. The fingerprint check uses two piped
 * command substitutions:
 *
 *   server_build_id=$(ssh_command "cat .next/BUILD_ID ..." | tr -d ...)
 *   public_build_id=$(echo "$public_html" | grep ... | head -1 | sed ...)
 *
 * Without a trailing `|| true` inside the $(...), a failing pipeline (missing
 * BUILD_ID file, or `grep` no-match when nginx is serving a stale static file)
 * exits the script BEFORE the downstream `[ -z "$var" ]` guard can emit the
 * actionable diagnostic. The friendly errors are the entire point of the
 * fingerprint check — losing them silently re-introduces the original
 * "deploy reports success while nginx serves stale content" failure mode.
 *
 * Reproduction (without `|| true`):
 *   $ bash -c 'set -euo pipefail; x=$(false | head -1); echo "never reached"'
 *   (exit 1, no output)
 *
 * With `|| true`:
 *   $ bash -c 'set -euo pipefail; x=$(false | head -1 || true); echo "reached: [$x]"'
 *   reached: []
 */

describe('verify_build_id_served pipefail guards (deploy-app.sh)', () => {
  const script = readFile('deploy_scripts/lib/deploy-app.sh');

  // Extract just the function body so we don't accidentally match command
  // substitutions elsewhere in the file. Function definition is followed by
  // `{` on the same line and a `}` at the start of a line.
  const funcMatch = script.match(
    /verify_build_id_served\s*\(\)\s*\{([\s\S]*?)^\}/m
  );

  test('Given deploy-app.sh, when locating verify_build_id_served, then the function exists', () => {
    assert.ok(
      funcMatch,
      'verify_build_id_served function should be defined in deploy_scripts/lib/deploy-app.sh'
    );
  });

  const body = funcMatch ? funcMatch[1] : '';
  const lines = body.split('\n');

  test('Given server_build_id command substitution, when inspecting the pipeline, then it ends with `|| true`', () => {
    const line = lines.find((l) => l.includes('server_build_id=$('));
    assert.ok(line, 'server_build_id assignment line should be present');
    assert.ok(
      line.includes('|| true'),
      'server_build_id=$(... | tr ...) must end with `|| true` inside the $(...). ' +
        'Without it, a missing .next/BUILD_ID on the server fails the pipeline under ' +
        'set -euo pipefail and exits the script before the `[ -z "$server_build_id" ]` ' +
        'guard can log "Could not read .next/BUILD_ID on server — build may have failed". ' +
        'Do not strip the `|| true` — it is load-bearing, not vestigial.'
    );
  });

  test('Given public_build_id command substitution, when inspecting the pipeline, then it ends with `|| true`', () => {
    const line = lines.find((l) => l.includes('public_build_id=$('));
    assert.ok(line, 'public_build_id assignment line should be present');
    assert.ok(
      line.includes('|| true'),
      'public_build_id=$(... | grep ... | head ... | sed ...) must end with `|| true` ' +
        'inside the $(...). Without it, a `grep` no-match (nginx serving a non-Next.js ' +
        'response like a stale static file) fails the pipeline under set -euo pipefail ' +
        'and exits the script before the `[ -z "$public_build_id" ]` guard can log the ' +
        'vhost-drift remediation ("Push backend/config/vhost.txt to CloudPanel"). ' +
        'Do not strip the `|| true` — it is load-bearing, not vestigial.'
    );
  });

  test('Given the function body, when checking diagnostic branches, then both empty-value error messages remain wired up', () => {
    assert.ok(
      body.includes('Could not read .next/BUILD_ID'),
      'missing-BUILD_ID diagnostic should be present in verify_build_id_served'
    );
    assert.ok(
      body.includes('Push backend/config/vhost.txt to CloudPanel'),
      'vhost-drift diagnostic with CloudPanel remediation should be present in verify_build_id_served'
    );
  });
});

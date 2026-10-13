const { describe, test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

/**
 * BDD tests for the shell test runners (scripts/test/*.sh). They exercise the real helper
 * functions and scripts against stub commands, so they check behavior (exit codes and the
 * summary a developer sees) rather than the shell source.
 */

const ROOT = path.resolve(__dirname, "..", "..");
const HELPERS = path.join(ROOT, "scripts/test/_helpers.sh");

const tempDirs = [];
after(() => tempDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-"));
  tempDirs.push(dir);
  return dir;
};

/** Runs a bash snippet with the helpers sourced. Database env vars are cleared unless given. */
const withHelpers = (snippet, env = {}) =>
  spawnSync("bash", ["-c", `set -euo pipefail; source "${HELPERS}"; ${snippet}`], {
    encoding: "utf-8",
    env: { ...process.env, PORTAL_DATABASE_URL: "", PORTAL_TEST_DATABASE_URL: "", ...env },
  });

describe("run_test_command and print_summary", () => {
  test("Given a step that passes, when run, then the summary says all tests passed", () => {
    const r = withHelpers(`run_test_command "ok step" bash -c 'echo "ok 1 - fine"; exit 0'; print_summary`);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /All tests passed/);
  });

  test("Given a step that reports a failing test, when run, then the summary lists it and the run fails", () => {
    const r = withHelpers(`run_test_command "tap step" bash -c 'echo "not ok 1 - broken thing"; exit 1' || true; print_summary`);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /not ok 1 - broken thing/);
  });

  test("Given a step that crashes without printing any failing test, when run, then it is still reported as a failure", () => {
    const r = withHelpers(`run_test_command "crashing step" bash -c 'echo boom; exit 3' || true; print_summary`);
    assert.notEqual(r.status, 0, "a crash must not be reported as 'All tests passed'");
    assert.doesNotMatch(r.stdout, /All tests passed/);
    assert.match(r.stdout, /crashing step/);
    assert.match(r.stdout, /status 3/);
  });

  test("Given a failing step, when run, then the original exit status is returned to the caller", () => {
    const r = withHelpers(`status=0; run_test_command "fail" bash -c 'exit 7' || status=$?; echo "captured=$status"`);
    assert.match(r.stdout, /captured=7/);
  });
});

describe("skipped integration tests when a database is configured", () => {
  const skippingStep = `bash -c 'echo "ok 1 - a # SKIP Database not available"; echo "# skipped 3"; exit 0'`;

  test("Given a database URL, when a no-skips step skips tests, then the run fails and says how to fix it", () => {
    const r = withHelpers(
      `run_test_command --no-skips-when-db-configured "integration" ${skippingStep} || true; print_summary`,
      { PORTAL_DATABASE_URL: "mysql://root:x@127.0.0.1:3307/sfggc_portal" }
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /skipped/i);
    assert.match(r.stdout, /docker-db\.sh/, "the message should say how to start the database");
  });

  test("Given no database URL, when a no-skips step skips tests, then the run still passes (skipping is legitimate)", () => {
    const r = withHelpers(`run_test_command --no-skips-when-db-configured "integration" ${skippingStep}; print_summary`);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /All tests passed/);
  });

  test("Given a database URL, when an ordinary step skips tests, then the run still passes", () => {
    const r = withHelpers(`run_test_command "backend" ${skippingStep}; print_summary`, {
      PORTAL_DATABASE_URL: "mysql://root:x@127.0.0.1:3307/sfggc_portal",
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });

  test("Given a database URL, when a no-skips step skips nothing, then it passes", () => {
    const r = withHelpers(
      `run_test_command --no-skips-when-db-configured "integration" bash -c 'echo "# skipped 0"'; print_summary`,
      { PORTAL_DATABASE_URL: "mysql://root:x@127.0.0.1:3307/sfggc_portal" }
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

describe("runner scripts propagate failures", () => {
  /** Runs a script from scripts/test with stub `node`/`npm` first on PATH that exit with `code`. */
  const runScript = (script, code) => {
    const dir = tempDir();
    for (const bin of ["node", "npm"]) fs.writeFileSync(path.join(dir, bin), `#!/bin/bash\necho "stub ${bin} failing quietly"\nexit ${code}\n`, { mode: 0o755 });
    return spawnSync("bash", [path.join(ROOT, "scripts/test", script)], {
      cwd: ROOT,
      encoding: "utf-8",
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, PORTAL_DATABASE_URL: "", PORTAL_TEST_DATABASE_URL: "" },
    });
  };

  for (const script of ["test-frontend.sh", "test-backend.sh", "test-all.sh"]) {
    test(`Given ${script}, when its test command crashes without a TAP failure, then the script exits non-zero`, () => {
      const r = runScript(script, 4);
      assert.notEqual(r.status, 0, `${script} reported success after a crash:\n${r.stdout}`);
      assert.doesNotMatch(r.stdout, /All tests passed/);
    });
  }
});

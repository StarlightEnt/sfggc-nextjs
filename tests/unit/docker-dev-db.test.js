const { describe, test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

/**
 * BDD tests for the Docker-based dev database: scripts/dev/docker-db.sh and the mysql shim that
 * lets the existing init/migration scripts talk to the container.
 *
 * Behavioral tests run the scripts against a fake `docker` binary that can simulate each state
 * (daemon down, container or volume present), so they need neither Docker nor a database. They run
 * under /bin/bash when it exists: that is bash 3.2 on macOS, the oldest shell the script must support.
 */

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(ROOT, "scripts/dev/docker-db.sh");
const SHIM = path.join(ROOT, "scripts/dev/docker/mysql");
const BASH = fs.existsSync("/bin/bash") ? "/bin/bash" : "bash";
const read = (p) => fs.readFileSync(p, "utf-8");
const isExecutable = (p) => (fs.statSync(p).mode & fs.constants.S_IXUSR) !== 0;

const tempDirs = [];
after(() => tempDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

/**
 * A temp dir holding a fake `docker` that logs every call and answers from FAKE_* variables:
 *   FAKE_DAEMON_DOWN, FAKE_VOLUME_EXISTS, FAKE_CONTAINER_EXISTS, FAKE_CONTAINER_RUNNING.
 */
const fakeDocker = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-docker-"));
  tempDirs.push(dir);
  const log = path.join(dir, "calls.log");
  fs.writeFileSync(
    path.join(dir, "docker"),
    `#!/bin/bash
suffix=""
[ -n "\${MARIADB_ROOT_PASSWORD:-}" ] && suffix=" [pw=\${MARIADB_ROOT_PASSWORD}]"
echo "$*$suffix" >> "${log}"
case "$1" in
  info) [ -n "\${FAKE_DAEMON_DOWN:-}" ] && exit 1 ;;
  volume) [ "$2" = inspect ] && { [ -n "\${FAKE_VOLUME_EXISTS:-}" ] && exit 0 || exit 1; } ;;
  ps)
    case "$*" in
      *" -a "*) [ -n "\${FAKE_CONTAINER_EXISTS:-}" ] && echo "sfggc-dev-mariadb" ;;
      *) [ -n "\${FAKE_CONTAINER_RUNNING:-}" ] && echo "sfggc-dev-mariadb" ;;
    esac ;;
esac
exit 0
`,
    { mode: 0o755 }
  );
  return { dir, log, calls: () => (fs.existsSync(log) ? read(log).trim().split("\n") : []) };
};

const run = (fake, args, { env = {}, envFile } = {}) =>
  spawnSync(BASH, [SCRIPT, ...args], {
    encoding: "utf-8",
    env: {
      ...process.env,
      PATH: `${fake.dir}:${process.env.PATH}`,
      SFGGC_ENV_FILE: envFile ?? path.join(fake.dir, ".env.local"),
      ...env,
    },
  });

const passwordIn = (envFile) => read(envFile).match(/PORTAL_DATABASE_URL=mysql:\/\/root:([0-9a-f]+)@/)[1];

describe("docker-db.sh", () => {
  test("Given the Docker dev DB files, when checking metadata, then the script and the mysql shim exist and are executable", () => {
    for (const file of [SCRIPT, SHIM]) {
      assert.ok(fs.existsSync(file), `${file} must exist`);
      assert.ok(isExecutable(file), `${file} must be executable`);
    }
  });

  test("Given the script source, when checking portability, then it avoids bash 4 features", () => {
    const source = read(SCRIPT);
    assert.match(source, /set -euo pipefail/);
    for (const banned of [/declare -A/, /\bmapfile\b/, /\breadarray\b/, /\$\{[a-z_]+,,\}/i]) {
      assert.doesNotMatch(source, banned);
    }
  });

  test("Given no command, a help request, or an unknown command, when run, then help prints and only the unknown command fails", () => {
    const fake = fakeDocker();
    for (const args of [[], ["help"]]) {
      const result = run(fake, args);
      assert.equal(result.status, 0, result.stderr);
      for (const cmd of ["up", "init", "down", "status", "shell", "reset"]) assert.match(result.stdout, new RegExp(`\\b${cmd}\\b`));
    }
    assert.notEqual(run(fake, ["frobnicate"]).status, 0);
  });

  test("Given no env file, when running up, then it creates a localhost-bound container with a persistent volume and a private env file", () => {
    const fake = fakeDocker();
    const envFile = path.join(fake.dir, ".env.local");
    const result = run(fake, ["up"]);
    assert.equal(result.status, 0, result.stderr);

    const runCall = fake.calls().find((c) => c.startsWith("run "));
    assert.ok(runCall, "docker run must be called");
    assert.match(runCall, /127\.0\.0\.1:3307:3306/);
    assert.match(runCall, /-v sfggc-dev-mariadb-data:\/var\/lib\/mysql/);
    assert.match(runCall, /MARIADB_DATABASE=sfggc_portal/);

    const env = read(envFile);
    assert.match(env, /^PORTAL_DATABASE_URL=mysql:\/\/root:[0-9a-f]{32}@127\.0\.0\.1:3307\/sfggc_portal$/m);
    assert.match(env, /^ADMIN_SESSION_SECRET=[0-9a-f]{64}$/m);
    assert.equal(fs.statSync(envFile).mode & 0o777, 0o600, "the env file holds a password and must be owner-only");
  });

  test("Given a generated password, when running up, then it reaches Docker through the environment and is never printed", () => {
    const fake = fakeDocker();
    const result = run(fake, ["up"]);
    const password = passwordIn(path.join(fake.dir, ".env.local"));
    const runCall = fake.calls().find((c) => c.startsWith("run "));
    assert.ok(runCall.includes(`[pw=${password}]`), "the password must be passed via the environment");
    assert.doesNotMatch(runCall.replace(/\[pw=[^\]]*\]$/, ""), new RegExp(password), "the password must not appear on the command line");
    assert.ok(!(result.stdout + result.stderr).includes(password), "the password must never be printed");
  });

  test("Given an existing env file with this container's settings, when running up again, then the file is left untouched and its password is reused", () => {
    const fake = fakeDocker();
    const envFile = path.join(fake.dir, ".env.local");
    const existing = "PORTAL_DATABASE_URL=mysql://root:abc123abc123abc123abc123abc123ab@127.0.0.1:3307/sfggc_portal\nADMIN_SESSION_SECRET=keepme\nCUSTOM=1\n";
    fs.writeFileSync(envFile, existing);
    const result = run(fake, ["up"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(read(envFile), existing);
    assert.match(fake.calls().find((c) => c.startsWith("run ")), /\[pw=abc123abc123abc123abc123abc123ab\]/);
  });

  test("Given an env file without a trailing newline or database settings, when running up, then settings are appended on their own line and the file is made private", () => {
    const fake = fakeDocker();
    const envFile = path.join(fake.dir, ".env.local");
    fs.writeFileSync(envFile, "CUSTOM=1", { mode: 0o644 });
    const result = run(fake, ["up"]);
    assert.equal(result.status, 0, result.stderr);
    const env = read(envFile);
    assert.ok(env.startsWith("CUSTOM=1\nPORTAL_DATABASE_URL="), "existing content must stay intact on its own line");
    assert.equal(fs.statSync(envFile).mode & 0o777, 0o600);
  });

  test("Given a developer who commented out their old database URL, when running up, then a Docker URL is added and every other setting is kept", () => {
    const fake = fakeDocker();
    const envFile = path.join(fake.dir, ".env.local");
    const existing = "# PORTAL_DATABASE_URL=mysql://root@localhost:3306/sfggc_portal_dev\nADMIN_SESSION_SECRET=keepme\nSMTP_HOST=smtp.example.test\n";
    fs.writeFileSync(envFile, existing);
    const result = run(fake, ["up"]);
    assert.equal(result.status, 0, result.stderr);
    const env = read(envFile);
    assert.ok(env.startsWith(existing), "the existing lines must be untouched");
    assert.match(env, /^PORTAL_DATABASE_URL=mysql:\/\/root:[0-9a-f]{32}@127\.0\.0\.1:3307\//m);
    assert.equal((env.match(/^ADMIN_SESSION_SECRET=/gm) || []).length, 1, "the existing session secret must be reused, not duplicated");
  });

  test("Given an env file that points at another database, when running up, then it refuses and changes nothing", () => {
    const fake = fakeDocker();
    const envFile = path.join(fake.dir, ".env.local");
    const existing = "PORTAL_DATABASE_URL=mysql://root@localhost:3306/sfggc_portal_dev\n";
    fs.writeFileSync(envFile, existing);
    const result = run(fake, ["up"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not point at/);
    assert.equal(read(envFile), existing);
    assert.ok(!fake.calls().some((c) => c.startsWith("run ")), "no container may be created");
  });

  test("Given a data volume that outlived the env file, when running up, then it explains the situation instead of waiting for a database that will reject the new password", () => {
    const fake = fakeDocker();
    const result = run(fake, ["up"], { env: { FAKE_VOLUME_EXISTS: "1" } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /reset --yes/);
    assert.ok(!fake.calls().some((c) => c.startsWith("run ")));
    assert.ok(!fs.existsSync(path.join(fake.dir, ".env.local")), "no new password may be written");
  });

  test("Given Docker is not running, when running up, then it says so before doing anything else", () => {
    const fake = fakeDocker();
    const result = run(fake, ["up"], { env: { FAKE_DAEMON_DOWN: "1" } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /daemon is not running/i);
    assert.ok(!fake.calls().some((c) => c.startsWith("run ")));
  });

  test("Given the reset command, when run without --yes, then it refuses and removes nothing", () => {
    const fake = fakeDocker();
    const result = run(fake, ["reset"]);
    assert.notEqual(result.status, 0);
    assert.ok(!fake.calls().some((c) => /^(rm|volume rm)/.test(c)));
  });

  test("Given the reset command, when run with --yes, then the container and its data volume are removed", () => {
    const fake = fakeDocker();
    assert.equal(run(fake, ["reset", "--yes"]).status, 0);
    assert.ok(fake.calls().some((c) => /^rm -f sfggc-dev-mariadb/.test(c)));
    assert.ok(fake.calls().some((c) => /^volume rm sfggc-dev-mariadb-data/.test(c)));
  });

  test("Given the init command, when it runs the repo's init script, then the mysql shim comes first on PATH and the database URL is exported", () => {
    const fake = fakeDocker();
    const marker = path.join(fake.dir, "init-saw.txt");
    const stub = path.join(fake.dir, "stub-init.sh");
    fs.writeFileSync(stub, `#!/bin/bash\n{ echo "PATH0=\${PATH%%:*}"; echo "URL=$PORTAL_DATABASE_URL"; } > "${marker}"\n`, { mode: 0o755 });
    const result = run(fake, ["init"], { env: { SFGGC_INIT_SCRIPT: stub } });
    assert.equal(result.status, 0, result.stderr);
    const saw = read(marker);
    assert.match(saw, new RegExp(`PATH0=${path.join(ROOT, "scripts/dev/docker").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
    assert.match(saw, /URL=mysql:\/\/root:[0-9a-f]{32}@127\.0\.0\.1:3307\/sfggc_portal/);
  });
});

describe("docker mysql shim", () => {
  const callShim = (fake, args, env = {}) => {
    fs.rmSync(fake.log, { force: true });
    const r = spawnSync(BASH, [SHIM, ...args], {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${fake.dir}:${process.env.PATH}`, MYSQL_PWD: "secret", ...env },
    });
    assert.equal(r.status, 0, r.stderr);
    return fake.calls()[0];
  };

  test("Given repo scripts calling mysql with host, port, protocol, socket and user flags, when run via the shim, then only database arguments reach the container client as root", () => {
    const fake = fakeDocker();
    const tcp = callShim(fake, ["--protocol=tcp", "-h", "127.0.0.1", "-P", "3307", "-u", "root", "-N", "-s", "sfggc_portal"]);
    assert.match(tcp, /^exec -i -e MYSQL_PWD sfggc-dev-mariadb mariadb -uroot -N -s sfggc_portal$/);
    const socket = callShim(fake, ["--socket", "/tmp/mysql.sock", "-u", "someuser", "sfggc_portal"]);
    assert.match(socket, /^exec -i -e MYSQL_PWD sfggc-dev-mariadb mariadb -uroot sfggc_portal$/);
    const spaced = callShim(fake, ["--protocol", "tcp", "-hlocalhost", "sfggc_portal"]);
    assert.match(spaced, /^exec -i -e MYSQL_PWD sfggc-dev-mariadb mariadb -uroot sfggc_portal$/);
  });

  test("Given a custom container name, when set in the environment, then the shim targets that container", () => {
    const fake = fakeDocker();
    assert.match(callShim(fake, ["-e", "select 1"], { SFGGC_DOCKER_DB_NAME: "my-db" }), /my-db mariadb/);
  });
});

describe("secrets hygiene", () => {
  test("Given the tracked env example, when read, then it carries no AWS key IDs or production database hosts", () => {
    const example = read(path.join(ROOT, "portal_docs/.env.portal.example"));
    assert.doesNotMatch(example, /AKIA[0-9A-Z]{12,}/);
    assert.doesNotMatch(example, /rds\.amazonaws\.com/);
  });

  test("Given the generated .env.local holds a password, when checking git, then the file is ignored", () => {
    const result = spawnSync("git", ["check-ignore", "-q", ".env.local"], { cwd: ROOT });
    assert.equal(result.status, 0, ".env.local must be listed in .gitignore");
  });
});

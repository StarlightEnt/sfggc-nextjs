const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

/**
 * BDD tests for the Docker-based dev database: scripts/dev/docker-db.sh and the
 * mysql shim that lets the existing init/migration scripts talk to the container.
 * Behavioral tests run the scripts against a fake `docker` binary, so they need
 * neither Docker nor a database.
 */

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts/dev/docker-db.sh");
const SHIM = path.join(ROOT, "scripts/dev/docker/mysql");
const read = (p) => fs.readFileSync(p, "utf-8");
const isExecutable = (p) => (fs.statSync(p).mode & fs.constants.S_IXUSR) !== 0;

/** Creates a temp dir holding a fake `docker` that logs every call; returns helpers. */
const fakeDocker = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-docker-"));
  const log = path.join(dir, "calls.log");
  fs.writeFileSync(
    path.join(dir, "docker"),
    `#!/usr/bin/env bash\nsuffix=""\n[ -n "\${MARIADB_ROOT_PASSWORD:-}" ] && suffix=" [pw=\${MARIADB_ROOT_PASSWORD}]"\necho "$*$suffix" >> "${log}"\nexit 0\n`,
    { mode: 0o755 }
  );
  return { dir, log, calls: () => (fs.existsSync(log) ? read(log).trim().split("\n") : []) };
};

describe("docker-db.sh", () => {
  test("Given the Docker dev DB files, when checking metadata, then the script and the mysql shim exist and are executable", () => {
    for (const file of [SCRIPT, SHIM]) {
      assert.ok(fs.existsSync(file), `${file} must exist`);
      assert.ok(isExecutable(file), `${file} must be executable`);
    }
  });

  test("Given the script source, when checking portability, then it avoids bash 4 features so it runs on stock macOS bash", () => {
    const source = read(SCRIPT);
    assert.match(source, /set -euo pipefail/);
    for (const banned of [/declare -A/, /\bmapfile\b/, /\breadarray\b/, /\$\{[a-z_]+,,\}/i]) {
      assert.doesNotMatch(source, banned);
    }
  });

  test("Given the container is published, when checking the port mapping, then it binds to 127.0.0.1 only", () => {
    const source = read(SCRIPT);
    assert.match(source, /-p "?127\.0\.0\.1:/);
    assert.doesNotMatch(source, /0\.0\.0\.0/);
  });

  test("Given the script, when run with no command or an unknown command, then it prints usage and the unknown command fails", () => {
    const help = spawnSync("bash", [SCRIPT, "help"], { encoding: "utf-8" });
    assert.equal(help.status, 0);
    for (const cmd of ["up", "init", "down", "status", "shell", "reset"]) {
      assert.match(help.stdout, new RegExp(`\\b${cmd}\\b`));
    }
    const bad = spawnSync("bash", [SCRIPT, "frobnicate"], { encoding: "utf-8" });
    assert.notEqual(bad.status, 0);
  });

  test("Given no env file, when running up, then it starts a localhost-bound container and writes a gitignored-style env file with a generated password", () => {
    const fake = fakeDocker();
    const envFile = path.join(fake.dir, ".env.local");
    const result = spawnSync("bash", [SCRIPT, "up"], {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${fake.dir}:${process.env.PATH}`, SFGGC_ENV_FILE: envFile },
    });
    assert.equal(result.status, 0, result.stderr);
    const run = fake.calls().find((c) => c.startsWith("run "));
    assert.ok(run, "docker run must be called");
    assert.match(run, /127\.0\.0\.1:3307:3306/);
    assert.match(run, /MARIADB_DATABASE=sfggc_portal/);
    assert.doesNotMatch(run, /MARIADB_ROOT_PASSWORD=/, "the password must come from the environment, not argv");
    assert.match(run, /-e MARIADB_ROOT_PASSWORD\b/);
    assert.match(run, /-v sfggc-dev-mariadb-data:\/var\/lib\/mysql/, "data survives down/up");
    const env = read(envFile);
    assert.match(env, /^PORTAL_DATABASE_URL=mysql:\/\/root:[0-9a-f]{32}@127\.0\.0\.1:3307\/sfggc_portal$/m);
    assert.match(env, /^ADMIN_SESSION_SECRET=[0-9a-f]{64}$/m);
    assert.doesNotMatch(result.stdout + result.stderr, /[0-9a-f]{32}/, "the password must never be printed");
  });

  test("Given an existing env file, when running up again, then the file is left untouched and its password is reused", () => {
    const fake = fakeDocker();
    const envFile = path.join(fake.dir, ".env.local");
    const existing = "PORTAL_DATABASE_URL=mysql://root:abc123abc123abc123abc123abc123ab@127.0.0.1:3307/sfggc_portal\nADMIN_SESSION_SECRET=keepme\nCUSTOM=1\n";
    fs.writeFileSync(envFile, existing);
    const result = spawnSync("bash", [SCRIPT, "up"], {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${fake.dir}:${process.env.PATH}`, SFGGC_ENV_FILE: envFile },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(read(envFile), existing);
    assert.match(fake.calls().find((c) => c.startsWith("run ")), /\[pw=abc123abc123abc123abc123abc123ab\]/);
  });

  test("Given an env file that points at another database, when running up, then it refuses and changes nothing", () => {
    const fake = fakeDocker();
    const envFile = path.join(fake.dir, ".env.local");
    const existing = "PORTAL_DATABASE_URL=mysql://root@localhost:3306/sfggc_portal_dev\n";
    fs.writeFileSync(envFile, existing);
    const result = spawnSync("bash", [SCRIPT, "up"], {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${fake.dir}:${process.env.PATH}`, SFGGC_ENV_FILE: envFile },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not point at/);
    assert.equal(read(envFile), existing);
    assert.ok(!fake.calls().some((c) => c.startsWith("run ")), "no container may be created");
  });

  test("Given the reset command, when run without --yes, then it refuses and removes nothing", () => {
    const fake = fakeDocker();
    const result = spawnSync("bash", [SCRIPT, "reset"], {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${fake.dir}:${process.env.PATH}`, SFGGC_ENV_FILE: path.join(fake.dir, ".env.local") },
    });
    assert.notEqual(result.status, 0);
    assert.ok(!fake.calls().some((c) => /^(rm|volume rm)/.test(c)), "nothing may be removed without --yes");
  });

  test("Given the init command, when checking source, then it runs the existing init script with the shim first on PATH", () => {
    const source = read(SCRIPT);
    assert.match(source, /scripts\/dev\/docker|\$SCRIPT_DIR\/docker/);
    assert.match(source, /init-portal-db\.sh/);
    assert.match(source, /PATH=.*docker.*:\$PATH|PATH="[^"]*docker[^"]*:\$PATH"/);
  });
});

describe("docker mysql shim", () => {
  test("Given repo scripts calling mysql with host, port, socket and user flags, when run via the shim, then only database arguments reach the container client as root", () => {
    const fake = fakeDocker();
    const run = (args) => {
      fs.rmSync(fake.log, { force: true });
      const r = spawnSync("bash", [SHIM, ...args], {
        encoding: "utf-8",
        env: { ...process.env, PATH: `${fake.dir}:${process.env.PATH}`, MYSQL_PWD: "secret" },
      });
      assert.equal(r.status, 0, r.stderr);
      return fake.calls()[0];
    };
    const tcp = run(["--protocol=tcp", "-h", "127.0.0.1", "-P", "3307", "-u", "root", "-N", "-s", "sfggc_portal"]);
    assert.match(tcp, /^exec -i -e MYSQL_PWD sfggc-dev-mariadb mariadb -uroot -N -s sfggc_portal$/);
    const socket = run(["--socket", "/tmp/mysql.sock", "-u", "someuser", "sfggc_portal"]);
    assert.match(socket, /^exec -i -e MYSQL_PWD sfggc-dev-mariadb mariadb -uroot sfggc_portal$/);
  });

  test("Given a custom container name, when set in the environment, then the shim targets that container", () => {
    const fake = fakeDocker();
    spawnSync("bash", [SHIM, "-e", "select 1"], {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${fake.dir}:${process.env.PATH}`, SFGGC_DOCKER_DB_NAME: "my-db" },
    });
    assert.match(fake.calls()[0], /my-db mariadb/);
  });
});

describe("env example and docs", () => {
  test("Given the tracked env example, when read, then it carries no real credentials or production hosts", () => {
    const example = read(path.join(ROOT, "portal_docs/.env.portal.example"));
    assert.doesNotMatch(example, /AKIA[0-9A-Z]{12,}/, "no AWS access key IDs in a tracked file");
    assert.doesNotMatch(example, /rds\.amazonaws\.com/, "no production database host in a tracked file");
  });

  test("Given the tracked env example, when read, then its local block shows the Docker URL with a placeholder password", () => {
    const example = read(path.join(ROOT, "portal_docs/.env.portal.example"));
    assert.match(example, /docker-db\.sh/);
    assert.match(example, /mysql:\/\/root:<[^>]+>@127\.0\.0\.1:3307\/sfggc_portal/);
  });

  test("Given the human docs, when read, then every dev-setup guide mentions the Docker script and the layout doc lists it", () => {
    for (const doc of ["portal_docs/README.md", "portal_docs/portal_layout.md"]) {
      assert.match(read(path.join(ROOT, doc)), /docker-db\.sh/, `${doc} must mention docker-db.sh`);
    }
  });

  test("Given the top-level README, when describing the design, then it describes the dark-only theme instead of color modes", () => {
    const readme = read(path.join(ROOT, "README.md"));
    assert.match(readme, /dark/i);
    assert.match(readme, /sflgbtbowl\.com/);
    assert.doesNotMatch(readme, /implementation of color modes/i);
  });

  test("Given the setup docs, when read, then Docker is the recommended dev database and Homebrew stays documented", () => {
    for (const doc of ["portal_docs/PORTAL_SETUP.md", "CLAUDE.md"]) {
      const text = read(path.join(ROOT, doc));
      assert.match(text, /scripts\/dev\/docker-db\.sh/, `${doc} must mention docker-db.sh`);
    }
    assert.match(read(path.join(ROOT, "portal_docs/PORTAL_SETUP.md")), /install-mariadb-macos\.sh/);
  });
});

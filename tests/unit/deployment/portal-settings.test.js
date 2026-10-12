const { test, describe, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

/**
 * BDD tests for the deploy configuration: no cloud-provider endpoints or credentials are baked in
 * as defaults, and first-time server setup stops with a clear message when the database host or
 * SMTP settings were not provided, instead of writing blank values to the server's .env.local.
 *
 * The shell functions are exercised for real (sourced and called), with the SSH layer stubbed.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const LIB = path.join(ROOT, "deploy_scripts/lib");

const tempDirs = [];
after(() => tempDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

/** Runs a bash snippet with the deploy libraries sourced; deploy-related env vars cleared first. */
const deploySh = (snippet, env = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-"));
  tempDirs.push(dir);
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("DEPLOY_")));
  const result = spawnSync(
    "bash",
    ["-c", `source "${LIB}/output.sh"; source "${LIB}/config.sh"; source "${LIB}/deploy-app.sh"; ${snippet}`],
    { cwd: ROOT, encoding: "utf-8", input: "", env: { ...clean, SSH_LOG: path.join(dir, "ssh.log"), ...env } }
  );
  return { ...result, sshCalls: fs.existsSync(path.join(dir, "ssh.log")) ? fs.readFileSync(path.join(dir, "ssh.log"), "utf-8") : "" };
};

const PROVIDED = { DEPLOY_DB_HOST: "db.internal.test", DEPLOY_SMTP_HOST: "smtp.internal.test", DEPLOY_SMTP_USER: "mailer" };

describe("deploy defaults", () => {
  test("Given nothing configured, when defaults are applied, then no database host, SMTP host or SMTP user is assumed", () => {
    const r = deploySh(`set_defaults; echo "db=[\${DEPLOY_DB_HOST}] smtp=[\${DEPLOY_SMTP_HOST}] user=[\${DEPLOY_SMTP_USER}]"`);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /db=\[\] smtp=\[\] user=\[\]/);
  });

  test("Given nothing configured, when defaults are applied, then the provider-neutral defaults are unchanged", () => {
    const r = deploySh(
      `set_defaults; echo "port=\${DEPLOY_DB_PORT} name=\${DEPLOY_DB_NAME} user=\${DEPLOY_DB_USER} smtpport=\${DEPLOY_SMTP_PORT} from=\${DEPLOY_SMTP_FROM}"`
    );
    assert.match(r.stdout, /port=3306 name=goldengate user=goldengate smtpport=587 from=Golden Gate Classic <noreply@goldengateclassic\.org>/);
  });

  test("Given settings in the environment, when defaults are applied, then they are respected", () => {
    const r = deploySh(`set_defaults; echo "db=\${DEPLOY_DB_HOST} smtp=\${DEPLOY_SMTP_HOST}"`, PROVIDED);
    assert.match(r.stdout, /db=db\.internal\.test smtp=smtp\.internal\.test/);
  });
});

describe("validate_portal_settings", () => {
  test("Given none of the required settings, when validating, then it fails and names each missing variable and where to set it", () => {
    const r = deploySh("set_defaults; validate_portal_settings");
    assert.notEqual(r.status, 0);
    const output = r.stdout + r.stderr;
    for (const name of ["DEPLOY_DB_HOST", "DEPLOY_SMTP_HOST", "DEPLOY_SMTP_USER"]) assert.match(output, new RegExp(name));
    assert.match(output, /\.deployrc/);
  });

  test("Given all required settings, when validating, then it passes", () => {
    const r = deploySh("set_defaults; validate_portal_settings", PROVIDED);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });

  test("Given only some settings, when validating, then only the missing ones are reported", () => {
    const r = deploySh("set_defaults; validate_portal_settings", { DEPLOY_DB_HOST: "db.internal.test" });
    const output = r.stdout + r.stderr;
    assert.notEqual(r.status, 0);
    assert.doesNotMatch(output, /DEPLOY_DB_HOST/);
    assert.match(output, /DEPLOY_SMTP_HOST/);
  });
});

describe("first-time server setup", () => {
  const STUBS = `check_remote_file_exists() { return 1; }; ssh_command() { echo "$*" >> "$SSH_LOG"; return 0; };`;

  test("Given missing settings, when first-time setup starts, then it stops before contacting the server", () => {
    const r = deploySh(`${STUBS} set_defaults; setup_app_environment`);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /DEPLOY_DB_HOST/);
    assert.equal(r.sshCalls, "", "nothing may be written to the server with blank settings");
  });
});

describe("no provider leftovers", () => {
  const tracked = () =>
    spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf-8" }).stdout.split("\0").filter(Boolean);

  test("Given every tracked text file, when searching for AWS access key IDs, then none exist", () => {
    const hits = [];
    for (const file of tracked()) {
      if (/(^|\/)(node_modules|\.next)\//.test(file) || /\.(png|jpe?g|gif|ico|pdf|woff2?)$/i.test(file)) continue;
      const text = fs.readFileSync(path.join(ROOT, file), "utf-8");
      if (/AKIA[0-9A-Z]{16}/.test(text)) hits.push(file);
    }
    assert.deepEqual(hits, [], "credential-shaped keys never belong in the repository");
  });

  test("Given the deploy scripts, config examples and deploy docs, when searching for cloud endpoints, then no amazonaws.com host remains", () => {
    const scope = (f) =>
      /^deploy_scripts\//.test(f) || /^deploy_docs\//.test(f) || /^backend\/scripts\//.test(f) || /^portal_docs\//.test(f) ||
      [".deployrc.example", "CLAUDE-DEPLOYMENT.md", "SERVER_SETUP.md"].includes(f);
    const hits = tracked()
      .filter(scope)
      .filter((f) => /\.amazonaws\.com/.test(fs.readFileSync(path.join(ROOT, f), "utf-8")));
    assert.deepEqual(hits, [], "set hosts through DEPLOY_* / .env.local instead of hard-coding them");
  });
});

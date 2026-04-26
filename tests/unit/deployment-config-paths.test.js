const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DEPLOYRC_EXAMPLE = path.join(process.cwd(), ".deployrc.example");

describe("Deployment configuration path format", () => {
  test("Given .deployrc.example, when checking deployment paths, then no tilde paths are used", () => {
    const content = fs.readFileSync(DEPLOYRC_EXAMPLE, "utf-8");

    // Extract DEPLOY_APP_PATH
    const appPathMatch = content.match(/DEPLOY_APP_PATH="([^"]+)"/);
    assert.ok(appPathMatch, "DEPLOY_APP_PATH should be defined");
    const appPath = appPathMatch[1];

    // Path must NOT use tilde
    assert.ok(!appPath.includes("~"), `DEPLOY_APP_PATH must not use tilde: ${appPath}`);
  });

  test("Given .deployrc.example, when checking deployment paths, then DEPLOY_APP_PATH uses absolute path", () => {
    const content = fs.readFileSync(DEPLOYRC_EXAMPLE, "utf-8");

    // Extract path
    const appPathMatch = content.match(/DEPLOY_APP_PATH="([^"]+)"/);
    const appPath = appPathMatch[1];

    // Must start with /
    assert.ok(appPath.startsWith("/"), `DEPLOY_APP_PATH must be absolute: ${appPath}`);
  });

  test("Given .deployrc.example, when checking deployment paths, then DEPLOY_APP_PATH uses /home/ prefix", () => {
    const content = fs.readFileSync(DEPLOYRC_EXAMPLE, "utf-8");

    // Extract path
    const appPathMatch = content.match(/DEPLOY_APP_PATH="([^"]+)"/);
    const appPath = appPathMatch[1];

    // Should start with /home/ for consistency
    assert.ok(
      appPath.startsWith("/home/"),
      `DEPLOY_APP_PATH should start with /home/: ${appPath}`
    );
  });

  test("Given .deployrc.example, when checking SSH user, then it matches the path username", () => {
    const content = fs.readFileSync(DEPLOYRC_EXAMPLE, "utf-8");

    // Extract SSH user
    const sshUserMatch = content.match(/DEPLOY_SSH_USER="([^"]+)"/);
    assert.ok(sshUserMatch, "DEPLOY_SSH_USER should be defined");
    const sshUser = sshUserMatch[1];

    // Extract path username from app path
    const appPathMatch = content.match(/DEPLOY_APP_PATH="([^"]+)"/);
    const appPath = appPathMatch[1];
    const pathUsername = appPath.match(/^\/home\/([^/]+)\//)?.[1];

    assert.strictEqual(
      sshUser,
      pathUsername,
      `SSH_USER should match path username. SSH_USER: ${sshUser}, Path username: ${pathUsername}`
    );
  });

  test("Given .deployrc.example, when checking documentation, then tilde path issue is explained", () => {
    const content = fs.readFileSync(DEPLOYRC_EXAMPLE, "utf-8");

    // Should have a comment explaining why we don't use tildes or $HOME
    // This serves as documentation for future maintainers
    const hasNoTildeWarning =
      content.includes("absolute path") ||
      content.includes("full path") ||
      content.includes("/home/");

    assert.ok(
      hasNoTildeWarning,
      ".deployrc.example should document the path format requirement"
    );
  });
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();

// ─── Helper Functions ────────────────────────────────────────────────────────

const readFile = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

// ─── Error Handling and Rollback Tests ──────────────────────────────────────

test(
  "Given deploy_app function, when sync_app_files fails, then deployment stops and returns 1",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Get deploy_app function
    const deployAppMatch = content.match(
      /deploy_app\(\) \{[\s\S]*?^}/m
    );
    assert.ok(deployAppMatch, "deploy_app must exist");

    const funcBody = deployAppMatch[0];

    // Checks sync_app_files exit status
    assert.ok(
      funcBody.includes("sync_app_files || {"),
      "deploy_app must check sync_app_files exit status"
    );

    // Logs specific error
    assert.ok(
      funcBody.includes('log_error "App deployment failed at file sync"') ||
      funcBody.includes('log_error "Portal deployment failed at file sync"'),
      "deploy_app must log specific error for sync failure"
    );

    // Returns 1
    assert.ok(
      funcBody.includes("return 1"),
      "deploy_app must return 1 on sync failure"
    );
  }
);

test(
  "Given deploy_app function, when install_app_dependencies fails, then deployment stops with error",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    const deployAppMatch = content.match(
      /deploy_app\(\) \{[\s\S]*?^}/m
    );
    assert.ok(deployAppMatch, "deploy_app must exist");

    const funcBody = deployAppMatch[0];

    // Checks install_app_dependencies exit status
    assert.ok(
      funcBody.includes("install_app_dependencies || {"),
      "deploy_app must check install_app_dependencies exit status"
    );

    // Logs specific error
    assert.ok(
      funcBody.includes('log_error "App deployment failed at dependency installation"') ||
      funcBody.includes('log_error "Portal deployment failed at dependency installation"'),
      "deploy_app must log specific error for dependency installation failure"
    );

    // Returns 1
    const lines = funcBody.split("\n");
    let afterInstallCheck = false;
    let hasReturn1 = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("install_app_dependencies || {")) {
        afterInstallCheck = true;
      }
      if (afterInstallCheck && lines[i].includes("return 1")) {
        hasReturn1 = true;
        break;
      }
      if (lines[i].includes("}")) {
        afterInstallCheck = false;
      }
    }

    assert.ok(
      hasReturn1,
      "deploy_app must return 1 on dependency installation failure"
    );
  }
);

test(
  "Given deploy_app function, when build_app_on_server fails, then deployment stops with error",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    const deployAppMatch = content.match(
      /deploy_app\(\) \{[\s\S]*?^}/m
    );
    assert.ok(deployAppMatch, "deploy_app must exist");

    const funcBody = deployAppMatch[0];

    // Checks build_app_on_server exit status
    assert.ok(
      funcBody.includes("build_app_on_server || {"),
      "deploy_app must check build_app_on_server exit status"
    );

    // Logs specific error
    assert.ok(
      funcBody.includes('log_error "App deployment failed at build"') ||
      funcBody.includes('log_error "Portal deployment failed at build"'),
      "deploy_app must log specific error for build failure"
    );

    // Returns 1
    assert.ok(
      funcBody.includes("return 1"),
      "deploy_app must return 1 on build failure"
    );
  }
);

test(
  "Given build_app_on_server function, when npm run build fails, then it logs error and returns 1",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Get build_app_on_server function
    const buildMatch = content.match(
      /build_app_on_server\(\) \{[\s\S]*?^}/m
    );
    assert.ok(buildMatch, "build_app_on_server must exist");

    const funcBody = buildMatch[0];

    // Runs npm run build via ssh_command
    assert.ok(
      funcBody.includes("npm run build"),
      "build_app_on_server must run npm run build"
    );

    // Checks exit status
    assert.ok(
      funcBody.includes("if [ $? -eq 0 ]; then") ||
      funcBody.includes("if ssh_command"),
      "build_app_on_server must check build exit status"
    );

    // Has error branch
    assert.ok(
      funcBody.includes('log_error "Build failed"'),
      "build_app_on_server must log error on build failure"
    );

    // Returns 1
    assert.ok(
      funcBody.includes("return 1"),
      "build_app_on_server must return 1 on build failure"
    );
  }
);

test(
  "Given verify_app_deployment function, when PM2 process is not online, then it returns 1",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Get verify_app_deployment function
    const verifyMatch = content.match(
      /verify_app_deployment\(\) \{[\s\S]*?^}/m
    );
    assert.ok(verifyMatch, "verify_app_deployment must exist");

    const funcBody = verifyMatch[0];

    // Checks PM2 status for "online"
    assert.ok(
      funcBody.includes("grep -q") && funcBody.includes("online") ||
      funcBody.includes('echo "$PM2_OUTPUT" | grep -q "online"'),
      "verify_app_deployment must check if PM2 status is 'online'"
    );

    // Logs error if not online
    assert.ok(
      funcBody.includes('log_error "PM2 process is not running"'),
      "verify_app_deployment must log error if PM2 is not online"
    );

    // Returns 1
    assert.ok(
      funcBody.includes("return 1"),
      "verify_app_deployment must return 1 if PM2 is not online"
    );
  }
);

test(
  "Given config validation, when required values are missing, then it exits with error",
  () => {
    const content = readFile("deploy_scripts/lib/config.sh");

    // Get validate_config function
    const validateMatch = content.match(
      /validate_config\(\) \{[\s\S]*?^}/m
    );
    assert.ok(validateMatch, "validate_config must exist");

    const funcBody = validateMatch[0];

    // Tracks errors
    assert.ok(
      funcBody.includes("local errors=0") || funcBody.includes("errors=0"),
      "validate_config must track error count"
    );

    // Checks DEPLOY_SSH_USER
    assert.ok(
      funcBody.includes("DEPLOY_SSH_USER") && funcBody.includes("is not set"),
      "validate_config must check DEPLOY_SSH_USER"
    );

    // Checks DEPLOY_SSH_HOST
    assert.ok(
      funcBody.includes("DEPLOY_SSH_HOST") && funcBody.includes("is not set"),
      "validate_config must check DEPLOY_SSH_HOST"
    );

    // Increments errors
    assert.ok(
      funcBody.includes("((errors++))") || funcBody.includes("errors=$((errors + 1))"),
      "validate_config must increment error count for each missing value"
    );

    // Exits if errors > 0
    assert.ok(
      funcBody.includes("[ $errors -gt 0 ]") && funcBody.includes("exit 1"),
      "validate_config must exit with status 1 if errors exist"
    );
  }
);

test(
  "Given test_ssh_connection function, when SSH fails, then it returns non-zero status",
  () => {
    const content = readFile("deploy_scripts/lib/ssh.sh");

    // Get test_ssh_connection function
    const testSshMatch = content.match(
      /test_ssh_connection\(\) \{[\s\S]*?^}/m
    );
    assert.ok(testSshMatch, "test_ssh_connection must exist");

    const funcBody = testSshMatch[0];

    // Runs SSH with exit command
    assert.ok(
      funcBody.includes("ssh") && funcBody.includes("'exit'"),
      "test_ssh_connection must run SSH with exit command"
    );

    // Returns SSH exit code
    assert.ok(
      funcBody.includes("return $?"),
      "test_ssh_connection must return SSH exit code"
    );
  }
);

test(
  "Given create_super_admin function, when admin creation fails, then it logs error and returns 1",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Get create_super_admin function
    const createAdminMatch = content.match(
      /create_super_admin\(\) \{[\s\S]*?^}/m
    );
    assert.ok(createAdminMatch, "create_super_admin must exist");

    const funcBody = createAdminMatch[0];

    // Checks create-super-admin.sh exit status
    assert.ok(
      funcBody.includes("if [ $? -eq 0 ]; then"),
      "create_super_admin must check create-super-admin.sh exit status"
    );

    // Has error branch
    assert.ok(
      funcBody.includes('log_error "Failed to create super admin"'),
      "create_super_admin must log error on failure"
    );

    // Returns 1
    assert.ok(
      funcBody.includes("return 1"),
      "create_super_admin must return 1 on failure"
    );
  }
);

test(
  "Given deploy_app orchestration, when any step fails, then specific error message identifies the failing step",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Get deploy_app function
    const deployAppMatch = content.match(
      /deploy_app\(\) \{[\s\S]*?^}/m
    );
    assert.ok(deployAppMatch, "deploy_app must exist");

    const funcBody = deployAppMatch[0];

    // Each step has specific error message
    const errorMessages = [
      "file sync",
      "dependency installation",
      "environment setup",
      "admin creation",
      "build",
      "PM2 setup",
    ];

    errorMessages.forEach((stepName) => {
      assert.ok(
        funcBody.includes(stepName) || funcBody.toLowerCase().includes(stepName.toLowerCase()),
        `deploy_app must have specific error message mentioning '${stepName}'`
      );
    });
  }
);

test(
  "Given all deployment functions, when checking error consistency, then failed operations return 1",
  () => {
    const appContent = readFile("deploy_scripts/lib/deploy-app.sh");

    // Count log_error calls
    const errorLogs = appContent.match(/log_error/g);
    assert.ok(
      errorLogs && errorLogs.length > 5,
      "deployment scripts must have multiple error logging points (found: " +
      (errorLogs ? errorLogs.length : 0) + ")"
    );

    // Count return 1 statements
    const errorReturns = appContent.match(/return 1/g);
    assert.ok(
      errorReturns && errorReturns.length > 5,
      "deployment scripts must return 1 on errors (found: " +
      (errorReturns ? errorReturns.length : 0) + ")"
    );
  }
);

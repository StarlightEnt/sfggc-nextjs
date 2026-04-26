const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

const projectRoot = process.cwd();

// ─── Helper Functions ────────────────────────────────────────────────────────

const readFile = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

// ─── Unified App Deployment Tests ────────────────────────────────────────────
//
// These tests describe the TARGET state of the unified deploy system where:
//   - The app is deployed as a single Next.js application (no static export)
//   - "static" and "all" modes are removed
//   - Default deploy mode is "app"
//   - deploy-static.sh and optimize-images.sh are no longer sourced
//   - deploy-app.sh replaces deploy-portal.sh as the primary orchestrator
//
// All tests should FAIL (RED phase) against the current dual-build system.

describe("Unified App Deployment", () => {
  test('Given deploy.sh determine_mode, when no flags provided, then default mode is "app"', () => {
    const content = readFile("deploy_scripts/deploy.sh");

    // Extract determine_mode function body
    const funcMatch = content.match(/determine_mode\(\) \{[\s\S]*?^}/m);
    assert.ok(funcMatch, "determine_mode function must exist");

    const funcBody = funcMatch[0];

    // Default mode should be "app", not "static"
    assert.ok(
      funcBody.includes('echo "app"'),
      'determine_mode must default to echo "app" (not "static")'
    );

    assert.ok(
      !funcBody.includes('echo "static"'),
      'determine_mode must NOT contain echo "static" as default'
    );
  });

  test("Given deploy.sh argument parsing, when --static flag is used, then it shows deprecation error", () => {
    const content = readFile("deploy_scripts/deploy.sh");

    // Extract the --static) case from argument parsing
    const staticCaseMatch = content.match(
      /--static\)[\s\S]*?(?=\n\s*--|\n\s*\*\)|\n\s*esac)/
    );
    assert.ok(staticCaseMatch, "--static case must exist in argument parsing");

    const staticCase = staticCaseMatch[0];

    // Must contain deprecation or error message
    assert.ok(
      staticCase.toLowerCase().includes("deprecated") ||
        staticCase.toLowerCase().includes("no longer supported"),
      "--static case must show deprecation or 'no longer supported' message"
    );

    // Must NOT set DEPLOY_STATIC=true
    assert.ok(
      !staticCase.includes("DEPLOY_STATIC=true"),
      "--static case must NOT set DEPLOY_STATIC=true"
    );
  });

  test("Given deploy.sh argument parsing, when --all flag is used, then it shows deprecation error", () => {
    const content = readFile("deploy_scripts/deploy.sh");

    // Extract the --all) case from argument parsing
    const allCaseMatch = content.match(
      /--all\)[\s\S]*?(?=\n\s*--|\n\s*\*\)|\n\s*esac)/
    );
    assert.ok(allCaseMatch, "--all case must exist in argument parsing");

    const allCase = allCaseMatch[0];

    // Must contain deprecation or error message
    assert.ok(
      allCase.toLowerCase().includes("deprecated") ||
        allCase.toLowerCase().includes("no longer supported"),
      "--all case must show deprecation or 'no longer supported' message"
    );

    // Must NOT set DEPLOY_ALL=true
    assert.ok(
      !allCase.includes("DEPLOY_ALL=true"),
      "--all case must NOT set DEPLOY_ALL=true"
    );
  });

  test("Given deploy.sh source imports, when checking sourced files, then it sources deploy-app.sh and does NOT source deploy-static.sh or optimize-images.sh", () => {
    const content = readFile("deploy_scripts/deploy.sh");

    // Must source deploy-app.sh
    assert.ok(
      content.includes('source "$SCRIPT_DIR/lib/deploy-app.sh"'),
      "deploy.sh must source deploy-app.sh"
    );

    // Must NOT source deploy-static.sh
    assert.ok(
      !content.includes('source "$SCRIPT_DIR/lib/deploy-static.sh"'),
      "deploy.sh must NOT source deploy-static.sh"
    );

    // Must NOT source optimize-images.sh
    assert.ok(
      !content.includes('source "$SCRIPT_DIR/lib/optimize-images.sh"'),
      "deploy.sh must NOT source optimize-images.sh"
    );
  });

  test("Given deploy-app.sh, when checking orchestration, then deploy_app function exists and calls sync, install, setup, build, PM2, verify in order", () => {
    const filePath = join(projectRoot, "deploy_scripts/lib/deploy-app.sh");

    // File must exist
    assert.ok(
      existsSync(filePath),
      "deploy_scripts/lib/deploy-app.sh must exist"
    );

    const content = readFileSync(filePath, "utf8");

    // deploy_app function must exist
    assert.ok(
      content.includes("deploy_app()"),
      "deploy-app.sh must define deploy_app function"
    );

    // Extract deploy_app function body
    const funcMatch = content.match(/deploy_app\(\) \{[\s\S]*?^}/m);
    assert.ok(funcMatch, "deploy_app function must have a body");

    const funcBody = funcMatch[0];
    const lines = funcBody.split("\n");

    // Find order of key orchestration steps
    let syncIndex = -1;
    let installIndex = -1;
    let setupIndex = -1;
    let buildIndex = -1;
    let pm2Index = -1;
    let verifyIndex = -1;

    lines.forEach((line, idx) => {
      if (line.includes("sync_app_files")) syncIndex = idx;
      if (
        line.includes("install_app_dependencies") ||
        line.includes("install_portal_dependencies")
      )
        installIndex = idx;
      if (line.includes("setup_app_environment")) setupIndex = idx;
      if (line.includes("build_app_on_server")) buildIndex = idx;
      if (line.includes("manage_pm2")) pm2Index = idx;
      if (line.includes("verify_app_deployment")) verifyIndex = idx;
    });

    // All steps must be present
    assert.ok(syncIndex >= 0, "deploy_app must call sync_app_files");
    assert.ok(
      installIndex >= 0,
      "deploy_app must call install_app_dependencies or install_portal_dependencies"
    );
    assert.ok(setupIndex >= 0, "deploy_app must call setup_app_environment");
    assert.ok(buildIndex >= 0, "deploy_app must call build_app_on_server");
    assert.ok(pm2Index >= 0, "deploy_app must call manage_pm2");
    assert.ok(verifyIndex >= 0, "deploy_app must call verify_app_deployment");

    // Verify ordering
    assert.ok(syncIndex < installIndex, "sync must run before install");
    assert.ok(installIndex < setupIndex, "install must run before setup");
    assert.ok(setupIndex < buildIndex, "setup must run before build");
    assert.ok(buildIndex < pm2Index, "build must run before PM2");
    assert.ok(pm2Index < verifyIndex, "PM2 must run before verify");
  });

  test("Given build.sh, when checking functions, then static build functions do NOT exist", () => {
    const content = readFile("deploy_scripts/lib/build.sh");

    // Must NOT contain static build function definitions
    // Use function definition patterns to avoid matching comments
    assert.ok(
      !content.includes("configure_static_build()"),
      "build.sh must NOT define configure_static_build()"
    );

    assert.ok(
      !content.includes("build_static()"),
      "build.sh must NOT define build_static()"
    );

    assert.ok(
      !content.includes("cleanup_build()"),
      "build.sh must NOT define cleanup_build()"
    );

    assert.ok(
      !content.includes("validate_out_directory()"),
      "build.sh must NOT define validate_out_directory()"
    );
  });

  test("Given .deployrc.example, when checking path configuration, then DEPLOY_APP_PATH exists and DEPLOY_STATIC_PATH does not", () => {
    const content = readFile(".deployrc.example");

    // Must contain DEPLOY_APP_PATH
    assert.ok(
      content.includes("DEPLOY_APP_PATH="),
      ".deployrc.example must define DEPLOY_APP_PATH"
    );

    // Must NOT contain DEPLOY_STATIC_PATH
    assert.ok(
      !content.includes("DEPLOY_STATIC_PATH="),
      ".deployrc.example must NOT define DEPLOY_STATIC_PATH"
    );
  });

  test("Given config.sh validate_config, when checking validation, then it validates DEPLOY_APP_PATH and does NOT reference DEPLOY_STATIC_PATH", () => {
    const content = readFile("deploy_scripts/lib/config.sh");

    // Extract validate_config function body
    const funcMatch = content.match(/validate_config\(\) \{[\s\S]*?^}/m);
    assert.ok(funcMatch, "validate_config function must exist");

    const funcBody = funcMatch[0];

    // Must reference DEPLOY_APP_PATH
    assert.ok(
      funcBody.includes("DEPLOY_APP_PATH"),
      "validate_config must reference DEPLOY_APP_PATH"
    );

    // Must NOT reference DEPLOY_STATIC_PATH
    assert.ok(
      !funcBody.includes("DEPLOY_STATIC_PATH"),
      "validate_config must NOT reference DEPLOY_STATIC_PATH"
    );
  });

  test('Given validation.sh, when checking pre-flight checks, then it does not reference static mode or out/ directory', () => {
    const content = readFile("deploy_scripts/lib/validation.sh");

    // Must NOT contain mode checks for "static"
    assert.ok(
      !content.match(/=\s*"static"/),
      'validation.sh must NOT contain = "static" mode checks'
    );

    // Must NOT check for out/ directory
    assert.ok(
      !content.includes('[ -d "out" ]') && !content.includes("out/"),
      "validation.sh must NOT check for out/ directory"
    );
  });

  test("Given deploy-app.sh verify function, when checking verification, then it tests both homepage and portal endpoints", () => {
    const filePath = join(projectRoot, "deploy_scripts/lib/deploy-app.sh");

    // File must exist
    assert.ok(
      existsSync(filePath),
      "deploy_scripts/lib/deploy-app.sh must exist"
    );

    const content = readFileSync(filePath, "utf8");

    // Find the verify function
    const funcMatch = content.match(
      /verify_app_deployment\(\) \{[\s\S]*?^}/m
    );
    assert.ok(funcMatch, "verify_app_deployment function must exist");

    const funcBody = funcMatch[0];

    // Must check homepage (root path or domain)
    assert.ok(
      funcBody.includes("https://${DEPLOY_DOMAIN}") ||
        funcBody.includes("https://${DEPLOY_DOMAIN}/"),
      "verify_app_deployment must test the homepage endpoint"
    );

    // Must check portal endpoint
    assert.ok(
      funcBody.includes("/portal"),
      "verify_app_deployment must test the /portal endpoint"
    );
  });
});

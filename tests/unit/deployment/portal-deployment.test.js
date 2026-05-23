const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();

// ─── Helper Functions ────────────────────────────────────────────────────────

const readFile = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

// ─── App Deployment Tests ───────────────────────────────────────────────────

test(
  "Given deploy_app function, when checking orchestration, then it follows sequence: sync, install deps, setup env, init db, create admin, build, PM2, verify",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("deploy_app()"),
      "deploy-app.sh must define deploy_app function"
    );

    // Get function body
    const deployAppMatch = content.match(
      /deploy_app\(\) \{[\s\S]*?^}/m
    );
    assert.ok(deployAppMatch, "deploy_app function must exist");

    const funcBody = deployAppMatch[0];
    const lines = funcBody.split("\n");

    // Find order of operations
    let syncIndex = -1;
    let installIndex = -1;
    let setupEnvIndex = -1;
    let initDbIndex = -1;
    let createAdminIndex = -1;
    let buildIndex = -1;
    let pm2Index = -1;
    let verifyIndex = -1;

    lines.forEach((line, idx) => {
      if (line.includes("sync_app_files")) syncIndex = idx;
      if (line.includes("install_app_dependencies")) installIndex = idx;
      if (line.includes("setup_app_environment")) setupEnvIndex = idx;
      if (line.includes("initialize_database")) initDbIndex = idx;
      if (line.includes("create_super_admin")) createAdminIndex = idx;
      if (line.includes("build_app_on_server")) buildIndex = idx;
      if (line.includes("manage_pm2")) pm2Index = idx;
      if (line.includes("verify_app_deployment")) verifyIndex = idx;
    });

    // Verify all steps are present
    assert.ok(syncIndex >= 0, "deploy_app must call sync_app_files");
    assert.ok(installIndex >= 0, "deploy_app must call install_app_dependencies");
    assert.ok(setupEnvIndex >= 0, "deploy_app must call setup_app_environment");
    assert.ok(initDbIndex >= 0, "deploy_app must call initialize_database");
    assert.ok(createAdminIndex >= 0, "deploy_app must call create_super_admin");
    assert.ok(buildIndex >= 0, "deploy_app must call build_app_on_server");
    assert.ok(pm2Index >= 0, "deploy_app must call manage_pm2");
    assert.ok(verifyIndex >= 0, "deploy_app must call verify_app_deployment");

    // Verify order
    assert.ok(syncIndex < installIndex, "sync must run before install deps");
    assert.ok(installIndex < setupEnvIndex, "install deps must run before setup env");
    assert.ok(setupEnvIndex < initDbIndex, "setup env must run before init db");
    assert.ok(initDbIndex < createAdminIndex, "init db must run before create admin");
    assert.ok(createAdminIndex < buildIndex, "create admin must run before build");
    assert.ok(buildIndex < pm2Index, "build must run before PM2");
    assert.ok(pm2Index < verifyIndex, "PM2 must run before verify");
  }
);

test(
  "Given sync_app_files function, when checking source, then it uses rsync with exclusions for node_modules, .git, .next, out, .env",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("sync_app_files()"),
      "deploy-app.sh must define sync_app_files function"
    );

    // Uses rsync
    assert.ok(
      content.includes("rsync"),
      "sync_app_files must use rsync"
    );

    // Excludes node_modules
    assert.ok(
      content.includes("--exclude='node_modules/'") ||
      content.includes("--exclude=node_modules"),
      "sync_app_files must exclude node_modules"
    );

    // Excludes .git
    assert.ok(
      content.includes("--exclude='.git/'") ||
      content.includes("--exclude=.git"),
      "sync_app_files must exclude .git"
    );

    // Excludes .next
    assert.ok(
      content.includes("--exclude='.next/'") ||
      content.includes("--exclude=.next"),
      "sync_app_files must exclude .next"
    );

    // Excludes out
    assert.ok(
      content.includes("--exclude='out/'") ||
      content.includes("--exclude=out"),
      "sync_app_files must exclude out"
    );

    // Excludes .env files
    assert.ok(
      content.includes("--exclude='.env*'") ||
      content.includes("--exclude=.env"),
      "sync_app_files must exclude .env files"
    );

    // Uses --delete
    assert.ok(
      content.includes("--delete"),
      "sync_app_files must use --delete flag"
    );

    // Uses DEPLOY_APP_PATH
    assert.ok(
      content.includes("${DEPLOY_APP_PATH}"),
      "sync_app_files must sync to DEPLOY_APP_PATH"
    );

    // Respects DRY_RUN
    assert.ok(
      content.includes('[ "${DRY_RUN:-false}" = true ]'),
      "sync_app_files must check DRY_RUN flag"
    );
  }
);

test(
  "Given setup_app_environment function, when checking source, then it only prompts for secrets (not non-secret config values)",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("setup_app_environment()"),
      "deploy-app.sh must define setup_app_environment function"
    );

    // Checks if .env.local exists first
    assert.ok(
      content.includes("check_remote_file_exists") &&
      content.includes(".env.local"),
      "setup_app_environment must check if .env.local exists"
    );

    // Returns early if exists
    assert.ok(
      content.includes("Environment already configured") ||
      content.includes("return 0"),
      "setup_app_environment must return early if .env.local exists"
    );

    // Uses DEPLOY_DB_USER from config (non-secret)
    assert.ok(
      content.includes("${DEPLOY_DB_USER}") || content.includes("DEPLOY_DB_USER"),
      "setup_app_environment must use DEPLOY_DB_USER from config"
    );

    // Prompts for DB password (secret)
    assert.ok(
      content.includes("read -sp") && content.includes("Database password"),
      "setup_app_environment must prompt for database password"
    );

    // Prompts for SMTP password (secret)
    assert.ok(
      content.includes("read -sp") && content.includes("SMTP password"),
      "setup_app_environment must prompt for SMTP password"
    );

    // Generates session secret
    assert.ok(
      content.includes("openssl rand -hex 32"),
      "setup_app_environment must generate session secret with openssl"
    );

    // Creates .env.local on server
    assert.ok(
      content.includes("cat > ${DEPLOY_APP_PATH}/.env.local"),
      "setup_app_environment must create .env.local on server"
    );

    // Respects DRY_RUN
    assert.ok(
      content.includes('[ "${DRY_RUN:-false}" = true ]'),
      "setup_app_environment must check DRY_RUN flag"
    );
  }
);

test(
  "Given setup_app_environment function, when checking .env.local content, then it includes all required environment variables",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // PORTAL_DATABASE_URL
    assert.ok(
      content.includes("PORTAL_DATABASE_URL="),
      ".env.local must include PORTAL_DATABASE_URL"
    );

    // ADMIN_SESSION_SECRET
    assert.ok(
      content.includes("ADMIN_SESSION_SECRET="),
      ".env.local must include ADMIN_SESSION_SECRET"
    );

    // PORTAL_BASE_URL
    assert.ok(
      content.includes("PORTAL_BASE_URL="),
      ".env.local must include PORTAL_BASE_URL"
    );

    // SMTP configuration
    assert.ok(
      content.includes("SMTP_HOST=") &&
      content.includes("SMTP_PORT=") &&
      content.includes("SMTP_USER=") &&
      content.includes("SMTP_PASS=") &&
      content.includes("SMTP_FROM="),
      ".env.local must include all SMTP configuration variables"
    );
  }
);

test(
  "Given install_app_dependencies function, when checking source, then it runs npm install --production on server",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("install_app_dependencies()"),
      "deploy-app.sh must define install_app_dependencies function"
    );

    // Uses ssh_command
    assert.ok(
      content.includes("ssh_command"),
      "install_app_dependencies must use ssh_command"
    );

    // Runs npm install --production
    assert.ok(
      content.includes("npm install --production"),
      "install_app_dependencies must run npm install --production"
    );

    // Changes to DEPLOY_APP_PATH
    assert.ok(
      content.includes("cd ${DEPLOY_APP_PATH}"),
      "install_app_dependencies must cd to DEPLOY_APP_PATH"
    );

    // Respects DRY_RUN
    assert.ok(
      content.includes('[ "${DRY_RUN:-false}" = true ]'),
      "install_app_dependencies must check DRY_RUN flag"
    );
  }
);

test(
  "Given initialize_database function, when checking source, then it runs init-portal-db.sh on server",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("initialize_database()"),
      "deploy-app.sh must define initialize_database function"
    );

    // Runs init-portal-db.sh
    assert.ok(
      content.includes("init-portal-db.sh"),
      "initialize_database must run init-portal-db.sh"
    );

    // Uses ssh_command
    assert.ok(
      content.includes("ssh_command"),
      "initialize_database must use ssh_command"
    );

    // Changes to DEPLOY_APP_PATH
    assert.ok(
      content.includes("cd ${DEPLOY_APP_PATH}"),
      "initialize_database must cd to DEPLOY_APP_PATH"
    );

    // Idempotent (may warn if schema exists)
    assert.ok(
      content.includes("may be OK if schema exists") ||
      content.includes("Continuing"),
      "initialize_database must handle case where schema already exists"
    );

    // Respects DRY_RUN
    assert.ok(
      content.includes('[ "${DRY_RUN:-false}" = true ]'),
      "initialize_database must check DRY_RUN flag"
    );
  }
);

test(
  "Given create_super_admin function, when checking source, then it only creates admin if none exist",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("create_super_admin()"),
      "deploy-app.sh must define create_super_admin function"
    );

    // Counts existing admins
    assert.ok(
      content.includes("SELECT COUNT(*)") && content.includes("FROM admins"),
      "create_super_admin must count existing admins"
    );

    // Uses node -e for database query
    assert.ok(
      content.includes("node -e"),
      "create_super_admin must use node -e for database query"
    );

    // Only creates if count is 0
    assert.ok(
      content.includes('[ "$ADMIN_COUNT" = "0" ]'),
      "create_super_admin must check if admin count is 0"
    );

    // Prompts for admin details
    assert.ok(
      content.includes("Admin email") &&
      content.includes("Admin full name") &&
      content.includes("Admin password"),
      "create_super_admin must prompt for admin email, name, and password"
    );

    // Runs create-super-admin.sh
    assert.ok(
      content.includes("create-super-admin.sh"),
      "create_super_admin must run create-super-admin.sh script"
    );

    // Respects DRY_RUN
    assert.ok(
      content.includes('[ "${DRY_RUN:-false}" = true ]'),
      "create_super_admin must check DRY_RUN flag"
    );
  }
);

test(
  "Given build_app_on_server function, when checking source, then it runs npm run build on server",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("build_app_on_server()"),
      "deploy-app.sh must define build_app_on_server function"
    );

    // Uses ssh_command
    assert.ok(
      content.includes("ssh_command"),
      "build_app_on_server must use ssh_command"
    );

    // Runs npm run build
    assert.ok(
      content.includes("npm run build"),
      "build_app_on_server must run npm run build"
    );

    // Changes to DEPLOY_APP_PATH
    assert.ok(
      content.includes("cd ${DEPLOY_APP_PATH}"),
      "build_app_on_server must cd to DEPLOY_APP_PATH"
    );

    // Checks build success
    assert.ok(
      content.includes("Build completed successfully") ||
      content.includes("log_success"),
      "build_app_on_server must log success message"
    );

    // Respects DRY_RUN
    assert.ok(
      content.includes('[ "${DRY_RUN:-false}" = true ]'),
      "build_app_on_server must check DRY_RUN flag"
    );
  }
);

test(
  "Given build_app_on_server function, when removing old build directories, then it removes both .next and out directories before building",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("build_app_on_server()"),
      "deploy-app.sh must define build_app_on_server function"
    );

    // Get function body
    const buildFuncMatch = content.match(
      /build_app_on_server\(\) \{[\s\S]*?^}/m
    );
    assert.ok(buildFuncMatch, "build_app_on_server function must exist");

    const funcBody = buildFuncMatch[0];
    const lines = funcBody.split("\n");

    // Find line indices
    let rmIndex = -1;
    let buildIndex = -1;

    lines.forEach((line, idx) => {
      if (line.includes("rm -rf") && (line.includes(".next") || line.includes("out"))) {
        rmIndex = idx;
      }
      if (line.includes("npm run build")) {
        buildIndex = idx;
      }
    });

    // Must remove old build directories
    assert.ok(
      rmIndex >= 0,
      "build_app_on_server must remove old build directories"
    );

    // Must remove BOTH .next and out
    assert.ok(
      funcBody.includes("rm -rf .next out") ||
      (funcBody.includes("rm -rf .next") && funcBody.includes("rm -rf out")),
      "build_app_on_server must remove both .next and out directories (prevents stale export mode cache)"
    );

    // Removal must happen BEFORE build
    assert.ok(
      buildIndex >= 0,
      "build_app_on_server must run npm run build"
    );

    assert.ok(
      rmIndex < buildIndex,
      "build_app_on_server must remove old build directories BEFORE running npm run build"
    );
  }
);

test(
  "Given manage_pm2 function, when checking source, then it installs PM2 if missing",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("manage_pm2()"),
      "deploy-app.sh must define manage_pm2 function"
    );

    // Checks if PM2 is installed
    assert.ok(
      content.includes("command -v pm2"),
      "manage_pm2 must check if PM2 is installed"
    );

    // Installs PM2 if missing
    assert.ok(
      content.includes("npm install -g pm2"),
      "manage_pm2 must install PM2 globally if missing"
    );

    // Respects DRY_RUN
    assert.ok(
      content.includes('[ "${DRY_RUN:-false}" = true ]'),
      "manage_pm2 must check DRY_RUN flag"
    );
  }
);

test(
  "Given manage_pm2 function, when checking source, then it restarts existing process or starts new one",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Checks PM2 process status
    assert.ok(
      content.includes("pm2 describe") && content.includes("DEPLOY_PM2_APP_NAME"),
      "manage_pm2 must check if PM2 process exists"
    );

    // Restarts if running
    assert.ok(
      content.includes("pm2 restart") && content.includes("${DEPLOY_PM2_APP_NAME}"),
      "manage_pm2 must restart existing process"
    );

    // Starts if not running
    assert.ok(
      content.includes("pm2 start npm") && content.includes("${DEPLOY_PM2_APP_NAME}"),
      "manage_pm2 must start new process if not running"
    );

    // Saves PM2 state
    assert.ok(
      content.includes("pm2 save"),
      "manage_pm2 must save PM2 state"
    );
  }
);

test(
  "Given manage_pm2 function, when checking source, then it configures auto-restart via crontab",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Checks for existing crontab entry
    assert.ok(
      content.includes("crontab -l") && content.includes("pm2 resurrect"),
      "manage_pm2 must check for existing PM2 resurrect crontab entry"
    );

    // Adds crontab entry if missing
    assert.ok(
      content.includes("@reboot") && content.includes("pm2 resurrect"),
      "manage_pm2 must add @reboot PM2 resurrect to crontab"
    );

    // Uses which pm2 to get path
    assert.ok(
      content.includes("which pm2") || content.includes("PM2_PATH"),
      "manage_pm2 must get PM2 path for crontab"
    );
  }
);

test(
  "Given verify_app_deployment function, when checking source, then it checks PM2 status is online",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function exists
    assert.ok(
      content.includes("verify_app_deployment()"),
      "deploy-app.sh must define verify_app_deployment function"
    );

    // Checks PM2 status
    assert.ok(
      content.includes("pm2 status") && content.includes("${DEPLOY_PM2_APP_NAME}"),
      "verify_app_deployment must check PM2 process status"
    );

    // Checks for 'online' status
    assert.ok(
      content.includes("grep -q") && content.includes("online") ||
      content.includes('echo "$PM2_OUTPUT" | grep -q "online"'),
      "verify_app_deployment must check if PM2 status is 'online'"
    );

    // Respects DRY_RUN
    assert.ok(
      content.includes('[ "${DRY_RUN:-false}" = true ]'),
      "verify_app_deployment must check DRY_RUN flag"
    );
  }
);

test(
  "Given verify_app_deployment function, when checking source, then it optionally tests HTTP response to /portal/",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Checks if curl is available
    assert.ok(
      content.includes("command -v curl"),
      "verify_app_deployment must check if curl is available"
    );

    // Tests /portal/ endpoint
    assert.ok(
      content.includes("/portal/"),
      "verify_app_deployment must test /portal/ endpoint"
    );

    // Uses DEPLOY_DOMAIN
    assert.ok(
      content.includes("${DEPLOY_DOMAIN}"),
      "verify_app_deployment must use DEPLOY_DOMAIN"
    );

    // Checks for 200 status
    assert.ok(
      content.includes("200") && content.includes("http_code"),
      "verify_app_deployment must check for HTTP 200 status"
    );
  }
);

test(
  "Given deploy.sh main script, when deploying, then it calls deploy_app",
  () => {
    const content = readFile("deploy_scripts/deploy.sh");

    // Sources deploy-app.sh
    assert.ok(
      content.includes('source "$SCRIPT_DIR/lib/deploy-app.sh"'),
      "deploy.sh must source deploy-app.sh library"
    );

    // Calls deploy_app
    assert.ok(
      content.includes("deploy_app || exit 1"),
      "deploy.sh must call deploy_app and exit with status 1 on failure"
    );
  }
);

test(
  "Given deploy_app function, when checking completion, then it shows next steps for nginx configuration",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Shows next steps
    assert.ok(
      content.includes("Next steps:") || content.includes("next steps"),
      "deploy_app must show next steps after completion"
    );

    // Mentions nginx configuration
    assert.ok(
      content.includes("nginx") &&
      (content.includes("proxy") || content.includes("/portal")),
      "deploy_app must mention nginx proxy configuration"
    );

    // Shows PM2 commands
    assert.ok(
      content.includes("pm2 logs") &&
      content.includes("pm2 restart") &&
      content.includes("pm2 status"),
      "deploy_app must show useful PM2 commands"
    );
  }
);

// ─── --setup Flag Tests ──────────────────────────────────────────────────────

test(
  "Given deploy.sh, when checking argument parsing, then --setup flag sets FORCE_SETUP to true",
  () => {
    const content = readFile("deploy_scripts/deploy.sh");

    // Default value is false
    assert.ok(
      content.includes("FORCE_SETUP=false"),
      "deploy.sh must initialize FORCE_SETUP to false"
    );

    // Parses --setup flag
    assert.ok(
      content.includes("--setup)") &&
      content.includes("FORCE_SETUP=true"),
      "deploy.sh must set FORCE_SETUP=true when --setup flag is provided"
    );

    // Exports FORCE_SETUP for use in sourced scripts
    assert.ok(
      content.includes("export") && content.includes("FORCE_SETUP"),
      "deploy.sh must export FORCE_SETUP for use in deploy-app.sh"
    );
  }
);

test(
  "Given deploy.sh help text, when checking --setup documentation, then it explains the flag forces environment reconfiguration",
  () => {
    const content = readFile("deploy_scripts/deploy.sh");

    // Help text includes --setup flag
    assert.ok(
      content.includes("--setup"),
      "deploy.sh help must document --setup flag"
    );

    // Explains it recreates .env.local
    assert.ok(
      content.includes("--setup") &&
      (content.includes(".env.local") || content.includes("environment") || content.includes("reconfiguration")),
      "deploy.sh help must explain --setup recreates environment configuration"
    );

    // Includes example usage
    const exampleMatch = content.match(/# .*--setup/);
    assert.ok(
      exampleMatch,
      "deploy.sh help must include example of using --setup flag"
    );
  }
);

test(
  "Given setup_app_environment function, when FORCE_SETUP is true and .env.local exists, then it proceeds with reconfiguration instead of returning early",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Function checks if .env.local exists
    assert.ok(
      content.includes("check_remote_file_exists") &&
      content.includes(".env.local"),
      "setup_app_environment must check if .env.local exists"
    );

    // Checks FORCE_SETUP flag
    assert.ok(
      content.includes("FORCE_SETUP"),
      "setup_app_environment must check FORCE_SETUP flag"
    );

    // When FORCE_SETUP is true, bypasses early return
    assert.ok(
      content.includes('[ "${FORCE_SETUP:-false}" = true ]'),
      "setup_app_environment must check FORCE_SETUP flag value"
    );

    // Shows warning when forcing reconfiguration
    assert.ok(
      content.includes("--setup flag forces reconfiguration") ||
      (content.includes("--setup") && content.includes("forces")),
      "setup_app_environment must warn when --setup forces reconfiguration"
    );
  }
);

test(
  "Given setup_app_environment function, when FORCE_SETUP is false and .env.local exists, then it returns early without prompting",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Has early return path when .env.local exists and FORCE_SETUP is false
    assert.ok(
      content.includes("Environment already configured") &&
      content.includes("return 0"),
      "setup_app_environment must return early when .env.local exists and FORCE_SETUP is false"
    );

    // The else clause of FORCE_SETUP check contains the early return
    assert.ok(
      content.includes("else") &&
      content.includes("Environment already configured"),
      "setup_app_environment must have else branch that returns early"
    );
  }
);

// ─── CRITICAL: Empty credential validation ──────────────────────────────────

test(
  "Given setup_app_environment function, when database password is read interactively, then it rejects empty input",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");

    // Extract setup_app_environment function body
    const funcMatch = content.match(
      /setup_app_environment\(\) \{[\s\S]*?^}/m
    );
    assert.ok(funcMatch, "setup_app_environment function must exist");
    const funcBody = funcMatch[0];

    // After reading DB_PASS, there must be a check for empty value
    // The read command is: read -sp "  Database password: " DB_PASS
    // Immediately after, there should be a guard: if [ -z "$DB_PASS" ]
    assert.ok(
      funcBody.includes('read -sp') &&
      funcBody.match(/read -sp.*DB_PASS[\s\S]{0,80}-z.*DB_PASS/),
      "setup_app_environment must validate DB_PASS is non-empty after read"
    );
  }
);

test(
  "Given setup_app_environment function, when SMTP password is read interactively, then it rejects empty input",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");
    const funcMatch = content.match(
      /setup_app_environment\(\) \{[\s\S]*?^}/m
    );
    assert.ok(funcMatch, "setup_app_environment function must exist");
    const funcBody = funcMatch[0];

    // After reading SMTP_PASS, there must be a check for empty value
    assert.ok(
      funcBody.match(/read -sp.*SMTP_PASS[\s\S]{0,80}-z.*SMTP_PASS/),
      "setup_app_environment must validate SMTP_PASS is non-empty after read"
    );
  }
);

test(
  "Given create_super_admin function, when admin email is read interactively, then it rejects empty input",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");
    const funcMatch = content.match(
      /create_super_admin\(\) \{[\s\S]*?^}/m
    );
    assert.ok(funcMatch, "create_super_admin function must exist");
    const funcBody = funcMatch[0];

    // After reading ADMIN_EMAIL, there must be a check for empty value
    assert.ok(
      funcBody.match(/read -p.*ADMIN_EMAIL[\s\S]{0,80}-z.*ADMIN_EMAIL/),
      "create_super_admin must validate ADMIN_EMAIL is non-empty after read"
    );
  }
);

test(
  "Given create_super_admin function, when admin name is read interactively, then it rejects empty input",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");
    const funcMatch = content.match(
      /create_super_admin\(\) \{[\s\S]*?^}/m
    );
    assert.ok(funcMatch, "create_super_admin function must exist");
    const funcBody = funcMatch[0];

    // After reading ADMIN_NAME, there must be a check for empty value
    assert.ok(
      funcBody.match(/read -p.*ADMIN_NAME[\s\S]{0,80}-z.*ADMIN_NAME/),
      "create_super_admin must validate ADMIN_NAME is non-empty after read"
    );
  }
);

test(
  "Given create_super_admin function, when admin password is read interactively, then it rejects empty input",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");
    const funcMatch = content.match(
      /create_super_admin\(\) \{[\s\S]*?^}/m
    );
    assert.ok(funcMatch, "create_super_admin function must exist");
    const funcBody = funcMatch[0];

    // After reading ADMIN_PASSWORD, there must be a check for empty value
    assert.ok(
      funcBody.match(/read -sp.*ADMIN_PASSWORD[\s\S]{0,80}-z.*ADMIN_PASSWORD/),
      "create_super_admin must validate ADMIN_PASSWORD is non-empty after read"
    );
  }
);

// ─── HIGH: Admin check must source .env.local ───────────────────────────────

test(
  "Given create_super_admin function, when counting admins, then it sources .env.local before running node",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");
    const funcMatch = content.match(
      /create_super_admin\(\) \{[\s\S]*?^}/m
    );
    assert.ok(funcMatch, "create_super_admin function must exist");
    const funcBody = funcMatch[0];

    // The node -e script runs via SSH. PORTAL_DATABASE_URL is only in .env.local,
    // not in the SSH session environment. Without sourcing .env.local first,
    // process.env.PORTAL_DATABASE_URL is empty and the check always returns 0.
    assert.ok(
      funcBody.match(/source\s+\.env\.local/) || funcBody.match(/source\s+\$\{?DEPLOY_APP_PATH/),
      "create_super_admin must source .env.local before running node -e to make PORTAL_DATABASE_URL available"
    );
  }
);

// ─── HIGH: Health check redirect handling ───────────────────────────────────

test(
  "Given verify_app_deployment function, when curl checks portal, then it follows HTTP redirects",
  () => {
    const content = readFile("deploy_scripts/lib/deploy-app.sh");
    const funcMatch = content.match(
      /verify_app_deployment\(\) \{[\s\S]*?^}/m
    );
    assert.ok(funcMatch, "verify_app_deployment function must exist");
    const funcBody = funcMatch[0];

    // curl must use -L flag to follow redirects (HTTP 301/302/308)
    assert.ok(
      funcBody.match(/curl\s[^"]*-L/) || funcBody.match(/curl\s[^"]*--location/),
      "verify_app_deployment curl must use -L (follow redirects) flag"
    );
  }
);

// ─── MEDIUM: SSH stdin consumption bug ──────────────────────────────────────

test(
  "Given ssh_command function, when used in loops, then ssh uses -n flag to prevent stdin consumption",
  () => {
    const content = readFile("deploy_scripts/lib/ssh.sh");
    const funcMatch = content.match(/ssh_command\(\) \{[\s\S]*?^}/m);
    assert.ok(funcMatch, "ssh_command function must exist");
    const funcBody = funcMatch[0];

    // ssh must use -n flag to avoid consuming stdin from calling loops
    // Without -n, ssh inside a while-read loop eats the remaining stdin
    assert.ok(
      funcBody.match(/ssh\s[^"]*-n/) || funcBody.match(/ssh\s+-n\b/),
      "ssh_command must use -n flag to prevent stdin consumption in loops"
    );
  }
);

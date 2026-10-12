# CLAUDE-DEPLOYMENT.md

Deployment patterns and gotchas.

## Deployment Script Architecture

**Unified script:** `deploy_scripts/deploy.sh` — one command does sync, install, env setup, migrations, build on server, PM2 restart, verification. No "static vs portal" split. No static export.

**Build output:** `.next/` (server mode). No `out/` directory. `next.config.js` has `compress: false` and `images: { unoptimized: true }`, never `output: 'export'`.

**Critical rule:** Run from project root, never from inside `deploy_scripts/` (repo-relative paths).

**Removed flags:** `--static` and `--all` hard-error. `--portal` accepted as a no-op (backwards compat).

## Flag Behavior

### `--yes` / `-y`

Skips deployment confirmation prompt only. Does NOT skip credential prompts on first-time setup. Provide credentials via env vars for unattended runs.

### `--setup`

Forces `.env.local` recreation even if it exists. Bypasses the "already configured" check. Re-prompts for ALL credentials (or reads env vars; fails fast non-interactive without env vars). Always requires credential input.

Use for: disaster recovery, broken `.env.local`, credential rotation, server migration.

### `--skip-migrations`

Skips migration step. Not recommended — migrations are idempotent.

### Flag Combinations

| Flags | Behavior |
|---|---|
| (none) | Prompts for confirmation; prompts for credentials first-time only |
| `--yes` | Skip confirmation; credentials still prompt first-time |
| `--setup` | Force reconfig; re-prompts credentials; confirmation still prompts |
| `--setup --yes` | Force reconfig with env-var credentials; no prompts |
| `--dry-run --verbose` | Preview deploy without changes |

## Credential Handling: Interactive vs Non-Interactive

### Interactive Mode Detection

Detect non-interactive mode with `[ ! -t 0 ]` (stdin not a terminal). Non-interactive: piped input, background jobs, CI/CD without TTY, cron.

### Critical Pattern: Fail-Fast on Missing Credentials

`read -sp` returns success even without input in non-interactive mode — silently creates empty credentials in `.env.local`. All credential prompts MUST check `[ ! -t 0 ]` before `read`:

```bash
local DB_PASS="${DEPLOY_DB_PASSWORD:-}"
if [ -z "$DB_PASS" ]; then
  if [ ! -t 0 ]; then
    log_error "Database password required but not provided"
    log_error "Running in non-interactive mode (piped or background)"
    log_error ""
    log_error "Solution: Set environment variable:"
    log_error "  export DEPLOY_DB_PASSWORD='your_password'"
    return 1
  fi
  read -sp "  Database password: " DB_PASS
  echo ""
else
  log_info "Database password: (from DEPLOY_DB_PASSWORD env var)"
fi
```

Rule: all credential prompts must follow this pattern.

## Non-Interactive Deployment (CI/CD)

Required (or the script fails fast):

```bash
export DEPLOY_DB_PASSWORD='...'          # Database password
export DEPLOY_SMTP_PASSWORD='...'        # SMTP password (AWS SES)
export DEPLOY_ADMIN_EMAIL='...'          # Super admin email (first deploy only)
export DEPLOY_ADMIN_NAME='...'           # Super admin name  (first deploy only)
export DEPLOY_ADMIN_PASSWORD='...'       # Super admin password (first deploy only)
```

Optional — silently use defaults in non-interactive mode if omitted:

```bash
export DEPLOY_SESSION_SECRET='...'       # auto-generated hex if unset
export DEPLOY_PORTAL_BASE_URL='...'      # defaults to https://$DEPLOY_DOMAIN
```

Standard CI/CD pattern (subsequent deploys, credentials already on server):

```bash
./deploy_scripts/deploy.sh --yes
```

First-time CI/CD deployment:

```bash
export DEPLOY_DB_PASSWORD="$SECRET_DB_PASSWORD"
export DEPLOY_SMTP_PASSWORD="$SECRET_SMTP_PASSWORD"
export DEPLOY_ADMIN_EMAIL="admin@example.com"
export DEPLOY_ADMIN_NAME="Admin User"
export DEPLOY_ADMIN_PASSWORD="$SECRET_ADMIN_PASSWORD"
./deploy_scripts/deploy.sh --yes
```

Credential rotation:

```bash
export DEPLOY_DB_PASSWORD="$NEW_DB_PASSWORD"
export DEPLOY_SMTP_PASSWORD="$NEW_SMTP_PASSWORD"
./deploy_scripts/deploy.sh --setup --yes
```

## Common Deployment Patterns

### First-Time Deployment (Interactive)

```bash
./deploy_scripts/deploy.sh
```

Prompts confirmation, then: DB password, SMTP password, session secret (auto-generated default), portal base URL, and (if no admins) super admin email/name/password. Server creates `.env.local`, runs schema + migrations, inserts admin row.

### Subsequent Deployment

```bash
./deploy_scripts/deploy.sh --yes
```

`.env.local` and admin rows exist — credential/admin prompts skipped. Syncs code, runs new migrations, builds, restarts PM2.

### Environment Reconfiguration (Disaster Recovery)

For broken `.env.local`, credential rotation, server migration:

```bash
./deploy_scripts/deploy.sh --setup --yes
```

Recreates `.env.local` from scratch. Does NOT touch admin accounts.

### Dry Run

```bash
./deploy_scripts/deploy.sh --dry-run            # preview
./deploy_scripts/deploy.sh --dry-run --verbose  # step detail
./deploy_scripts/deploy.sh --dry-run --debug    # env + command traces
```

Dry-run echoes commands instead of executing. Migration step may show the literal `find` command as data — display artifact, not a bug.

## Critical Deployment Gotchas

### 1. Silent Credential Failures (Non-Interactive Mode)

**Symptom:** Deploy succeeds but portal fails with DB auth errors.

**Cause:** Non-interactive mode with missing env vars. Current script's fail-fast guard catches this; reports of this symptom indicate an older checkout.

**Detection:**

```bash
ssh sfggc "cat $DEPLOY_APP_PATH/.env.local | grep -E '(DATABASE_URL|SMTP_PASS)='"
```

**Fix:** Provide credentials via env vars, or run interactively, then re-run with `--setup`.

### 2. `--force` vs `--yes`

`--force` is aliased to `--yes`. Both work. Prefer `--yes`.

### 3. Wrong Directory

**Error:** path resolution fails, rsync source empty, build context wrong.

**Cause:** Running script from inside `deploy_scripts/`.

**Fix:** Run from project root.

### 4. SSH Stdin Consumption Skips Migrations (Historical)

**Symptom:** Only 1 of N migrations runs.

**Cause:** `ssh` without `-n` reads from stdin. Inside the migration runner's `while read` loop, the first `ssh` call consumed the rest of stdin, eating remaining migration paths.

**Fix:** `ssh -n` in `ssh_command()` (`lib/ssh.sh`). Shipped.

**Rule:** Always use `ssh -n` for non-interactive remote commands, especially inside loops.

### 5. Build ID Mismatch Across Deploys (Historical)

**Symptom:** Site loses all styling after deploy because `/_next/static/*` returns 404.

**Cause:** Fixed `alias` for `/_next/static` pointed at one specific `.next/static` directory. Build ID changes every deploy → alias path stale → all CSS/JS 404s.

**Fix:** Current `backend/config/vhost.txt` proxies `/_next/static` to Node.js (always serves current build ID) with long-lived cache headers:

```nginx
location ^~ /_next/static {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Rule:** Never use a fixed `alias` for `/_next/static` — build ID changes every deploy. Proxy to Node.js, or `try_files $uri @portal_next` with proxy fallback.

### 6. SSR Self-Referencing Fetch Loop (Historical)

**Symptom:** SSR pages broken with valid session: participant detail redirects to login, admin detail 404, team pages empty.

**Cause:** `buildBaseUrl(req)` used `req.headers.host` for internal SSR fetches → self-referencing loop (Node → nginx HTTPS → Node). Cloud servers often can't connect to their own public IP (hairpin NAT); cookies/forwarded headers may be lost even when connection succeeds.

**Fix:** `buildBaseUrl()` in `src/utils/portal/ssr-helpers.js` must always return `http://localhost:${PORT}`. Never use `req.headers.host`.

**Rule:** `getServerSideProps` internal API calls must never loop through external URL/nginx. Always `http://localhost:PORT`.

### 7. `--setup` Non-Interactive Without Env Vars

**Error:** "Database password required but not provided."

**Cause:** `--setup` always requires credentials; fails fast non-interactively without env vars.

**Fix:** Provide all credentials via env vars when using `--setup` in CI/CD.

### 8. Stale Content After "Successful" Deploy (Vhost Drift)

**Symptom:** Deploy reports success but public URL serves old content. User says "I deployed but the site still shows the old version."

**Cause:** Nginx vhost in CloudPanel out of sync with `backend/config/vhost.txt` — nginx serves a stale static file from disk instead of proxying to Node.js. HTTP 200 hides the failure.

**Detection (canonical):** Build-ID fingerprint check — `verify_build_id_served()` in `deploy_scripts/lib/deploy-app.sh` runs this at the end of every deploy. Two failure modes:

| Outcome | Meaning | Fix |
|---|---|---|
| No `buildId` in public response | Nginx not proxying to Node.js (vhost drift, serving disk file) | Push `backend/config/vhost.txt` to CloudPanel |
| `buildId` mismatch | Server built new code but public sees old | Check vhost drift first, then CDN cache, then DNS/wrong server |

**Manual one-liner (same check):**

```bash
SERVER_BID=$(ssh sfggc "cat $DEPLOY_APP_PATH/.next/BUILD_ID")
PUBLIC_BID=$(curl -fsSL https://$DEPLOY_DOMAIN/ | grep -oE '"buildId":"[^"]+"' | head -1 | sed 's/.*"buildId":"\([^"]*\)".*/\1/')
[ "$SERVER_BID" = "$PUBLIC_BID" ] && echo MATCH || echo MISMATCH
```

**Rule:** When user reports stale content after deploy, run fingerprint check first. Do NOT suggest browser/CDN cache clears before ruling out vhost drift. See `deploy_docs/DEPLOYMENT.md#build-id-fingerprint-check`.

## SSH Inline Node.js Scripts

**Problem:** `.env.local` uses plain assignment (`KEY=value`, no `export`). `source` alone does not export vars to child processes like `node`.

**Pattern:**

```bash
ssh_command "cd $DEPLOY_APP_PATH && set -a && source .env.local 2>/dev/null && set +a && node -e \"
    const db = require('./src/utils/portal/db.js');
    // ... script
\""
```

**Rules:**
1. `set -a` before `source`, `set +a` after — auto-exports sourced vars to child processes.
2. Avoid `!` operator in inline scripts — SSH escapes to `\!`. Use `=== ''` or `=== undefined`.
3. Wrap `node -e` script in escaped double quotes inside SSH command string.
4. Always `2>/dev/null` on `source` to suppress missing-file warnings in dry-run.

**Example (check super admin exists):**

```bash
ssh_command "cd $DEPLOY_APP_PATH && set -a && source .env.local 2>/dev/null && set +a && node -e \"
    const { query, closePool } = require('./src/utils/portal/db.js');
    query('SELECT COUNT(*) as count FROM admins WHERE role = ?', ['super-admin'])
      .then(([rows]) => { console.log(rows[0].count > 0 ? 'EXISTS' : 'MISSING'); })
      .finally(() => closePool());
\""
```

## Server-Mode Config Template

`next.config.js` on server must have `compress: false` — nginx handles gzip; Node compressing on top causes double-compression (wasted CPU, larger responses, garbled binary).

**Single source of truth:** `write_server_mode_config()` in `deploy_scripts/lib/build.sh`. Local-build helpers and the inline server-side rewrite in `deploy-app.sh` must match this template. When modifying:

1. Update `write_server_mode_config()` in `lib/build.sh`.
2. Update inline heredoc in `validate_server_config()` in `lib/deploy-app.sh` to match.
3. Run `tests/unit/nextjs-compress-config.test.js`, `tests/unit/deployment/unified-app-deployment.test.js`, `tests/unit/deployment/nginx-config.test.js`.

**Verify after deploy:**

```bash
curl -s -D - -o /dev/null -H "Accept-Encoding: gzip" https://www.goldengateclassic.org/portal | grep -i content-encoding
```

Expect one `Content-Encoding: gzip` (from nginx). Two means `compress: false` is missing.

## Deployment Script Structure

**Entry point:** `deploy_scripts/deploy.sh`

**Function libraries:**

- `lib/output.sh` — logging helpers
- `lib/config.sh` — `.deployrc` loading, defaults, CLI overrides
- `lib/ssh.sh` — SSH helpers (uses `ssh -n` for non-interactive commands)
- `lib/validation.sh` — pre-flight checks (local + remote environment)
- `lib/build.sh` — `write_server_mode_config()` template, build orchestration
- `lib/deploy-app.sh` — unified application deployment (sync, install, env setup, build, PM2, verify); `verify_build_id_served()` is the canonical "did the deploy actually ship" check
- `lib/deploy-migrations.sh` — runs every `*.sh` in `backend/scripts/migrations/`

**Credential prompts (all in `lib/deploy-app.sh`):**
- Database password
- SMTP password
- Session secret (with auto-generated default)
- Portal base URL
- Admin email / name / password (first deploy only, if no admins exist)

Every prompt checks `[ ! -t 0 ]` before calling `read`.

## Server Configuration: Nginx Management

**Critical:** No direct nginx access — hosting is ISP-controlled via CloudPanel. All nginx changes go through file-in-repo → clipboard → CloudPanel paste workflow.

### Nginx Configuration Workflow

**File:** `backend/config/vhost.txt`

**Process:**
1. Edit `backend/config/vhost.txt` locally.
2. `cat backend/config/vhost.txt | pbcopy`.
3. CloudPanel ISP portal → Sites → domain → Vhost (or Nginx Config).
4. Paste and save (panel validates, reloads nginx).

**Do NOT suggest:**
- SSH nginx commands (`nginx -t`, `systemctl reload nginx`, `nginx -s reload`).
- Direct edits to `/etc/nginx/`.
- Server-side nginx changes via SSH.

### Nginx `^~` Modifier Requirement

**CRITICAL:** Current vhost has one `^~` block (`/_next/static`) and one catch-all `location /`. The `^~` is defensive — any prefix block serving `.js`/`.css` MUST use it, or a future regex `~* \.(js|css|...)$` will hijack JS requests.

**Current pattern in `backend/config/vhost.txt`:**

```nginx
location ^~ /_next/static { proxy_pass http://portal_backend; ... }
location /                { proxy_pass http://portal_backend; ... }
```

If anyone reintroduces a static-asset regex, or adds dedicated proxy blocks for `/portal`, `/api/portal`, or `/_next`, those new prefix blocks MUST also use `^~`. Otherwise the regex steals `.js`/`.css`, every Next.js bundle 404s, React can't hydrate — `useEffect`/`useAdminSession` never run, admin menus/change log/edit forms are invisible.

**Nginx location priority (highest → lowest):**

| Type | Example | Behavior |
|---|---|---|
| `= /path` | Exact | Checked first |
| `^~ /prefix` | Prefix, suppresses regex | Checked second, stops regex |
| `~* \.js$` | Regex (case-insensitive) | Checked third, overrides plain prefix |
| `/prefix` | Plain prefix | Lowest priority |

### Nginx Proxy Header Inheritance

**Critical rule:** ANY `proxy_set_header` directive inside a `location` block silently drops ALL `proxy_set_header` directives inherited from `server` scope. Nginx does not merge headers.

Required headers depend on block type.

**App/dynamic proxy blocks** (catch-all `location /`, future `^~ /portal`, `^~ /api/portal`, `^~ /_next`) — full forwarded set:

```nginx
proxy_pass http://portal_backend;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Connection "";
```

Missing header consequences:
- `Host` → wrong hostname, routing fails.
- `X-Real-IP` / `X-Forwarded-For` → audit logs record `127.0.0.1`.
- `X-Forwarded-Proto` → backend can't detect HTTPS, may emit insecure URLs.
- `Connection ""` → upstream keepalive breaks.

**Cache-only proxy blocks** (current `^~ /_next/static`) — only keepalive headers needed; content-hashed immutable assets don't need forwarded headers:

```nginx
proxy_pass http://portal_backend;
proxy_http_version 1.1;
proxy_set_header Connection "";
```

### Nginx Upstream Keepalive

Upstream uses `keepalive` for persistent connections to Node.js (saves 20–50 ms/request):

```nginx
upstream portal_backend {
  server 127.0.0.1:3000;
  keepalive 16;
}
```

Required in proxy blocks for keepalive:
- `proxy_http_version 1.1;`
- `proxy_set_header Connection "";` (empty — NOT `'upgrade'`, which forces per-request upgrade and defeats keepalive).

### Nginx `try_files` Ordering and Trailing Slash Rewrite

**Problem:** A page sharing a name with a directory (e.g. `results.html` + `results/` containing PDFs) returns 403 if nginx finds the directory first and attempts a listing.

**Fix in `backend/config/vhost.txt`:**

```nginx
location / {
    rewrite ^/(.+)/$ /$1 permanent;             # /results/ → /results
    try_files $uri $uri.html $uri/ /index.html; # .html before directory
}
```

Rewrite strips trailing slashes so `.html` check matches; try_files order serves `results.html` instead of listing. Direct file requests like `/results/2024/team.pdf` still match `$uri` as a regular file.

### Nginx Gzip + `next.config.js`

Nginx handles gzip → `compress: false` in `next.config.js`. Already configured. Do not re-enable Node compression.

### When Suggesting Nginx Changes

1. Provide exact text for `backend/config/vhost.txt`.
2. Highlight changed lines.
3. Remind user of clipboard-paste workflow (no SSH nginx commands).

## Troubleshooting

**Diagnostic checklist:**
1. First-time or subsequent? First-time prompts credentials; subsequent skips.
2. Interactive or CI/CD? CI/CD requires env vars.
3. Used `--setup`? Forces credential re-entry; otherwise preserves `.env.local`.
4. Portal serving traffic? If not, start with `.env.local` and PM2 logs.
5. "Deployed but site shows old content"? Run build-ID fingerprint check before anything else — see gotcha #8.

**Portal fails after deploy:**

```bash
ssh sfggc "cat $DEPLOY_APP_PATH/.env.local | grep -E '(DATABASE_URL|SMTP)'"
ssh sfggc "pm2 logs sfggc-portal --lines 100"
```

Missing/wrong credentials:

```bash
./deploy_scripts/deploy.sh --setup                          # interactive
export DEPLOY_DB_PASSWORD="..."; export DEPLOY_SMTP_PASSWORD="..."
./deploy_scripts/deploy.sh --setup --yes                    # CI/CD
```

**Build fails on server:**

```bash
ssh sfggc "cd $DEPLOY_APP_PATH && npm run build 2>&1 | tail -50"
```

Common causes: stale `next.config.js` with `output: 'export'` (deploy script auto-rewrites), missing deps, build-time errors.

## Key Files Reference

- `deploy_scripts/deploy.sh` — main entry point
- `deploy_scripts/lib/build.sh` — `write_server_mode_config()` template
- `deploy_scripts/lib/deploy-app.sh` — unified application deployment, credential handling
- `deploy_scripts/lib/deploy-migrations.sh` — migration runner
- `deploy_scripts/lib/ssh.sh` — SSH helpers (note the `ssh -n` invariant)
- `.deployrc.example` — production configuration template
- `deploy_docs/DEPLOYMENT.md` — quick-start guide
- `deploy_docs/UNIFIED_DEPLOYMENT.md` — full reference
- `deploy_docs/MIGRATIONS.md` — database migration system
- `backend/config/vhost.txt` — nginx configuration (deployed via CloudPanel ISP portal)
- `SERVER_SETUP.md` — server-side setup and troubleshooting

# SFGGC Website Deployment Guide

This guide covers deploying the SFGGC Next.js application to the production server.

The site runs as a **unified Next.js server** behind nginx. There is no static export: both the public marketing pages and the portal are served by a single PM2-managed Node.js process (`sfggc-portal`, port 3000). One command handles the entire deploy.

For deeper detail on flags, dry-run modes, and CI/CD, see [UNIFIED_DEPLOYMENT.md](UNIFIED_DEPLOYMENT.md). For nginx configuration management see the [Nginx Configuration Management](#nginx-configuration-management) section below.

## Prerequisites

- SSH access to the production server (CloudPanel-managed)
- Node.js and npm installed locally
- For first-time setup: database password, SMTP (AWS SES) password, and a super admin email/name/password

## SSH Key Setup (Recommended)

For passwordless deployment, set up SSH key authentication once.

### Automated Setup

```bash
./deploy_scripts/setup-ssh.sh <ssh_user@server> <server_alias>
```

The script generates an SSH key pair, configures `~/.ssh/config` with a friendly alias, helps you add the public key to the server, and tests the passwordless connection.

### Manual SSH Key Setup

```bash
# 1. Generate a key
ssh-keygen -t ed25519 -C "sfggc-deployment" -f ~/.ssh/id_ed25519_sfggc -N ""

# 2. Add to ~/.ssh/config
Host sfggc
    HostName <server-ip-or-hostname>
    User goldengateclassic
    IdentityFile ~/.ssh/id_ed25519_sfggc
    IdentitiesOnly yes

# 3. Push your public key
ssh-copy-id -i ~/.ssh/id_ed25519_sfggc.pub goldengateclassic@<server>

# 4. Test
ssh sfggc "echo Connection successful"
```

After SSH keys are set up, the deploy script picks up the alias automatically when `.deployrc` is configured. The provided [.deployrc.example](../.deployrc.example) ships with an IP address in `DEPLOY_SSH_HOST` so it works without local SSH config; switch it to your SSH alias (e.g. `DEPLOY_SSH_HOST="sfggc"`) in your `.deployrc` for cleaner output and passwordless deploys.

## Deploying

### Quick Start

From the project root:

```bash
# Preview what will happen (recommended first time)
./deploy_scripts/deploy.sh --dry-run --verbose

# Deploy
./deploy_scripts/deploy.sh

# Deploy non-interactively (skip "Do you want to deploy?" prompt)
./deploy_scripts/deploy.sh --yes
```

That's it. The script syncs code, installs dependencies on the server, runs database migrations, builds on the server (`npm run build` producing `.next/`), and restarts the PM2 process.

> **Important:** Always run deploy scripts from the project root, not from inside `deploy_scripts/` — they use repo-relative paths.

### What the Deploy Does

1. **Pre-flight checks** — verifies Node.js, npm, git, SSH connectivity, server Node.js, disk space.
2. **Sync files** — rsyncs the project to `DEPLOY_APP_PATH` on the server (excludes `node_modules/`, `.git/`, `.next/`, `out/`, `.env*`).
3. **Install dependencies** — runs `npm install --production` on the server.
4. **Set up environment** — creates `.env.local` on the server interactively (first deploy only, unless `--setup` is passed).
5. **Initialize database** — runs `bash scripts/dev/init-portal-db.sh` (idempotent).
6. **Run migrations** — executes every `*.sh` in `backend/scripts/migrations/` in alphabetical order (each script is idempotent and checks state before applying changes).
7. **Create super admin** — first deploy only, if no admins exist.
8. **Build on server** — validates `next.config.js` is in server mode (rewrites it if a stale `output: 'export'` is present), removes old `.next/`, runs `npm run build`.
9. **Manage PM2** — installs PM2 if missing, starts or restarts `sfggc-portal`, saves the process list, configures `@reboot pm2 resurrect` in crontab.
10. **Verify** — checks PM2 status, curls the homepage and `/portal/` for HTTP 200, and **fingerprints the public response** by comparing the server's `.next/BUILD_ID` against the `buildId` in the public homepage's `__NEXT_DATA__`. If they don't match (or the response isn't from Next.js at all), the deploy fails loudly with the exact remediation — usually "push `backend/config/vhost.txt` to CloudPanel." See [Build-ID Fingerprint Check](#build-id-fingerprint-check) below.

### Common Flags

| Flag | Purpose |
|---|---|
| `--dry-run` | Print what would happen without executing anything |
| `--verbose` | More detail in dry-run output |
| `--yes` / `-y` | Skip the deployment confirmation prompt |
| `--setup` | Force `.env.local` recreation (recover from broken credentials) |
| `--skip-migrations` | Skip migrations (not recommended) |
| `--config FILE` | Use an alternate config file instead of `.deployrc` |
| `--server HOST` | Override SSH host |
| `--user USER` | Override SSH user |

Run `./deploy_scripts/deploy.sh --help` for the full list.

> **Note:** The old `--static`, `--all`, and (silently) `--portal` flags are no longer supported. The script now hard-errors on `--static` / `--all` with a message pointing to the unified command. `--portal` is silently accepted for backwards compatibility.

### Configuration

Production defaults live in [.deployrc.example](../.deployrc.example) and are used automatically. Only create a custom `.deployrc` if you need different values (staging, alternate server, etc.). All secrets (database password, SMTP password, session secret) are prompted interactively on first deploy and stored on the server in `.env.local` — never in any local config file.

The required keys are:

```bash
DEPLOY_SSH_USER="goldengateclassic"
DEPLOY_SSH_HOST="sfggc"   # SSH alias preferred
DEPLOY_DOMAIN="www.goldengateclassic.org"
DEPLOY_APP_PATH="/home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app"
DEPLOY_PM2_APP_NAME="sfggc-portal"

# Non-secret database / SMTP infrastructure (passwords prompted, not stored here)
DEPLOY_DB_HOST="..."
DEPLOY_DB_PORT="3306"
DEPLOY_DB_NAME="goldengate"
DEPLOY_DB_USER="goldengate"
DEPLOY_SMTP_HOST="..."
DEPLOY_SMTP_PORT="587"
DEPLOY_SMTP_USER="..."
DEPLOY_SMTP_FROM="Golden Gate Classic <noreply@goldengateclassic.org>"
```

Always use full absolute paths in `DEPLOY_APP_PATH` (never `~/...`) — tildes are not reliably expanded in non-interactive SSH commands.

## Verifying the Deploy

After a successful deploy:

```bash
# Public homepage and portal should both return 200
curl -I https://www.goldengateclassic.org/
curl -I https://www.goldengateclassic.org/portal/

# PM2 status on the server
ssh sfggc "pm2 status sfggc-portal"

# Application logs
ssh sfggc "pm2 logs sfggc-portal --lines 50"
```

### Build-ID Fingerprint Check

The deploy script's final verification step is a build-ID fingerprint match. It reads `${DEPLOY_APP_PATH}/.next/BUILD_ID` on the server (Next.js writes this for every build) and extracts `"buildId":"..."` from the public homepage's `__NEXT_DATA__` JSON. The two must match.

This catches every kind of routing drift that an HTTP 200 check would miss:

- nginx vhost serving a stale static file from disk instead of proxying to Node.js
- CDN or proxy in front holding an old response
- The domain pointed at the wrong server
- An Apache `.htaccess` intercepting before nginx

The check has three outcomes:

| Outcome | What it means | Action |
|---|---|---|
| ✓ Match (`Public site serves the deployed build`) | nginx is proxying to the Next.js server you just deployed | None — deploy is fully verified |
| ✗ No `buildId` in public response | nginx is returning a non-Next.js response (usually a static file from disk) | Push `backend/config/vhost.txt` to CloudPanel (see [Nginx Configuration Management](#nginx-configuration-management)) |
| ✗ buildId mismatch | Public site is serving an older build than the one on the server | Likely vhost drift; could also be CDN cache or wrong server. Push vhost.txt; if mismatch persists, investigate the CDN/DNS path |

You can run the same fingerprint comparison manually any time:

```bash
SERVER_BID=$(ssh sfggc "cat /home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app/.next/BUILD_ID")
PUBLIC_BID=$(curl -fsSL https://www.goldengateclassic.org/ | grep -oE '"buildId":"[^"]+"' | head -1 | sed 's/.*"buildId":"\([^"]*\)".*/\1/')
echo "Server:  $SERVER_BID"
echo "Public:  $PUBLIC_BID"
[ "$SERVER_BID" = "$PUBLIC_BID" ] && echo "✓ MATCH" || echo "✗ MISMATCH"
```

The deploy script also runs these checks automatically and prints the results at the end.

## Updating the Site

There is no separate build/deploy split anymore — just run the deploy:

```bash
./deploy_scripts/deploy.sh
```

The build happens on the server, so you do not need to run `npm run build` locally.

## Troubleshooting

Most deployment issues are covered in [UNIFIED_DEPLOYMENT.md#troubleshooting](UNIFIED_DEPLOYMENT.md#troubleshooting). Server-side issues (PM2, nginx, SSL) are covered in [SERVER_SETUP.md](../SERVER_SETUP.md).

A few quick checks if things go wrong:

- **Pre-flight check fails on SSH** — re-run `setup-ssh.sh`, then `ssh sfggc "echo OK"`.
- **PM2 not online after deploy** — `ssh sfggc "pm2 logs sfggc-portal --lines 100"`. Common cause: bad credentials in `.env.local` (recover with `./deploy_scripts/deploy.sh --setup`).
- **Deploy fails at "Verifying public site serves the build we just deployed"** — nginx isn't proxying to your fresh build. Either the vhost in CloudPanel is out of sync with `backend/config/vhost.txt`, or there's a CDN/proxy holding stale content. Push the vhost via CloudPanel (see [Nginx Configuration Management](#nginx-configuration-management)).
- **Portal returns 502** — Node.js is down; check PM2 logs. See [Portal Returns 502 Bad Gateway](#troubleshooting) below.
- **Portal pages render but menus/forms are invisible** — `/_next/static/*.js` is 404'ing. Check that `^~ /_next/static` is present in `backend/config/vhost.txt`, and that no regex location is intercepting JS/CSS. See [Configuration File Structure](#configuration-file-structure).

## Nginx Configuration Management

The production server is ISP-controlled: you do NOT have direct SSH access to nginx (no `nginx -t`, no `systemctl reload nginx`, no editing `/etc/nginx/`). Nginx configuration lives in version control at [backend/config/vhost.txt](../backend/config/vhost.txt) and is deployed by copy-pasting into the CloudPanel ISP portal.

### When to Update Nginx Configuration

You need to update nginx when:

- Changing proxy settings (port, headers, timeouts)
- Modifying caching rules for build artifacts
- Adding dedicated location blocks for new routes (rare — the catch-all `location /` already forwards everything to Next.js, including `/portal` and `/api/portal`)
- Troubleshooting 502/503 errors

### Configuration Management Workflow

**1. Edit `backend/config/vhost.txt` locally and commit the change.**

**2. Copy the file contents to your clipboard:**

```bash
# macOS
cat backend/config/vhost.txt | pbcopy

# Linux (requires xclip)
cat backend/config/vhost.txt | xclip -selection clipboard

# Windows (WSL)
cat backend/config/vhost.txt | clip.exe
```

**3. Paste into the CloudPanel ISP portal:**

1. Log into CloudPanel.
2. Navigate to **Sites** → your domain → **Vhost** (or **Nginx** / **Web Server**).
3. Clear the existing configuration and paste.
4. Save. CloudPanel validates the syntax and reloads nginx automatically; errors are shown in the panel.

**4. Verify:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.goldengateclassic.org/
curl -s -o /dev/null -w "%{http_code}\n" https://www.goldengateclassic.org/portal/
curl -s -o /dev/null -w "%{http_code}\n" https://www.goldengateclassic.org/api/portal/admin/session
```

Expected: `200`, `200`, `401`. The `401` is correct — `/api/portal/admin/session` is auth-protected, so an unauthenticated check returning 401 proves the proxy is reaching the Next.js app. A `502` from any URL means the proxy is broken; a `404` from the session endpoint means nginx isn't proxying API routes to Node.js.

### Configuration File Structure

The current vhost is intentionally minimal: nginx terminates TLS, adds caching headers on `/_next/static`, and proxies everything to the Next.js upstream. There are no static-files-from-disk blocks, no `try_files`, and no static-asset regex.

**Upstream block (before `server {}`):**

```nginx
upstream portal_backend {
  server 127.0.0.1:3000;
  keepalive 16;
}
```

The `keepalive 16` directive maintains persistent connections between nginx and Node.js, saving 20–50 ms per request. It requires `proxy_set_header Connection ""` (empty string) in every proxied location block — never `'upgrade'`.

**Server / SSL configuration:** CloudPanel placeholders (`{{ssl_certificate}}`, `{{ssl_certificate_key}}`, `{{root}}`, etc.), HTTPS redirect, Let's Encrypt validation, and the standard `include /etc/nginx/global_settings`.

**Application proxy blocks:**

```nginx
# Next.js build artifacts — long-lived cache (filenames are content-hashed)
location ^~ /_next/static {
  proxy_pass http://portal_backend;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# Everything else (public pages, /portal, /api/portal, /_next dynamic) → Next.js
location / {
  proxy_pass http://portal_backend;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_cache_bypass $http_upgrade;
}
```

That's the entire application section. Next.js handles all routing (including the portal under `/portal` and API under `/api/portal`); nginx only proxies and adds cache headers on build artifacts.

> **WARNING — historical lesson, still load-bearing:** The `^~` modifier on `/_next/static` is deliberate. If anyone reintroduces a regex location like `~* \.(js|css|...)$` (for serving static assets from disk or adding cache headers), the regex would override a plain `/_next/static` prefix and break every Next.js JavaScript bundle, killing React hydration. Keep `^~` on `/_next/static` even though there is currently no regex competing with it — it's defensive.
>
> Similarly, if a future change adds dedicated proxy blocks for `/portal`, `/api/portal`, or `/_next`, those must also use `^~`.

> **Never use a fixed `alias`** for `/_next/static` pointing at a specific `.next/static` directory. Build IDs change every deploy. The current config proxies to Node.js (which serves the right build ID automatically) — keep it that way, or use `try_files $uri @portal_next` with a proxy fallback if you ever want disk-served assets.

### Common Configuration Tasks

**Change the portal port** — update the `upstream` block, not the individual location blocks:

```nginx
upstream portal_backend {
  server 127.0.0.1:3001;  # changed from 3000
  keepalive 16;
}
```

You also need to set `PORT=3001` in `.env.local` on the server.

**Add a custom header to portal proxy:**

```nginx
location ^~ /portal {
  proxy_pass http://portal_backend;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Connection "";
  proxy_set_header X-Custom-Header "value";   # ← new header
}
```

**Increase timeouts for long-running endpoints:**

```nginx
location ^~ /api/portal {
  proxy_pass http://portal_backend;
  # ... standard headers ...
  proxy_read_timeout 300s;
  proxy_connect_timeout 300s;
}
```

**IMPORTANT:** Always preserve the `^~` modifier when editing portal location blocks. Removing it will break the portal — see the warning above.

### Nginx Proxy Header Inheritance

**Critical rule:** When you add ANY `proxy_set_header` directive inside a `location` block, ALL `proxy_set_header` directives inherited from the parent `server` block are silently dropped. Nginx does not merge headers between scopes — the child block completely replaces the parent's headers.

In practice: every proxy `location` block must explicitly include every header it depends on. Don't rely on inheritance from the server-level scope.

**Required headers depend on what the block does.**

**Application/dynamic proxy blocks** (the catch-all `location /`, or any future `^~ /portal`, `^~ /api/portal`, `^~ /_next` blocks) need the full forwarded-headers set because Next.js relies on them for routing, audit logging, and HTTPS detection:

```nginx
proxy_pass http://portal_backend;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Connection "";
```

If you forget one:
- Missing `Host` → backend receives wrong hostname, routing fails.
- Missing `X-Real-IP` / `X-Forwarded-For` → audit logs record `127.0.0.1` instead of the real client IP.
- Missing `X-Forwarded-Proto` → backend cannot detect HTTPS, may generate insecure URLs.
- Missing `Connection ""` → keepalive to the upstream breaks (TCP handshake per request).

**Cache-only proxy blocks** (the current `^~ /_next/static` block) only need `proxy_http_version 1.1` and `Connection ""` for upstream keepalive — Next.js serves immutable, content-hashed assets here and doesn't care about the request's `Host` or `X-Forwarded-*` headers. Adding the full set is harmless but unnecessary.

When adding a new dynamic proxy block, copy the full header set from `location /` in the current vhost. When adding a new cache block, the two-line header set from `location ^~ /_next/static` is sufficient.

### What NOT to Do

These commands all require direct nginx access that you do not have:

```bash
nginx -t                    # No
systemctl reload nginx      # No
systemctl restart nginx     # No
sudo vim /etc/nginx/...     # No
```

CloudPanel handles validation and reload automatically when you save the vhost config in the portal.

### Troubleshooting

**Configuration rejected by ISP panel:**
- Check for syntax errors (missing semicolons, unclosed braces).
- Verify CloudPanel placeholders are preserved: `{{root}}`, `{{ssl_certificate}}`, `{{ssl_certificate_key}}`.

**Portal returns 502 Bad Gateway:**
1. Check Node.js is running: `ssh sfggc "pm2 status sfggc-portal"`.
2. Verify `proxy_pass` port in `upstream portal_backend` matches the app port (default 3000).
3. Check logs: `ssh sfggc "pm2 logs sfggc-portal --lines 100"`.

**Public pages work but portal does not (or vice versa):**

The current vhost proxies everything to the same Next.js upstream — there are no separate portal blocks. If only one path is broken, the issue is in the Node.js app, not nginx.
1. Test the upstream directly: `ssh sfggc "curl -I http://127.0.0.1:3000/portal/"`.
2. If localhost works but the public URL doesn't, the catch-all `location /` block is missing or misconfigured in `backend/config/vhost.txt`.
3. Check PM2 logs for app-side errors: `ssh sfggc "pm2 logs sfggc-portal --lines 100"`.

**Portal pages load but menus, forms, or the change log are missing (no interactivity):**
1. Open browser DevTools → Network → check for 404s on `/_next/static/chunks/*.js`.
2. If JS files 404, a regex location (`~* \.(js|css|...)$`) is intercepting them. The current vhost has no such regex — if one was added, every prefix block that needs to serve JS/CSS must use `^~`. At minimum `^~ /_next/static` must remain present (currently the only prefix needing it).
3. The fix is to either remove the regex location or add `^~` to every competing prefix block.

**Static assets break after a build (`/_next/static/*` 404):**
- The current vhost proxies `/_next/static` to Node.js, which always serves the current build ID. If you see 404s, check that `proxy_pass http://portal_backend` is still inside the `^~ /_next/static` block and that PM2 is running.
- **Never** replace the proxy with a fixed `alias` pointing at a specific `.next/static` directory — build IDs change every deploy and the alias path would go stale.

**Changes not taking effect:**
1. Verify you saved in the ISP control panel.
2. Check the panel for error messages reported during save.
3. Wait 30–60 seconds for nginx reload.
4. Clear browser cache.

### Version Control Best Practices

Always commit vhost changes alongside the change that requires them. Good commit messages name the specific thing changing (the port, the timeout, the location block) rather than just "Update nginx".

If a nginx change requires a corresponding code change, document the coupling in the commit body so reviewers understand they must land together.

## Portal Application Details

For the portal-specific environment variables, database schema, migrations, and admin account flow, see [PORTAL_DEPLOYMENT.md](PORTAL_DEPLOYMENT.md). For the migration system itself, see [MIGRATIONS.md](MIGRATIONS.md).

## Security Notes

- Keep SSH keys secure and use SSH alias + keys (no password auth).
- Secrets live only in `.env.local` on the server and in the database (bcrypt-hashed admin passwords). Never check secrets into the repo or `.deployrc`.
- SSL certificates are managed by CloudPanel.
- Migrations are idempotent and audit logs capture all admin actions.

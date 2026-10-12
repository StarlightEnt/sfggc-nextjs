# Unified Deployment Guide

This document covers the deployment system in depth. For the quick-start path, see [DEPLOYMENT.md](DEPLOYMENT.md).

The site deploys as a single Next.js server (PM2 process `sfggc-portal`, port 3000) behind nginx. One command — `./deploy_scripts/deploy.sh` — does the entire deploy: file sync, dependency install, database migrations, build on the server, and PM2 restart. There is no static export, no separate "portal vs static" deploy, and no local build step.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [What the Deploy Does](#what-the-deploy-does)
- [First-Time Setup](#first-time-setup)
- [Command Line Flags](#command-line-flags)
- [Dry-Run Mode](#dry-run-mode)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)
- [Additional Resources](#additional-resources)

---

## Quick Start

### Prerequisites

- Node.js and npm installed locally
- SSH access to production configured (see [DEPLOYMENT.md](DEPLOYMENT.md#ssh-key-setup-recommended))
- For first-time setup: database password (AWS RDS), SMTP password (AWS SES), admin email/name/password

### Basic Usage

```bash
# Preview without changing anything
./deploy_scripts/deploy.sh --dry-run --verbose

# Deploy
./deploy_scripts/deploy.sh

# Deploy non-interactively (skip "Do you want to deploy?")
./deploy_scripts/deploy.sh --yes

# Force environment reconfiguration (recover from broken .env.local)
./deploy_scripts/deploy.sh --setup

# Fully non-interactive (CI/CD)
export DEPLOY_DB_PASSWORD="..." DEPLOY_SMTP_PASSWORD="..."
./deploy_scripts/deploy.sh --yes
```

> **Important:** Run from the project root, not from inside `deploy_scripts/`. The script uses repo-relative paths.

> **Note:** The old `--static` and `--all` flags now hard-error out — the unified deploy is the only mode. `--portal` is silently accepted for backwards compatibility.

---

## Configuration

### Default Configuration (No Setup Required)

The script uses `.deployrc.example` automatically, which contains correct production values. You typically don't need a custom config.

### Custom Configuration (Optional)

Only create a custom `.deployrc` if you need different values (e.g. staging):

```bash
cp .deployrc.example .deployrc
nano .deployrc      # edit values
chmod 600 .deployrc
```

The script uses `.deployrc` if it exists, otherwise falls back to `.deployrc.example`.

### Configuration Keys

**IMPORTANT:** Config files contain ONLY non-secret infrastructure settings. Secrets (passwords, session secret) are collected interactively during deployment and stored on the server in `.env.local`, never in local config.

```bash
# SSH
DEPLOY_SSH_USER="goldengateclassic"
DEPLOY_SSH_HOST="sfggc"                          # SSH alias preferred
DEPLOY_DOMAIN="www.goldengateclassic.org"

# Application
DEPLOY_APP_PATH="/home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app"
DEPLOY_PM2_APP_NAME="sfggc-portal"

# Database (non-secret)
DEPLOY_DB_HOST="..."
DEPLOY_DB_PORT="3306"
DEPLOY_DB_NAME="goldengate"
DEPLOY_DB_USER="goldengate"

# SMTP (non-secret)
DEPLOY_SMTP_HOST="..."
DEPLOY_SMTP_PORT="587"
DEPLOY_SMTP_USER="..."
DEPLOY_SMTP_FROM="Golden Gate Classic <noreply@goldengateclassic.org>"
```

> Always use absolute paths in `DEPLOY_APP_PATH` (e.g. `/home/username/...`), never tildes. Tildes are not reliably expanded in non-interactive SSH commands and can cause file-existence checks to fail silently.

Database and SMTP passwords are NOT in `.deployrc` — they are prompted on first deploy and stored in `.env.local` on the server.

---

## What the Deploy Does

Every deploy runs the same sequence:

1. **Pre-flight checks** — Node.js, npm, git, SSH connectivity, server Node.js, disk space.
2. **Sync files** — `rsync -az --delete` to `DEPLOY_APP_PATH`. Excludes `node_modules/`, `.git/`, `.next/`, `out/`, `.env*`, and any `deploy_temp_*`.
3. **Install dependencies** — `npm install --production` on the server.
4. **Set up environment** — creates `.env.local` interactively (first deploy only, unless `--setup` is passed).
5. **Initialize database schema** — `bash scripts/dev/init-portal-db.sh` (idempotent).
6. **Run database migrations** — every `*.sh` in `backend/scripts/migrations/` in alphabetical order. Each migration is idempotent.
7. **Create super admin** — first deploy only, if no admins exist.
8. **Build on server** — validates `next.config.js` is in server mode (rewrites it if a stale `output: 'export'` is found), removes old `.next/`, runs `npm run build` to produce `.next/`.
9. **Manage PM2** — installs PM2 if missing, starts or restarts `sfggc-portal`, saves the PM2 process list, configures `@reboot pm2 resurrect` in crontab.
10. **Verify** — checks PM2 status, curls the homepage and `/portal/` for HTTP 200, and fingerprints the response: reads `${DEPLOY_APP_PATH}/.next/BUILD_ID` on the server and compares it to the `buildId` in the public homepage's `__NEXT_DATA__`. Mismatch (or a non-Next.js response) fails the deploy. See [Build-ID Fingerprint Check](DEPLOYMENT.md#build-id-fingerprint-check) for the full mechanism, failure modes, and manual command.

The build happens on the server, not locally. You don't need to run `npm run build` before deploying.

---

## First-Time Setup

The first deploy prompts for credentials and creates a super admin. Subsequent deploys skip these steps because `.env.local` and admin rows already exist.

### Interactive Prompts (Default)

```
Database Configuration:
ℹ Database username: goldengate (from config)
  Database password: ********

  Admin session secret [auto-generated]:    (press Enter to accept)
  SMTP password (AWS SES): ********
  Portal base URL [https://www.goldengateclassic.org]:

No admin accounts found. Creating super admin account.
  Admin email: admin@goldengateclassic.org
  Admin full name: Admin User
  Admin password: ********
```

### Non-Interactive Mode (CI/CD)

Provide credentials via environment variables to skip prompts. Required for non-interactive runs:

```bash
# Required on first deploy / --setup
export DEPLOY_DB_PASSWORD="..."
export DEPLOY_SMTP_PASSWORD="..."

# Required only on first deploy (when no admins exist yet)
export DEPLOY_ADMIN_EMAIL="..."
export DEPLOY_ADMIN_NAME="..."
export DEPLOY_ADMIN_PASSWORD="..."

./deploy_scripts/deploy.sh --yes
```

Optional overrides — auto-generated/defaulted if omitted (the script silently uses the defaults in non-interactive mode):

```bash
export DEPLOY_SESSION_SECRET="..."             # random 32-byte hex if unset
export DEPLOY_PORTAL_BASE_URL="..."            # defaults to https://$DEPLOY_DOMAIN
```

**Safeguard:** When stdin is not a terminal (piped input, CI runner) and a required env var is missing, the script fails fast with an actionable error rather than writing empty credentials. Optional env vars never hang the script in non-interactive mode — defaults are used silently.

### GitHub Actions Example

First-time deployment:

```yaml
- name: Deploy (first time)
  env:
    DEPLOY_DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    DEPLOY_SMTP_PASSWORD: ${{ secrets.SMTP_PASSWORD }}
    DEPLOY_ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
    DEPLOY_ADMIN_NAME: ${{ secrets.ADMIN_NAME }}
    DEPLOY_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
  run: ./deploy_scripts/deploy.sh --yes
```

Subsequent deploys (credentials already on server):

```yaml
- name: Deploy
  run: ./deploy_scripts/deploy.sh --yes
```

To rotate credentials:

```yaml
- name: Rotate credentials
  env:
    DEPLOY_DB_PASSWORD: ${{ secrets.NEW_DB_PASSWORD }}
    DEPLOY_SMTP_PASSWORD: ${{ secrets.NEW_SMTP_PASSWORD }}
  run: ./deploy_scripts/deploy.sh --setup --yes
```

### What Gets Created on First Deploy

1. **`.env.local` on the server** with `PORTAL_DATABASE_URL`, `ADMIN_SESSION_SECRET`, `PORTAL_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
2. **Database schema** (`people`, `teams`, `doubles_pairs`, `scores`, `admins`, `audit_logs`, `participant_login_tokens`, `admin_password_resets`, etc.).
3. **Super admin** in the `admins` table with a bcrypt-hashed password and role `super-admin`.

### Where Secrets Live

- **Local `.deployrc`:** ONLY non-secret infrastructure (hosts, ports, paths).
- **Server `.env.local`:** real secrets (DB password, SMTP password, session secret).
- **Database:** admin account with bcrypt-hashed password.
- **Your terminal:** secrets visible briefly during prompts, never logged.

Secrets never touch your local filesystem in any config file.

---

## Command Line Flags

| Flag | Short | Purpose |
|---|---|---|
| `--dry-run` | | Print what would happen without executing |
| `--verbose` | | More detail in dry-run output |
| `--debug` | | Full debug output (implies `--verbose`) |
| `--yes` | `-y` | Skip the deployment confirmation prompt |
| `--force` | | Alias for `--yes` (backwards-compatible) |
| `--setup` | | Force `.env.local` reconfiguration |
| `--skip-migrations` | | Skip database migrations (not recommended) |
| `--config FILE` | | Use an alternate config file |
| `--server HOST` | | Override SSH host |
| `--user USER` | | Override SSH user |
| `--help` | `-h` | Print help |

### Removed Flags

| Flag | What to use instead |
|---|---|
| `--static` | Just `./deploy_scripts/deploy.sh` (hard error if you pass `--static`) |
| `--all` | Just `./deploy_scripts/deploy.sh` (hard error if you pass `--all`) |
| `--portal` | Silently accepted; the deploy is unified, so this flag is a no-op |

### Flag Behavior Notes

**`--yes` / `-y`:**
- Skips the "Do you want to deploy? [y/N]" prompt.
- Does NOT skip credential prompts during first-time setup. Use environment variables for that.

**`--setup`:**
- Forces `.env.local` to be recreated on the server, even if it exists.
- Use cases: recover from broken `.env.local`, rotate credentials, change session secret or base URL.
- Does NOT delete or recreate admin accounts.
- Does NOT skip the confirmation prompt — combine with `--yes` for unattended runs.

### Common Combinations

| Scenario | Command |
|---|---|
| First interactive deploy | `./deploy_scripts/deploy.sh` |
| First CI/CD deploy | env vars + `./deploy_scripts/deploy.sh --yes` |
| Routine update | `./deploy_scripts/deploy.sh --yes` |
| Fix broken `.env.local` | `./deploy_scripts/deploy.sh --setup` |
| Rotate credentials in CI | env vars + `./deploy_scripts/deploy.sh --setup --yes` |

---

## Dry-Run Mode

Preview without making changes.

```bash
# Basic dry-run
./deploy_scripts/deploy.sh --dry-run

# Show what each step would do
./deploy_scripts/deploy.sh --dry-run --verbose

# Full environment + command traces
./deploy_scripts/deploy.sh --dry-run --debug
```

In dry-run mode `ssh_command` prints commands instead of executing them. You may notice some odd-looking output where command strings appear as "data" — these are harmless display artifacts that disappear in a real run.

---

## Troubleshooting

### Pre-flight: SSH connection failed

```
✗ SSH connection failed
```

- Re-run `./deploy_scripts/setup-ssh.sh <user@host> <alias>`.
- Test manually: `ssh sfggc 'echo OK'`.
- Make sure `.deployrc` uses your SSH alias in `DEPLOY_SSH_HOST`, not just an IP.

### Build failed on the server

```
✗ Build failed
```

- SSH in and look at the build output: `ssh sfggc "cd $DEPLOY_APP_PATH && npm run build 2>&1 | tail -50"`.
- Verify `next.config.js` is in server mode (no `output: 'export'`). The deploy script auto-rewrites this if it detects a stale config, but local-machine checks won't.
- Confirm dependencies installed cleanly: `ssh sfggc "cd $DEPLOY_APP_PATH && npm install --production"`.

### Portal won't start (PM2 issue)

```
✗ PM2 process is not running
```

```bash
ssh sfggc "pm2 logs sfggc-portal --lines 100"
```

Common causes:
- Bad credentials in `.env.local` (recover with `--setup`).
- Port 3000 already in use by another process.
- Build artifact missing (`.next/` not produced — check the build step).

### Portal returns 502

1. Check PM2: `ssh sfggc "pm2 status sfggc-portal"`.
2. Confirm `upstream portal_backend` in `backend/config/vhost.txt` points to the right port.
3. See [DEPLOYMENT.md#nginx-configuration-management](DEPLOYMENT.md#nginx-configuration-management) for the vhost workflow.

### Deploy fails at "Verifying public site serves the build we just deployed"

The fingerprint check at the end of the deploy compares `${DEPLOY_APP_PATH}/.next/BUILD_ID` on the server against the `buildId` embedded in the public homepage. Two variants of the failure:

**No `buildId` in public response:**
```
✗ Public homepage response has no Next.js buildId — nginx is not proxying to Node.js
```

nginx is returning a non-Next.js response — almost always a stale static file from disk (look for nginx-style `<hex>-<hex>` etag and `last-modified` headers in the raw response). The fix: push `backend/config/vhost.txt` to CloudPanel.

```bash
cat backend/config/vhost.txt | pbcopy
# CloudPanel → Sites → www.goldengateclassic.org → Vhost → paste → save
curl -s https://www.goldengateclassic.org/ | grep -oE '"buildId":"[^"]+"'
```

The current build ID should now appear.

**Mismatched buildIds:**
```
✗ Public site is serving a different build than the one just deployed
   Server build:    a9OWyPU_EzVMzhHPEQgtF
   Public response: sPPhhw451mwPAhK8Bf4jY
```

The server has the new build but the public URL is returning an older one. Causes, in order of likelihood:
1. nginx vhost out of sync with `backend/config/vhost.txt` (push it).
2. A CDN/proxy in front holding a cached response (purge it, or wait for TTL).
3. The domain is pointing at the wrong server.

See [DEPLOYMENT.md#build-id-fingerprint-check](DEPLOYMENT.md#build-id-fingerprint-check) for the full mechanism and a copy-pasteable manual check.

### Portal pages load but menus / forms / change log are invisible

**Cause:** Something is intercepting `/_next/static/chunks/*.js` requests and returning 404. React can't hydrate without its bundles. The usual culprit is a regex location (`~* \.(js|css|...)$`) added without making the corresponding prefix blocks use `^~`.

**Fix:** Verify the current vhost still has `^~` on `/_next/static`. If anyone has added a static-asset regex, every prefix block that needs to serve `.js`/`.css` (including `/portal`, `/api/portal`, `/_next`) must use `^~` too:

```nginx
location ^~ /_next/static { proxy_pass http://portal_backend; ... }
location /                { proxy_pass http://portal_backend; ... }
```

Push the updated config via the ISP control panel. See [DEPLOYMENT.md#configuration-file-structure](DEPLOYMENT.md#configuration-file-structure) and [NGINX_SETUP.md](NGINX_SETUP.md).

### `/_next/static/*` returns 404 after a deploy

**Cause:** the `^~ /_next/static` block uses a fixed `alias` pointing at a specific path. Build IDs change every deploy, and a stale alias path can't resolve the new IDs.

**Fix:** the current vhost proxies `/_next/static` to Node.js (which always serves the right build ID). Don't switch back to a fixed `alias`. If you want disk-served assets, use `try_files $uri @portal_next` with a proxy fallback rather than a fixed `alias`.

### SSR pages broken (redirects, 404s, or empty data)

**Cause:** `getServerSideProps` internal API calls were routing through the external HTTPS URL (`https://www.goldengateclassic.org`) and hitting hairpin-NAT problems on the cloud server.

**Fix:** the `buildBaseUrl()` helper in `src/utils/portal/ssr-helpers.js` must always return `http://localhost:${PORT}` for internal fetches. Never use `req.headers.host`.

### Nginx proxy headers missing after adding a custom header

**Cause:** adding ANY `proxy_set_header` directive inside a `location` block drops all inherited `proxy_set_header` directives from the parent scope. Nginx does not merge — the child fully replaces the parent.

**Fix:** every proxy location block must explicitly include `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, and `Connection ""`. See [DEPLOYMENT.md#nginx-proxy-header-inheritance](DEPLOYMENT.md#nginx-proxy-header-inheritance).

### Migrations only run partially (only the first one executes)

**Cause:** historical bug — `ssh` without `-n` consumes stdin, and the migration runner reads paths from a `while read` loop. The fix is `ssh -n` in `deploy_scripts/lib/ssh.sh`.

**Fix:** already shipped. Pull latest code if you see this.

### `.env.local` deleted after deploy

**Cause:** historical bug — the static-site rsync used `--delete` and did not exclude `portal-app/`, wiping the portal directory including `.env.local`.

**Fix:** no longer relevant. The unified deploy rsyncs directly to `DEPLOY_APP_PATH` with `--exclude='.env*'`, so `.env.local` is never deleted or overwritten.

### Portal responses are slow or double-compressed

**Cause:** historical bug — generated `next.config.js` was missing `compress: false`, so Node.js compressed responses on top of nginx's gzip.

**Fix:** the deploy script writes `compress: false` into the server-mode config (see `write_server_mode_config` in `deploy_scripts/lib/build.sh`). Verify:

```bash
curl -s -D - -o /dev/null -H "Accept-Encoding: gzip" https://www.goldengateclassic.org/portal | grep -i content-encoding
```

You should see one `Content-Encoding: gzip` (from nginx), not two.

### First-time setup prompts don't appear

`.env.local` already exists on the server. Use `--setup` to force reconfiguration:

```bash
./deploy_scripts/deploy.sh --setup
```

Or manually remove and redeploy:

```bash
ssh sfggc "rm $DEPLOY_APP_PATH/.env.local"
./deploy_scripts/deploy.sh
```

### Broken `.env.local` with empty passwords

**Cause:** historical bug from an earlier version of the script — the `--force` flag could cause silent credential failures during first-time setup.

**Fix:** the current script properly separates `--yes` (confirmation skip) from credential collection. Recover with:

```bash
./deploy_scripts/deploy.sh --setup
```

### Deploy creates an admin even though admins exist

**Cause:** historical bug — `node -e` couldn't read `PORTAL_DATABASE_URL` because `source .env.local` didn't export variables to child processes.

**Fix:** the script now uses `set -a` before `source` to auto-export. Pull latest if you see this.

### Node.js not found on server (NVM users)

NVM doesn't load in non-interactive SSH sessions. Add NVM initialization to the top of `~/.bashrc` on the server (before the non-interactive-shell guard):

```bash
# At the very top of ~/.bashrc:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Verify: `ssh sfggc "node --version"`.

---

## Advanced Usage

### Override Configuration via CLI

```bash
./deploy_scripts/deploy.sh --server <host>
./deploy_scripts/deploy.sh --user <user>
./deploy_scripts/deploy.sh --server prod.example.com --user deploy
```

### Use an Alternate Config File

```bash
cp .deployrc.example .deployrc.staging
# edit values
./deploy_scripts/deploy.sh --config .deployrc.staging
```

### Force Environment Reconfiguration

```bash
./deploy_scripts/deploy.sh --setup
./deploy_scripts/deploy.sh --setup --yes      # unattended
```

What `--setup` does:
- Deletes the existing `.env.local` on the server.
- Re-prompts (or reads env vars) for DB password, SMTP password, session secret, base URL.
- Creates a fresh `.env.local`.
- Does NOT recreate admin accounts.

### Always Test with Dry-Run First

```bash
./deploy_scripts/deploy.sh --dry-run --verbose
# review carefully, then:
./deploy_scripts/deploy.sh
```

---

## Additional Resources

- **Deployment Quick Start:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Portal Application Details:** [PORTAL_DEPLOYMENT.md](PORTAL_DEPLOYMENT.md)
- **Server Setup & Troubleshooting:** [../SERVER_SETUP.md](../SERVER_SETUP.md)
- **Database Migrations:** [MIGRATIONS.md](MIGRATIONS.md)
- **Nginx Configuration:** [DEPLOYMENT.md#nginx-configuration-management](DEPLOYMENT.md#nginx-configuration-management)
- **AI agent context for deploy patterns:** [../CLAUDE-DEPLOYMENT.md](../CLAUDE-DEPLOYMENT.md)

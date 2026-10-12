# Portal Deployment Guide

This guide covers deploying the SFGGC tournament portal (admin dashboard + participant login) to the production CloudPanel server. The portal is part of a unified Next.js server — the same Node.js process serves the public marketing pages and the portal. Both are deployed together by a single command.

For general deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) and [UNIFIED_DEPLOYMENT.md](UNIFIED_DEPLOYMENT.md). This document focuses on portal-specific concerns (database, admin account, SMTP, schema).

## Server Details

| Resource | Value |
|----------|-------|
| Application directory | `/home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app` |
| Database | MariaDB; host from `DEPLOY_DB_HOST`, database `goldengate` |
| SMTP | Host, port and user from `DEPLOY_SMTP_*` (see `.deployrc.example`) |
| Process manager | PM2 (`sfggc-portal`, port 3000) |
| Web server | nginx (CloudPanel-managed; vhost in `backend/config/vhost.txt`) |

## Quick Deploy

The unified deployment script handles everything: file sync, dependency install, database init + migrations, build on server, PM2 setup, and verification.

```bash
# Run from the project root directory
./deploy_scripts/deploy.sh

# Skip the "Do you want to deploy?" prompt
./deploy_scripts/deploy.sh --yes

# Force environment reconfiguration (if .env.local is broken)
./deploy_scripts/deploy.sh --setup

# Combine flags
./deploy_scripts/deploy.sh --setup --yes
```

**First deploy:** The script detects no `.env.local` on the server and interactively prompts for:
- Database password (username is pre-configured as `goldengate`)
- Admin session secret (auto-generates a default)
- SMTP password
- First super-admin account (email, name, password)

**Subsequent deploys:** Skip environment and admin setup, sync files, reinstall dependencies, run any new migrations, rebuild on the server, and restart PM2.

**Useful flags:**
- `--yes` / `-y`: Skip the deployment confirmation prompt (does not affect credential prompts).
- `--setup`: Force `.env.local` reconfiguration. Useful for recovering from broken credentials or rotating secrets.

> The nginx vhost is already configured and lives in [backend/config/vhost.txt](../backend/config/vhost.txt). You only need to push it to CloudPanel when you change it — not on every deploy. See [DEPLOYMENT.md#nginx-configuration-management](DEPLOYMENT.md#nginx-configuration-management).

---

## Manual Deploy (Step-by-Step)

### 1. Environment Variables

Create `.env.local` in the portal app directory on the server:

```bash
# Database
PORTAL_DATABASE_URL=mysql://USER:PASSWORD@YOUR-DB-HOST:3306/goldengate

# Session signing
ADMIN_SESSION_SECRET=replace-with-a-long-random-string

# Public URL (used in email links)
PORTAL_BASE_URL=https://www.goldengateclassic.org

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=Golden Gate Classic <noreply@goldengateclassic.org>
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORTAL_DATABASE_URL` | Yes | MariaDB connection string |
| `ADMIN_SESSION_SECRET` | Yes | Secret for signing session tokens (use `openssl rand -hex 32`) |
| `PORTAL_BASE_URL` | Yes | Public URL of the site (used in login email links) |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (default: 587 for STARTTLS, or 465 for TLS) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password |
| `SMTP_FROM` | No | From address (default: `Golden Gate Classic <noreply@goldengateclassic.org>`) |

### 2. Sync Files to Server

```bash
rsync -az --delete \
  --exclude='node_modules/' --exclude='.git/' --exclude='.next/' \
  --exclude='out/' --exclude='.env*' \
  ./ goldengateclassic@<server>:/home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app/
```

Use absolute paths on the remote, never `~/...` — tildes are not reliably expanded in non-interactive SSH commands and can cause file-existence checks to fail silently.

### 3. Install Dependencies

```bash
ssh <server>
cd /home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app
npm install --production
```

### 4. Database Setup

Initialize the database schema (safe to re-run; uses `CREATE TABLE IF NOT EXISTS`):

```bash
bash scripts/dev/init-portal-db.sh
```

Or load the schema manually:

```bash
mysql -h YOUR-DB-HOST -P 3306 -u USER -p goldengate < portal_docs/sql/portal_schema.sql
```

### 5. Create Super Admin

```bash
export PORTAL_DATABASE_URL="mysql://USER:PASSWORD@YOUR-DB-HOST:3306/goldengate"
export ADMIN_EMAIL="admin@goldengateclassic.org"
export ADMIN_NAME="Admin Name"
export ADMIN_PASSWORD="a-strong-password"
bash backend/scripts/admin/create-super-admin.sh
```

### 6. Build and Start

Before building, verify that `next.config.js` includes `compress: false`. Since nginx handles gzip compression, Node.js must not also compress responses. Double-compression wastes CPU and can corrupt data.

```javascript
// next.config.js (server mode, on the server)
module.exports = {
  compress: false,  // nginx handles compression
  // ... other settings
};
```

Then build and start:

```bash
npm run build
npm install -g pm2
pm2 start npm --name sfggc-portal -- start
pm2 save
```

Set up PM2 auto-restart on reboot:

```bash
# Add to crontab
PM2_PATH=$(which pm2)
(crontab -l 2>/dev/null; echo "@reboot $PM2_PATH resurrect &> /dev/null") | crontab -
```

### 7. Nginx Configuration (CloudPanel)

The current nginx vhost lives in version control at [backend/config/vhost.txt](../backend/config/vhost.txt) and proxies all traffic — public pages, portal pages, API routes, and dynamic Next.js endpoints — to the unified Next.js server on port 3000. There is no static file serving from disk.

The vhost is intentionally minimal:

```nginx
# Upstream (before the server block)
upstream portal_backend {
    server 127.0.0.1:3000;
    keepalive 16;    # persistent connections, saves 20-50ms/request
}

# Build artifacts — long-lived cache headers
location ^~ /_next/static {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Catch-all — everything else goes to Next.js
location / {
    proxy_pass http://portal_backend;
    # ... standard proxy headers ...
}
```

**CRITICAL:** The `^~` on `/_next/static` is defensive. If anyone reintroduces a regex location like `~* \.(js|css|...)$`, or adds dedicated `/portal`, `/api/portal`, or `/_next` proxy blocks, those new prefix blocks MUST also use `^~`. Otherwise the regex hijacks `/_next/static/*.js` requests, returns 404 for every Next.js bundle, and breaks React hydration entirely — pages load but every interactive element (menus, forms, change log) is invisible.

**You do not have direct nginx access** (no `nginx -t`, no `systemctl reload nginx`). To push a new vhost:

1. Edit `backend/config/vhost.txt` locally and commit.
2. Copy to clipboard: `cat backend/config/vhost.txt | pbcopy` (macOS).
3. Log into the CloudPanel ISP portal → Sites → domain → Vhost (or Nginx Config).
4. Paste, save. CloudPanel validates syntax and reloads nginx automatically.
5. Verify: `curl -I https://www.goldengateclassic.org/portal/`.

For the full workflow, proxy header rules, and additional troubleshooting, see [DEPLOYMENT.md#nginx-configuration-management](DEPLOYMENT.md#nginx-configuration-management).

### 8. Import Data

Import IGBO registration XML via the admin dashboard (Import XML button) or from the command line:

```bash
bash scripts/dev/import-igbo-xml.sh /path/to/igbo.xml
```

### 9. Test

1. Admin login: `https://www.goldengateclassic.org/portal/admin/`
2. Participant login: `https://www.goldengateclassic.org/portal/participant/`
3. Enter a registered participant's email and verify the magic link email arrives
4. Click the link and confirm it logs you in

### 10. Deploying Updates

```bash
# From your local machine (project root)
./deploy_scripts/deploy.sh --yes
```

Or manually if you need to bypass the unified script:

```bash
rsync -az --delete \
  --exclude='node_modules/' --exclude='.git/' --exclude='.next/' \
  --exclude='out/' --exclude='.env*' \
  ./ <user>@<server>:/home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app/

ssh <user>@<server> "cd /home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app && \
  npm install --production && \
  npm run build && \
  pm2 restart sfggc-portal"
```

---

## Troubleshooting

### Portal returns 502 Bad Gateway
The Next.js process isn't running. Check:
```bash
pm2 status
pm2 logs sfggc-portal --lines 50
```

### Login email not arriving
1. Verify SMTP vars in `.env.local` (especially `SMTP_PASS`)
2. Check server firewall allows outbound on the SMTP port: `nc -zv YOUR-SMTP-HOST 587`
3. Check that your SMTP provider accepts the sender address in `SMTP_FROM`
4. Check PM2 logs for SMTP errors: `pm2 logs sfggc-portal --lines 50`

### Database connection errors
1. Verify `PORTAL_DATABASE_URL` in `.env.local`
2. Test connectivity: `mysql -h YOUR-DB-HOST -P 3306 -u USER -p goldengate -e "SELECT 1;"`
3. Check that the database allows connections from the CloudPanel server's IP

### Session issues after deploy
Sessions are signed with `ADMIN_SESSION_SECRET`. If this value changes, all existing sessions are invalidated and users must log in again. This is expected and not harmful.

### SSR Pages Broken After Nginx Changes (Redirects, 404s, Empty Data)

After deploying nginx vhost changes, server-rendered portal pages may break: participant detail redirects to login, admin detail returns 404, team pages show empty data.

**Root Cause:** Internal SSR API fetches must use `http://localhost:3000`, not the public URL. If `buildBaseUrl()` in `src/utils/portal/ssr-helpers.js` constructs a URL using `req.headers.host`, the SSR fetch loops through nginx and back to Node.js. Cloud servers often cannot connect to their own public IP (hairpin NAT), and even when they can, cookies and headers may be altered in the round-trip.

**Quick diagnosis:**
```bash
# Direct to Node.js (works)
curl -b "session=COOKIE" http://localhost:3000/api/portal/participants/12345

# Through nginx (fails or returns wrong data)
curl -b "session=COOKIE" https://www.goldengateclassic.org/api/portal/participants/12345
```

**Fix:** Ensure `buildBaseUrl()` returns `http://localhost:${PORT}`. See `SERVER_SETUP.md#troubleshooting-nginx-issues` for the full explanation.

### Public site pages return 404
The unified vhost proxies `location /` to the same Node.js upstream as the portal. If public pages 404, the upstream (PM2 process `sfggc-portal`) is down or the `location /` block is missing from `backend/config/vhost.txt`. Check `pm2 status sfggc-portal` and confirm the vhost was pushed via CloudPanel.

### Broken .env.local with empty passwords
If the portal won't start and you see empty passwords in `.env.local` on the server, use `--setup` to force reconfiguration:

```bash
./deploy_scripts/deploy.sh --setup
```

This can happen if an older version of the deployment script was used with `--force` during first-time setup. The current script properly separates `--yes` (confirmation skip) from credential collection and fails fast in non-interactive mode without env vars.

See [UNIFIED_DEPLOYMENT.md#broken-envlocal-with-empty-passwords](UNIFIED_DEPLOYMENT.md#broken-envlocal-with-empty-passwords) for more.

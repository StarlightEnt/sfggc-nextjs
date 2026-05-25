# Server Setup Guide for SFGGC Website Deployment

## Permission Issues Resolution

The deployment is failing due to permission issues. Here are several solutions to fix this:

### Option 1: Fix Directory Permissions (Recommended)

SSH into your server and run these commands:

```bash
# SSH into your server
ssh goldengateclassic@54.70.1.215

# Navigate to the parent directory
cd /home/goldengateclassic/htdocs

# Check current permissions
ls -la

# Fix ownership of the website directory
sudo chown -R goldengateclassic:goldengateclassic www.goldengateclassic.org

# Set proper permissions
sudo chmod -R 755 www.goldengateclassic.org

# Ensure the user can write to the directory
sudo chmod 775 www.goldengateclassic.org
```

### Option 2: Use Sudo for Deployment

If you have sudo access, you can modify the deployment to use sudo:

```bash
# Create a deployment script that uses sudo
ssh goldengateclassic@54.70.1.215 "sudo mkdir -p /home/goldengateclassic/htdocs/www.goldengateclassic.org"
ssh goldengateclassic@54.70.1.215 "sudo chown -R goldengateclassic:goldengateclassic /home/goldengateclassic/htdocs/www.goldengateclassic.org"
```

### Option 3: Deploy to a Different Directory

If you can't fix permissions on the current directory, set `DEPLOY_APP_PATH` in `.deployrc` to a writable path, deploy there, then move files into the final location:

```bash
# In .deployrc:
# DEPLOY_APP_PATH="/tmp/sfggc_deploy"

./deploy_scripts/deploy.sh

# Then manually move files (requires sudo)
ssh sfggc "sudo cp -r /tmp/sfggc_deploy/* /home/goldengateclassic/htdocs/www.goldengateclassic.org/portal-app/"
```

### Option 4: Use CloudPanel File Manager

1. Log into your CloudPanel dashboard
2. Navigate to File Manager
3. Go to `/home/goldengateclassic/htdocs/www.goldengateclassic.org`
4. Check the permissions and ownership
5. Set the owner to `goldengateclassic` and group to `goldengateclassic`
6. Set permissions to `755` for directories and `644` for files

## Testing the Fix

After applying one of the above solutions, test the deployment:

```bash
# Run from project root
./deploy_scripts/deploy.sh --dry-run --verbose
./deploy_scripts/deploy.sh
```

If the dry-run reports the target path is accessible and the real deploy completes through PM2 restart and the HTTP verification step, permissions are good.

## Troubleshooting

### Check Current Permissions
```bash
ssh goldengateclassic@54.70.1.215 "ls -la /home/goldengateclassic/htdocs/"
```

### Check Disk Space
```bash
ssh goldengateclassic@54.70.1.215 "df -h"
```

### Check User Groups
```bash
ssh goldengateclassic@54.70.1.215 "groups goldengateclassic"
```

### Test SSH Access
```bash
ssh goldengateclassic@54.70.1.215 "whoami && pwd"
```

## Nginx Configuration Management

This project uses nginx to terminate TLS and proxy all traffic (both the public marketing pages and the portal) to a single Next.js server on `127.0.0.1:3000`. You do not have direct SSH access to nginx configuration files; the vhost is managed in version control and pushed via the CloudPanel ISP portal.

### Configuration File Location

The nginx vhost configuration is maintained in version control:

**File:** `backend/config/vhost.txt`

This file contains:
- **Upstream block** with `keepalive 16` for persistent nginx-to-Node.js connections
- **SSL and server settings** (CloudPanel placeholders: `{{ssl_certificate}}`, `{{root}}`, etc.)
- **`location ^~ /_next/static`** — proxies to Node.js with one-year immutable cache headers. The `^~` is defensive (see Key Configuration Rules in [NGINX_SETUP.md](deploy_docs/NGINX_SETUP.md)).
- **`location /`** — catch-all that proxies every other request (public pages, `/portal`, `/api/portal`, dynamic `/_next`) to the same upstream. Next.js handles all internal routing.

The vhost is intentionally minimal — there are no on-disk serving blocks, no `try_files`, and no static-asset regex. Everything goes through the unified Next.js server.

### Configuration Workflow

Since you cannot run nginx commands directly (no `nginx -t`, `systemctl reload nginx`), use this workflow:

1. **Edit configuration locally:**
   ```bash
   cd backend/config
   nano vhost.txt  # or your preferred editor
   ```

2. **Copy to clipboard:**
   ```bash
   # macOS
   cat vhost.txt | pbcopy

   # Linux
   cat vhost.txt | xclip -selection clipboard
   ```

3. **Paste in ISP control panel:**
   - Log into web-based control panel
   - Navigate to nginx/vhost configuration
   - Replace existing configuration
   - Save (panel validates and reloads automatically)

4. **Verify changes:**
   ```bash
   curl -I https://www.goldengateclassic.org/         # public site
   curl -I https://www.goldengateclassic.org/portal/  # portal proxy
   ```

5. **Commit changes:**
   ```bash
   git add backend/config/vhost.txt
   git commit -m "Update nginx config: [describe changes]"
   git push origin main
   ```

### Critical Nginx Configuration Requirements

**1. Keep `^~` on `/_next/static`, and add it to any future prefix block that needs to defend `.js`/`.css`.**

The current vhost has one `^~` block (`/_next/static`) and one catch-all. The `^~` is defensive: it stops any regex location (e.g. `~* \.(js|css|...)$`) from hijacking JavaScript requests.

```nginx
location ^~ /_next/static { proxy_pass http://portal_backend; ... }
location /                { proxy_pass http://portal_backend; ... }
```

If anyone reintroduces a static-asset regex, or adds dedicated `/portal`, `/api/portal`, or `/_next` blocks, those new prefix blocks MUST also use `^~`. Otherwise the regex steals `.js`/`.css` requests, returning 404 for every Next.js JavaScript bundle and breaking React hydration entirely (pages load but interactive elements are invisible).

**2. Use `upstream` block with `keepalive`, not direct `proxy_pass` to IP.**

The `upstream portal_backend` block at the top of the config (before the `server {}` block) enables persistent connections. All portal proxy locations reference `proxy_pass http://portal_backend` (not `http://127.0.0.1:3000`).

**3. Use `Connection ""` (empty string), not `Connection 'upgrade'`.**

The empty Connection header is required for keepalive compatibility. Setting it to `'upgrade'` forces HTTP/1.0 connection-close behavior, defeating keepalive.

### What NOT to Do

Do NOT attempt these commands (they require direct nginx access):
```bash
nginx -t                    # Won't work without nginx permissions
systemctl reload nginx      # Won't work without sudo
sudo vim /etc/nginx/...     # Won't work without nginx access
```

### Troubleshooting Nginx Issues

**SSR Pages Redirect to Login, Return 404, or Show Empty Data:**

This affects any page using `getServerSideProps` that fetches data from internal API routes (admin detail, participant detail, team pages).

**Symptoms:**
- Participant detail page redirects to login even with a valid session cookie
- Admin detail page returns 404 (`{"notFound":true}`)
- Team pages show empty data or error out
- The same request works when hitting Node.js directly on port 3000 but fails through nginx

**Root Cause:** `buildBaseUrl(req)` in `src/utils/portal/ssr-helpers.js` used `req.headers.host` to construct the URL for internal SSR API fetches. This created a self-referencing loop: Node.js SSR called its own public HTTPS URL, which went through nginx, which proxied back to Node.js. Cloud servers typically cannot connect to their own public IP from localhost (hairpin NAT issue). Even when the connection succeeds, request headers (cookies, forwarded IPs) may be altered or lost during the round-trip.

**Diagnosis:**
1. SSH to the server and test the API route directly against Node.js:
   ```bash
   # Direct to Node.js (should work)
   curl -b "session=YOUR_COOKIE" http://localhost:3000/api/portal/participants/12345

   # Through nginx (will fail or return different data)
   curl -b "session=YOUR_COOKIE" https://www.goldengateclassic.org/api/portal/participants/12345
   ```
2. If the direct request returns correct data but the nginx request does not, the issue is the SSR self-referencing loop.

**Fix:** `buildBaseUrl()` must always return `http://localhost:${PORT}` for internal SSR fetches. Server-side code should never route through the external URL or nginx for API calls to itself. This is configured in `src/utils/portal/ssr-helpers.js`.

**Key Principle:** Internal SSR API calls (Node.js calling its own API routes during `getServerSideProps`) must always use `http://localhost:PORT`, never the public URL. Routing through nginx or the external domain introduces hairpin NAT failures, header loss, and unnecessary latency.

---

**Portal returns 502 Bad Gateway:**
1. Verify Node.js app is running: `pm2 status sfggc-portal`
2. Check proxy configuration in `backend/config/vhost.txt` (lines 34-68)
3. Verify proxy port matches app port (default: 3000)
4. Check app logs: `pm2 logs sfggc-portal`

**Some routes work but `/portal/` doesn't:**
1. Verify the catch-all `location /` block in `backend/config/vhost.txt` proxies to `portal_backend`.
2. Verify Node.js app is running: `pm2 status sfggc-portal`.
3. Test directly: `curl -v https://www.goldengateclassic.org/portal/`.
4. Public pages and the portal go through the same upstream — if `/portal/` is broken but `/` works, the issue is in the Next.js app itself, not nginx.

**Portal loads but menus/forms/interactive elements are missing:**
1. Open browser DevTools Network tab and look for 404 errors on `/_next/static/chunks/*.js`.
2. If JS files return 404, a regex location (like `~* \.(js|css)$`) is intercepting them. The current vhost has no such regex — if one was added, every prefix block that needs to serve JS/CSS must use `^~`.
3. See [Critical Nginx Configuration Requirements](#critical-nginx-configuration-requirements) above.

**Page returns 403 Forbidden (legacy):**

The current vhost proxies everything to Next.js, so 403 from a directory/file collision can't happen — Next.js routes internally. If you encounter this, it means someone added a disk-serving block. The fix is to either drop the disk-serving block (everything goes through Next.js) or, if disk-serving is required, use both a trailing-slash rewrite and `.html` before directory in `try_files`:
1. Add trailing slash rewrite inside `location /`: `rewrite ^/(.+)/$ /$1 permanent;`
2. Ensure `try_files` checks `$uri.html` before `$uri/`: `try_files $uri $uri.html $uri/ /index.html;`

This serves the `.html` page instead of attempting a directory listing. PDFs inside the directory (e.g., `/results/2024/team.pdf`) are unaffected — they match `$uri` as regular files.

---

**Configuration rejected by ISP panel:**
1. Check for syntax errors (missing semicolons, braces)
2. Preserve CloudPanel placeholders: `{{root}}`, `{{ssl_certificate}}`, etc.
3. Review error message from ISP panel

### Detailed Documentation

For complete nginx configuration management documentation, see:
- **ISP-Controlled Nginx:** `deploy_docs/DEPLOYMENT.md#nginx-configuration-management`
- **Direct Nginx Access:** `deploy_docs/NGINX_SETUP.md`
- **CloudPanel-Specific:** `deploy_docs/CLOUDPANEL_NGINX_GUIDE.md`

## Common Issues and Solutions

1. **"Operation not permitted"**: Directory ownership or permissions issue
2. **"Permission denied"**: User doesn't have write access
3. **"No space left on device"**: Server is out of disk space
4. **"Connection refused"**: SSH service not running or firewall blocking
5. **Nginx errors (502/503)**: Node.js upstream (`sfggc-portal` on port 3000) is down or unreachable
   - See `backend/config/vhost.txt` for current configuration
   - See `deploy_docs/DEPLOYMENT.md#nginx-configuration-management` for the vhost workflow
   - See `deploy_docs/NGINX_SETUP.md` for nginx reference
   - See `deploy_docs/CLOUDPANEL_NGINX_GUIDE.md` for CloudPanel UI navigation

## Next Steps

1. Try Option 1 (fix permissions) first
2. If that doesn't work, try the deployment script again
3. If still failing, use manual upload via CloudPanel
4. Test the website thoroughly after deployment

## Note

This guide contains example server information. Replace the server details (IP address, username, paths) with your actual server configuration when following these instructions.








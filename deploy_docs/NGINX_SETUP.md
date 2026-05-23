# Nginx Configuration for SFGGC Website

## Source of Truth

The nginx vhost is managed in version control at [backend/config/vhost.txt](../backend/config/vhost.txt). It contains the complete server block: SSL listeners, application proxy blocks, and caching rules. Every nginx change is made to that file first.

## How to Update Nginx

You do **not** have direct SSH access to nginx. All changes go through CloudPanel:

1. Edit `backend/config/vhost.txt` locally and commit.
2. Copy to clipboard: `cat backend/config/vhost.txt | pbcopy` (macOS).
3. Log into the CloudPanel ISP portal.
4. **Sites** → select domain → **Vhost** (or **Nginx Settings**).
5. Paste the entire file, replacing the existing contents.
6. Save. CloudPanel validates the syntax and reloads nginx automatically.

**Do NOT** attempt `nginx -t`, `systemctl reload nginx`, or direct editing of `/etc/nginx/` files — those require permissions you don't have.

## Configuration Overview

The current vhost is intentionally minimal. There are only two application-level location blocks; everything else (the public marketing pages, `/portal`, `/api/portal`, dynamic `/_next` requests) goes through the catch-all and is handled by Next.js itself.

### 1. Upstream Block

Persistent connections to the Node.js application (saves 20–50 ms per request):

```nginx
upstream portal_backend {
  server 127.0.0.1:3000;
  keepalive 16;
}
```

`keepalive` requires `proxy_set_header Connection ""` (empty string) in every proxied block — never `'upgrade'`.

### 2. SSL and Server Settings

Standard CloudPanel placeholders: `{{ssl_certificate}}`, `{{ssl_certificate_key}}`, `{{root}}`, access/error log directives, the Let's Encrypt validation block, and the `include /etc/nginx/global_settings;` line. Preserve all placeholders exactly when pasting into the panel.

### 3. Build Artifact Caching

```nginx
location ^~ /_next/static {
  proxy_pass http://portal_backend;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

Next.js content-hashes the filenames in `/_next/static/`, so a one-year `Cache-Control: public, immutable` is safe. The `^~` modifier is defensive (see Key Configuration Rules below).

### 4. Catch-All Application Proxy

```nginx
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

This block handles every other request: public pages, portal pages, API routes, dynamic Next.js endpoints. Next.js does the routing.

## Key Configuration Rules

| Rule | Why |
|---|---|
| `^~` on `/_next/static` | Defensive — if a regex location like `~* \.(js|css)$` is ever added, regex beats plain prefix and would hijack JS bundles. `^~` blocks that. |
| `proxy_set_header Connection ""` in every proxy block | Required for upstream keepalive. `"upgrade"` defeats it. |
| Headers in each proxy block depend on block type | Nginx does not merge `proxy_set_header` across scopes — child blocks fully replace parent. App/dynamic blocks need the full forwarded-header set; cache-only blocks (like `^~ /_next/static`) only need keepalive headers. See [DEPLOYMENT.md#nginx-proxy-header-inheritance](DEPLOYMENT.md#nginx-proxy-header-inheritance). |
| `compress: false` in `next.config.js` | Nginx handles gzip — avoids double compression and corrupt binary responses. |
| Never use a fixed `alias` for `/_next/static` | Build IDs change every deploy; a stale alias path would 404 all assets. Proxy to Node.js (current), or use `try_files $uri @portal_next` if disk-serving is reintroduced. |

## Defensive Notes for Future Changes

The current vhost is small on purpose. Some patterns to know if anyone proposes adding to it:

**If a static-asset regex is reintroduced:**

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ { ... }
```

…then every plain-prefix block that needs to serve `.js`/`.css` (especially anything under `/_next/`) MUST use `^~`. Otherwise the regex steals those requests and React hydration breaks. The current `/_next/static` block already uses `^~` defensively, but you would also need to add explicit `^~` blocks for `/portal`, `/api/portal`, and `/_next` so the regex cannot intercept their assets either.

**If on-disk page serving is reintroduced (e.g., a colliding `results/` directory vs. `results.html`):**

Use both a trailing-slash rewrite and `.html` before directory in `try_files`:

```nginx
location / {
  rewrite ^/(.+)/$ /$1 permanent;             # /results/ → /results
  try_files $uri $uri.html $uri/ /index.html; # .html before directory
}
```

Without both, directory listings clash with same-named `.html` pages and return 403. The current vhost doesn't need this because everything goes through Next.js.

## Common Issues

### Portal returns 502

Node.js is down. `ssh sfggc "pm2 status sfggc-portal"`, then `pm2 logs sfggc-portal --lines 100`.

### Pages load but menus / forms / change log are invisible

JavaScript bundles are 404'ing. Open DevTools → Network and look for failed `/_next/static/chunks/*.js` requests. Almost certainly caused by a regex location being added without `^~` on the corresponding prefix block. See the defensive notes above.

### Configuration rejected by ISP panel

- Check for syntax errors (missing semicolons, unclosed braces).
- Verify CloudPanel placeholders are preserved: `{{root}}`, `{{ssl_certificate}}`, `{{ssl_certificate_key}}`, `{{nginx_access_log}}`, `{{nginx_error_log}}`, `{{settings}}`.

### Changes not taking effect

Verify the panel reported a successful save; wait 30–60 seconds for the reload; clear browser cache.

## Testing After a Vhost Change

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.goldengateclassic.org/
curl -s -o /dev/null -w "%{http_code}\n" https://www.goldengateclassic.org/results
curl -s -o /dev/null -w "%{http_code}\n" https://www.goldengateclassic.org/portal/
curl -s -o /dev/null -w "%{http_code}\n" https://www.goldengateclassic.org/api/portal/admin/session
```

Expected: 200, 200, 200, 401 (the admin session check correctly returns 401 when unauthenticated).

## Related Documentation

- **Full nginx workflow + header rules:** [DEPLOYMENT.md#nginx-configuration-management](DEPLOYMENT.md#nginx-configuration-management)
- **CloudPanel UI navigation:** [CLOUDPANEL_NGINX_GUIDE.md](CLOUDPANEL_NGINX_GUIDE.md)
- **Source of truth:** [backend/config/vhost.txt](../backend/config/vhost.txt)

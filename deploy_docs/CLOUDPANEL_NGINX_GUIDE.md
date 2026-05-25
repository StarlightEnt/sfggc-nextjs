# Updating Nginx Configuration in CloudPanel

This is a UI-navigation reference for finding and updating the nginx vhost configuration in the CloudPanel control panel. The configuration itself lives in version control at [backend/config/vhost.txt](../backend/config/vhost.txt) and is the source of truth — never edit configuration directly in the panel without first updating that file.

For the full configuration-management workflow (edit → clipboard → paste → verify → commit), the proxy header rules, and the `^~` modifier warning, see [DEPLOYMENT.md → Nginx Configuration Management](DEPLOYMENT.md#nginx-configuration-management). This guide only covers how to navigate the CloudPanel UI.

## Step 1: Log into CloudPanel

1. Open your browser.
2. Navigate to the CloudPanel URL (usually `https://your-server-ip:8443` or your CloudPanel domain).
3. Log in.

## Step 2: Open the Site

1. In the left sidebar click **Sites** (or **Websites**).
2. Click on `www.goldengateclassic.org`.

## Step 3: Find the Vhost Editor

CloudPanel's UI varies slightly by version. The nginx vhost editor is typically labelled one of:

- **Vhost** (most common in current CloudPanel)
- **Nginx** / **Nginx Config**
- **Web Server** → **Server Configuration**
- Under an **Advanced** or **Settings** tab as **Custom Nginx Config** / **Custom Directives**

If you cannot find it under the site, look under the site's **Settings** sub-menu.

## Step 4: Paste the Vhost

1. On your local machine, copy the current `backend/config/vhost.txt`:

   ```bash
   # macOS
   cat backend/config/vhost.txt | pbcopy

   # Linux (requires xclip)
   cat backend/config/vhost.txt | xclip -selection clipboard

   # Windows (WSL)
   cat backend/config/vhost.txt | clip.exe
   ```

2. In the CloudPanel vhost editor, select all existing content and replace it with the clipboard contents.

3. **Preserve CloudPanel placeholders.** The vhost.txt file uses placeholders such as `{{root}}`, `{{ssl_certificate}}`, `{{ssl_certificate_key}}` — CloudPanel substitutes these automatically. Do not replace them with hard-coded values.

4. Save.

CloudPanel validates the syntax on save, reloads nginx if the config is valid, and surfaces any errors directly in the panel.

## Step 5: Verify

From your local machine:

```bash
curl -I https://www.goldengateclassic.org/
curl -I https://www.goldengateclassic.org/portal/
```

Both should return HTTP 200. A 502 means nginx reloaded but the Node.js upstream is not responding — check `pm2 status` on the server.

For deeper verification, open the portal in a browser and confirm interactive elements (admin menus, change log, edit forms) render. If pages load but interactive elements are missing, `/_next/static/*.js` is 404'ing. The current vhost has one `^~` block (`/_next/static`) that's defensive against regex hijacking — confirm that block is present and that no regex location like `~* \.(js|css)$` was added to compete with it. See [DEPLOYMENT.md → Configuration File Structure](DEPLOYMENT.md#configuration-file-structure).

## What the Vhost Actually Contains

The current configuration is a unified proxy: nginx terminates TLS, sets cache headers on `/_next/static`, and proxies everything to the Next.js server on `127.0.0.1:3000`. There is no static file serving from disk. The vhost is intentionally minimal — two application location blocks (`^~ /_next/static` for cache headers and a catch-all `location /`), plus the SSL/server boilerplate.

Read [backend/config/vhost.txt](../backend/config/vhost.txt) directly to see the full configuration.

## Troubleshooting

**Cannot find the vhost editor in CloudPanel:**
- Check the version — newer versions consolidate it under **Sites** → **Vhost**.
- Make sure your CloudPanel account has admin privileges for the site.

**CloudPanel rejects the configuration on save:**
- Check the error message in the panel.
- Common causes: missing semicolons, unclosed braces, removed CloudPanel placeholders.
- Verify you copied the entire file (vhost.txt has an `upstream` block before the `server {}` block — both must be present).

**Changes don't take effect:**
- Confirm you saved in the panel (not just pasted).
- Wait 30–60 seconds for the nginx reload.
- Clear browser cache or hard-refresh (Ctrl/Cmd + Shift + R).

## Do NOT Edit Nginx Directly via SSH

You do not have permission to do this on the production server, and even if you did:

```bash
nginx -t                    # Will fail (no permission)
systemctl reload nginx      # Will fail (no permission)
sudo vim /etc/nginx/...     # Will fail (no sudo)
```

The ISP-controlled hosting model means the only supported nginx configuration path is **`backend/config/vhost.txt` → CloudPanel paste → save**. Any out-of-band edits will be overwritten the next time someone deploys the vhost from the repo.

## Related Documentation

- **Full workflow + proxy header rules + ^~ warning:** [DEPLOYMENT.md → Nginx Configuration Management](DEPLOYMENT.md#nginx-configuration-management)
- **Source of truth for the configuration:** [backend/config/vhost.txt](../backend/config/vhost.txt)
- **Direct-SSH nginx reference (other environments):** [NGINX_SETUP.md](NGINX_SETUP.md)

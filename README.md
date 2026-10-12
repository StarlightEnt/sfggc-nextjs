# Golden Gate Classic website

This is the website for the Golden Gate Classic, an IGBO-affiliated bowling tournament. The site is available at [www.goldengateclassic.org](http://www.goldengateclassic.org).

It is a unified [Next.js](https://nextjs.org/) server application (Next.js 14, React 18, Bootstrap 5) that serves both the public marketing pages and a database-backed tournament portal under a single Node.js process managed by PM2 behind nginx.

It uses Bootstrap 5, and I started the design with mobile viewports, then adapted them for medium and large ones. Since two out of every three visitors is on a mobile device, it seemed like the best approach.

The look and feel follows the sister site, [sflgbtbowl.com](https://www.sflgbtbowl.com/): a dark theme (near-black violet surfaces, lavender text), neon Pride accent colors, a six-color stripe bar under the sticky nav, Bungee headings, Inter body text, and pill-shaped call-to-action buttons. The site is dark-only; there is no light mode or theme toggle. The design tokens live in `src/scss/_bootstrap-variables.scss`, and `CLAUDE.md` (Bootstrap and Theme Management) lists the conventions the tests enforce.

## Learning

I have also used this project to further my understanding of how Bootstrap's Sass and its CSS variables work together. It's very cool stuff, and as someone coming from the backend world of software development, it's been fun to see how it all ties together.

## Development & local running

1. Clone this repository
2. Install [Node.js](https://nodejs.org/en/)
3. Run `npm install`
4. To run a development server, run `npm run dev` and have at it!

The public pages need nothing else. The tournament portal needs a database; the quickest way is Docker: `bash scripts/dev/docker-db.sh init` (see [portal_docs/PORTAL_SETUP.md](portal_docs/PORTAL_SETUP.md)).

## Deployment

The site deploys as a single Next.js server (PM2 process `sfggc-portal`, port 3000) behind nginx. One command handles everything: file sync, dependency install, database migrations, build on the server, and PM2 restart.

### Quick Start

1. **Set up SSH keys** (one-time, for passwordless deployment):
   ```bash
   ./deploy_scripts/setup-ssh.sh <ssh_user@server> <server_alias>
   ```

2. **Deploy** (run from the project root):
   ```bash
   ./deploy_scripts/deploy.sh
   ```
   Use `--dry-run --verbose` to preview, `--yes` to skip the confirmation prompt, `--setup` to force `.env.local` reconfiguration. See `./deploy_scripts/deploy.sh --help` for all flags.

The build happens on the server and produces `.next/`, not `out/` — there is no static export. nginx proxies all traffic to Node.js on port 3000; the vhost lives in [backend/config/vhost.txt](backend/config/vhost.txt) and is pushed via the ISP control panel (no direct nginx access).

For detailed instructions see [deploy_docs/DEPLOYMENT.md](deploy_docs/DEPLOYMENT.md). For server troubleshooting see [SERVER_SETUP.md](SERVER_SETUP.md).

## Portal

The repository includes a tournament portal for admin and participant access, served from the same Next.js process as the public site. It is backed by MariaDB (AWS RDS in production).

- **Portal documentation**: [`portal_docs/README.md`](portal_docs/README.md)
- **Setup guide**: [`portal_docs/PORTAL_SETUP.md`](portal_docs/PORTAL_SETUP.md)
- **Portal deployment**: [`deploy_docs/PORTAL_DEPLOYMENT.md`](deploy_docs/PORTAL_DEPLOYMENT.md)

### Portal migrations (developer workflow)

- Portal deploys run migrations automatically from `backend/scripts/migrations/`.
- Local schema setup now also runs all portal migrations:
  - `bash scripts/dev/init-portal-db.sh`
- Existing workspaces: pull latest code and re-run `bash scripts/dev/init-portal-db.sh` (or run only migrations with `bash scripts/dev/run-portal-migrations.sh`).
- First-time workspaces: after creating `.env.local`, run `bash scripts/dev/init-portal-db.sh`; it initializes schema and applies migrations in one flow.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)

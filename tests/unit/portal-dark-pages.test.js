import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

/**
 * BDD tests for the logged-in portal pages on the dark theme: a real page
 * header instead of a floating panel, tables that blend into their cards,
 * and no light-theme leftovers anywhere under the portal.
 */

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf-8");
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(js|scss)$/.test(e.name)) out.push(rel);
  }
  return out;
};
const portalFiles = [...walk("src/pages/portal"), ...walk("src/components/Portal")];

test("Given the default portal shell, when rendered, then the title is a left-aligned page header with an accent bar, not a flush panel", () => {
  const shell = read("src/components/Portal/PortalShell/PortalShell.js");
  const styles = read("src/components/Portal/PortalShell/PortalShell.module.scss");
  const defaultBranch = shell.slice(shell.lastIndexOf("return ("));
  assert.doesNotMatch(defaultBranch, /section-heading/);
  assert.match(defaultBranch, /styles\.PageTitle/);
  assert.match(defaultBranch, /styles\.PageSubtitle/);
  assert.match(styles, /\.PageTitle[\s\S]*?&::after[\s\S]*?linear-gradient/);
  assert.match(styles, /\.PageSubtitle\s*\{[^}]*color:\s*var\(--sfggc-ink-dim\)/s);
});

test("Given tables inside cards, when styled, then they take the card surface instead of the page background", () => {
  const main = read("src/scss/sfggc.scss");
  assert.match(main, /\.card\s+\.table[\s\S]{0,200}?table-bg:\s*transparent/);
});

test("Given the scratch masters cutoff row, when rendered, then it uses a themed divider class instead of white", () => {
  const page = read("src/pages/portal/admin/scratch-masters.js");
  assert.doesNotMatch(page, /bg-white/);
  assert.match(page, /scratch-cutoff-divider/);
  assert.match(read("src/scss/sfggc.scss"), /\.scratch-cutoff-divider\s*\{[^}]*var\(--sfggc-pride-purple\)/s);
});

test("Given any portal page or component, when read, then it has no light-theme utility classes", () => {
  const forbidden = /\b(bg-white|bg-light|text-dark|text-black|table-light|navbar-light|btn-light)\b/;
  const offenders = portalFiles.filter((f) => forbidden.test(read(f)));
  assert.deepEqual(offenders, []);
});

test("Given any portal page or component, when read, then hard-coded colors appear only in the email preview pane", () => {
  const allowed = new Set([path.join("src/pages/portal/admin", "email-config.js")]);
  const offenders = portalFiles.filter((f) => !allowed.has(f) && /#[0-9a-fA-F]{6}\b|rgba?\(\s*2[0-9]{2}\s*,\s*2[0-9]{2}/.test(read(f)));
  assert.deepEqual(offenders, [], "use the --sfggc-* tokens instead");
});

test("Given the email preview pane, when rendered, then its light background is intentional and documented", () => {
  const source = read("src/pages/portal/admin/email-config.js");
  assert.match(source, /#f8f9fa/);
  assert.match(source, /(preview|inbox)[^\n]*(light|inbox)|light[^\n]*(inbox|preview)/i, "explain why this pane stays light");
});

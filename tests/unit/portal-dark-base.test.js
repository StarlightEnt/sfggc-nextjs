import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

/**
 * BDD tests for the portal's shared dark layer: the Bootstrap components the
 * portal relies on must actually be compiled in, CSS variables must use this
 * project's `sfggc-` prefix, and the entry screens use the sister site's
 * sign-in card pattern.
 */

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf-8");
const require = createRequire(import.meta.url);
const sass = require("sass");

const compiled = sass.compile(path.join(root, "src/scss/sfggc.scss"), {
  loadPaths: [path.join(root, "node_modules")],
  logger: sass.Logger.silent,
  quietDeps: true,
}).css;

test("Given the compiled stylesheet, when the portal uses Bootstrap components, then alerts, modals, badges and form checks have rules", () => {
  for (const selector of [".alert", ".alert-danger", ".alert-warning", ".alert-info", ".alert-success",
    ".modal-dialog", ".modal-content", ".modal-header", ".modal-footer", ".badge", ".form-check-input", ".input-group"]) {
    assert.ok(
      new RegExp(`(^|[\\s,}])${selector.replace(".", "\\.")}[\\s,{:.\\[]`, "m").test(compiled),
      `compiled CSS must define ${selector}`
    );
  }
});

test("Given any stylesheet or component, when it references Bootstrap variables, then it uses the sfggc- prefix not --bs-", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(js|scss)$/.test(entry.name) && /var\(--bs-/.test(read(rel))) offenders.push(rel);
    }
  };
  walk("src");
  assert.deepEqual(offenders, [], `--bs- variables do not exist in this project: ${offenders.join(", ")}`);
});

test("Given the score total box, when styled, then it never falls back to a light background", () => {
  const styles = read("src/components/Portal/ScoreCard/ScoreCard.module.scss");
  assert.doesNotMatch(styles, /#f8f9fa/i);
  assert.doesNotMatch(styles, /var\(--bs-light/);
});

test("Given portal buttons, when styled, then primary is the gradient call-to-action and outline buttons stay outlined", () => {
  const main = read("src/scss/sfggc.scss");
  assert.match(main, /\.btn-primary\s*\{[\s\S]{0,900}?linear-gradient/);
  assert.doesNotMatch(main, /\.btn-outline-(primary|secondary|info)\s*\{/, "outline buttons must not be repainted as filled buttons");
});

test("Given the portal shell, when given the auth variant, then it renders children in a centered sign-in card", () => {
  const shell = read("src/components/Portal/PortalShell/PortalShell.js");
  const styles = read("src/components/Portal/PortalShell/PortalShell.module.scss");
  assert.match(shell, /variant/);
  assert.match(shell, /styles\.AuthCard/);
  assert.match(styles, /\.AuthCard\s*\{[^}]*max-width:\s*440px/s);
  assert.match(styles, /\.AuthCard\s*\{[^}]*background:\s*var\(--sfggc-night-mid\)/s);
  assert.match(styles, /\.AuthCard\s*\{[^}]*border-radius:\s*14px/s);
});

test("Given the portal entry pages, when rendered, then each login screen opts into the auth card", () => {
  for (const page of ["src/pages/portal/index.js", "src/pages/portal/admin/index.js", "src/pages/portal/participant/index.js"]) {
    assert.match(read(page), /<PortalShell[^>]*variant=["']auth["']/s, `${page} must use variant="auth"`);
  }
});

test("Given the role chooser, when rendered inside the auth card, then it does not nest a second card and its two choices look different", () => {
  const source = read("src/components/Portal/RoleChooser/RoleChooser.js");
  assert.doesNotMatch(source, /className=\{`\$\{styles\.Card\} card`\}/);
  assert.match(source, /btn btn-primary/);
  assert.match(source, /btn btn-outline-secondary/);
  assert.doesNotMatch(source, /btn-outline-primary/);
});

test("Given the portal shell heading, when not in auth mode, then it still renders the page title", () => {
  const shell = read("src/components/Portal/PortalShell/PortalShell.js");
  assert.match(shell, /<h1[^>]*>\{title\}<\/h1>/);
});

test("Given form components rendered as <section>, when styled, then they reset the global section margins used by content pages", () => {
  for (const name of ["AdminLoginForm", "ParticipantLookupForm", "RoleChooser"]) {
    const styles = read(`src/components/Portal/${name}/${name}.module.scss`);
    assert.match(styles, /margin:\s*0\b/, `${name}.module.scss must set margin: 0 to cancel the global section spacing`);
  }
});

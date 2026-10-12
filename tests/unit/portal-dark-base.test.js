import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests for the portal's shared dark layer: the Bootstrap components the portal relies on
 * must actually be compiled in, primary buttons are the gradient call-to-action, and the entry
 * screens use the sister site's sign-in card.
 */

const require = createRequire(import.meta.url);
const { read, mainCss, compile, declarations, parseRules } = require("../helpers/theme-sources.js");

const css = mainCss();

test("Given the compiled stylesheet, when the portal uses Bootstrap components, then alerts, modals, badges and form checks have rules", () => {
  const selectors = new Set(parseRules(css).flatMap((r) => r.selectors));
  for (const wanted of [".alert", ".alert-danger", ".alert-warning", ".alert-info", ".alert-success",
    ".modal-dialog", ".modal-content", ".modal-header", ".modal-footer", ".badge", ".form-check-input"]) {
    assert.ok(
      [...selectors].some((s) => s === wanted || s.startsWith(`${wanted} `) || s.startsWith(`${wanted}:`) || s.startsWith(`${wanted}.`)),
      `compiled CSS must define ${wanted}`
    );
  }
});

test("Given Bootstrap primary buttons, when compiled, then they use the gradient call-to-action", () => {
  assert.match(declarations(css, ".btn-primary"), /linear-gradient/);
});

test("Given tables inside cards, when compiled, then they take the card surface instead of the page background", () => {
  assert.match(declarations(css, ".card .table"), /table-bg:\s*transparent/);
});

test("Given the auth variant of the portal shell, when compiled, then the sign-in card is a centered, bordered dark surface", () => {
  const rule = declarations(compile("src/components/Portal/PortalShell/PortalShell.module.scss"), ".AuthCard");
  assert.match(rule, /max-width:/);
  assert.match(rule, /margin:[^;]*\bauto\b/);
  assert.match(rule, /background[^:]*:\s*var\(--sfggc-/);
  assert.match(rule, /border[^:]*:/);
});

test("Given the portal shell source, when given the auth variant, then it renders the card", () => {
  const shell = read("src/components/Portal/PortalShell/PortalShell.js");
  assert.match(shell, /variant/);
  assert.match(shell, /styles\.AuthCard/);
});

test("Given the portal entry pages, when rendered, then each login screen opts into the auth card", () => {
  for (const page of ["src/pages/portal/index.js", "src/pages/portal/admin/index.js", "src/pages/portal/participant/index.js"]) {
    assert.match(read(page), /<PortalShell[^>]*variant=["']auth["']/s, `${page} must use variant="auth"`);
  }
});

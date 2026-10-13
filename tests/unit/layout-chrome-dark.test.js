import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests for the site chrome: a sticky dark nav, a stripe bar directly beneath it, and a
 * second stripe bar above the footer. Assertions target the structural invariants, not copy,
 * quote style, or exact class strings.
 */

const require = createRequire(import.meta.url);
const { read, compile, declarations } = require("../helpers/theme-sources.js");

const layoutJs = read("src/components/layout/layout.js");
const navigationJs = read("src/components/layout/navigation.js");

test("Given the layout, when rendered, then a stripe bar follows the navigation and another precedes the footer", () => {
  assert.match(layoutJs, /<Navigation\s*\/>\s*<div[^>]*\bstripe-bar\b[^>]*>\s*<\/div>/);
  assert.match(layoutJs, /<div[^>]*\bstripe-bar\b[^>]*>\s*<\/div>\s*<Footer\s*\/>/);
});

test("Given the navigation styles, when compiled, then the nav sticks to the top above page content on a dark surface", () => {
  const rule = declarations(compile("src/components/layout/navigation.module.scss"), "nav.nav");
  assert.match(rule, /position:\s*sticky/);
  assert.match(rule, /top:\s*0/);
  assert.match(rule, /z-index:\s*\d+/);
  assert.match(rule, /background[^:]*:\s*var\(--sfggc-/);
});

test("Given the navigation, when links render, then the active page is announced and the mobile toggler is labelled", () => {
  assert.match(navigationJs, /aria-current/);
  assert.match(navigationJs, /navbar-toggler/);
  assert.match(navigationJs, /aria-label=/);
});

test("Given the footer styles, when compiled, then the footer text uses a theme token", () => {
  const rule = declarations(compile("src/components/layout/footer.module.scss"), "footer.footer");
  assert.match(rule, /color:\s*var\(--sfggc-/);
});

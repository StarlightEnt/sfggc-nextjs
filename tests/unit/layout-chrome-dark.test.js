import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

/**
 * BDD tests for the site chrome (nav, stripe bars, footer) matching the
 * sister site: sticky dark nav with a hairline border, stripe bar beneath it,
 * and a second stripe bar above a quiet footer.
 */

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf-8");

const layoutJs = read("src/components/layout/layout.js");
const navigationJs = read("src/components/layout/navigation.js");
const navigationScss = read("src/components/layout/navigation.module.scss");
const footerJs = read("src/components/layout/footer.js");
const footerScss = read("src/components/layout/footer.module.scss");

const LIGHT_UTILITIES = ["text-dark", "bg-white", "glass-card", "shadow-sm", "rounded-4"];

test("Given the layout, when rendered, then the nav sits outside the page container before the first stripe bar", () => {
  const nav = layoutJs.indexOf("<Navigation");
  const firstStripe = layoutJs.indexOf("stripe-bar");
  const container = layoutJs.indexOf("container-xl");
  assert.ok(nav > -1 && firstStripe > -1 && container > -1);
  assert.ok(nav < firstStripe, "Navigation must precede the first stripe bar");
  assert.ok(firstStripe < container, "stripe bar must precede the page container");
});

test("Given the layout, when rendered, then a stripe bar appears above the footer as well", () => {
  const stripes = layoutJs.match(/stripe-bar/g) || [];
  assert.equal(stripes.length, 2, "exactly two stripe bars: below the nav and above the footer");
  assert.ok(layoutJs.lastIndexOf("stripe-bar") < layoutJs.indexOf("<Footer"));
  assert.doesNotMatch(layoutJs, /position-sticky/, "the stripe bar scrolls; the nav is the sticky element");
});

test("Given the navigation, when styled, then it is a sticky dark bar with a hairline bottom border", () => {
  assert.match(navigationScss, /position:\s*sticky/);
  assert.match(navigationScss, /top:\s*0/);
  assert.match(navigationScss, /background(-color)?:\s*var\(--sfggc-night\)/);
  assert.match(navigationScss, /border-bottom:\s*1px solid var\(--sfggc-hairline\)/);
  assert.match(navigationScss, /z-index:\s*\d+/);
});

test("Given the navigation, when rendered, then it uses the module styles and a Bungee wordmark with a tagline", () => {
  assert.match(navigationJs, /import styles from ['"]\.\/navigation\.module\.scss['"]/);
  assert.match(navigationJs, /className=\{`?\$\{styles\.wordmark\}[^}]*display/);
  assert.match(navigationJs, /styles\.tagline/);
});

test("Given the navigation, when rendered, then no light-theme utility classes remain", () => {
  for (const cls of LIGHT_UTILITIES) {
    assert.ok(!navigationJs.includes(cls), `navigation.js must not use ${cls}`);
  }
});

test("Given the navigation, when rendered, then Portal Login is the pill call-to-action and the mobile toggler remains", () => {
  assert.match(navigationJs, /btn-glow-orange/);
  assert.match(navigationJs, /navbar-toggler/);
  assert.match(navigationJs, /aria-label=\{?['"]Toggle navigation['"]/);
  assert.match(navigationJs, /isButton:\s*true/);
});

test("Given the navigation links, when one is active, then it is marked with aria-current", () => {
  assert.match(navigationJs, /aria-current/);
});

test("Given the footer, when rendered, then it is a quiet dark line without light-theme utilities", () => {
  for (const cls of LIGHT_UTILITIES) {
    assert.ok(!footerJs.includes(cls), `footer.js must not use ${cls}`);
  }
  assert.doesNotMatch(footerJs, /text-muted/);
  assert.match(footerJs, /import styles from ['"]\.\/footer\.module\.scss['"]/);
  assert.match(footerJs, /San Francisco Golden Gate Classic/);
  assert.match(footerScss, /color:\s*var\(--sfggc-ink-dim\)/);
});

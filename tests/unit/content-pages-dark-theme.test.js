import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

/**
 * BDD tests for the content pages (Rules, Committee, Results, Oil Pattern,
 * Scratch Masters winners) restyled to the sister-site dark theme.
 */

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf-8");

const COMPONENTS = {
  Rules: "Rules.module.scss",
  Committee: "Committee.module.scss",
  Results: "Results.module.scss",
  OilPattern: "oilpattern.module.scss",
  ScrMstWinners: "ScrMstWinners.module.scss",
};

const FORBIDDEN_CLASSES = ["text-dark", "bg-white", "text-secondary", "shadow-2xs"];
const FORBIDDEN_COLORS = [
  "#e11d48", "#2563eb", "#f97316", "#10b981", "#eab308", "#7c3aed",
  "#ffffff", "#f8fafc", "#0f172a", "#334155",
  "rgba(255, 255, 255", "rgba(15, 23, 42", "rgba(226, 232, 240",
];

const js = (name) => read(`src/components/${name}/${name}.js`);
const scss = (name) => read(`src/components/${name}/${COMPONENTS[name]}`);

for (const name of Object.keys(COMPONENTS)) {
  test(`Given the ${name} component, when read, then no light-theme classes or hard-coded light colors remain`, () => {
    const source = js(name).toLowerCase();
    const styles = scss(name).toLowerCase();
    for (const cls of FORBIDDEN_CLASSES) {
      assert.ok(!source.includes(cls), `${name}.js must not use ${cls}`);
    }
    for (const color of FORBIDDEN_COLORS) {
      assert.ok(!source.includes(color), `${name}.js must not contain ${color}`);
      assert.ok(!styles.includes(color), `${name} styles must not contain ${color}`);
    }
  });
}

test("Given the Committee and Scratch Masters card styles, when read, then the inverted light-card hack is gone", () => {
  for (const name of ["Committee", "ScrMstWinners"]) {
    const styles = scss(name);
    assert.doesNotMatch(styles, /color:\s*var\(--sfggc-body-bg\)/, `${name} must not paint dark text on a light card`);
    assert.doesNotMatch(styles, /\[data-bs-theme=['"]dark['"]\]/, `${name} must not branch on theme; the site is dark-only`);
  }
});

test("Given the Oil Pattern and Scratch Masters sections, when rendered, then they use the same heading plus card pattern as other sections", () => {
  for (const name of ["OilPattern", "ScrMstWinners"]) {
    const source = js(name);
    assert.match(source, /section-heading mb-0/, `${name} heading must sit flush on its card`);
    assert.match(source, /glass-card[^"]*rounded-top-0 border-top-0/, `${name} must wrap content in a card`);
  }
});

test("Given the Rules page, when rendered, then rule lists use accent markers and links are legible", () => {
  const styles = scss("Rules");
  assert.match(styles, /::marker/);
  assert.match(styles, /var\(--sfggc-pride-purple\)/);
  assert.match(styles, /a\s*\{[^}]*color:\s*var\(--sfggc-pride-blue\)/s);
  assert.match(js("Rules"), /logo-tile/, "sponsor logo must sit on the light logo tile");
});

test("Given the Committee page, when rendered, then volunteers appear as dark pills and role badges use the accent badge", () => {
  const source = js("Committee");
  assert.match(source, /styles\.Volunteer/);
  assert.match(source, /badge-glow/);
  assert.match(scss("Committee"), /\.Volunteer/);
});

test("Given the Results page, when portal links render, then both use the shared high-contrast call-to-action", () => {
  const source = js("Results");
  assert.equal((source.match(/btn-glow-orange/g) || []).length >= 3, true, "PDF, standings and optional events buttons use btn-glow-orange");
  assert.doesNotMatch(source, /btn-outline-secondary/);
  assert.doesNotMatch(source, /btn-outline-primary/);
});

test("Given the San Francisco banner, when rendered, then its image style is reachable from the component's class", () => {
  const source = read("src/components/SanFrancisco/SanFrancisco.js");
  const styles = read("src/components/SanFrancisco/SanFrancisco.module.scss");
  assert.match(source, /styles\.CityDaytimeImage/);
  assert.match(
    styles,
    /\.SanFrancisco\s*\{\s*\.CityDaytimeImage\s*\{[^}]*background-image:[^;]*url\(/,
    ".CityDaytimeImage must be a direct child rule of .SanFrancisco, not nested under an unused wrapper"
  );
});

test("Given the display font stack, when Bungee has not loaded, then the fallback is a heavy sans rather than a script face", () => {
  const variables = read("src/scss/_bootstrap-variables.scss");
  const stack = variables.match(/\$font-family-display:([^;]+);/)[1];
  assert.doesNotMatch(stack, /cursive/);
  assert.match(stack, /Impact|sans-serif/);
});

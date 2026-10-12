import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

/**
 * BDD tests for the home page sections restyled to the sister-site dark theme.
 * Static source analysis: no light-theme utilities or hard-coded light colors
 * may remain in the home page components or their SCSS modules.
 */

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf-8");

const HOME_COMPONENTS = [
  "Hero",
  "Mission",
  "Spotlight",
  "RegisterCTA",
  "HostVenue",
  "Schedule",
  "Location",
  "Sponsors",
  "SanFrancisco",
];

const FORBIDDEN_CLASSES = ["text-dark", "bg-white", "text-secondary", "shadow-2xs"];
const FORBIDDEN_COLORS = [
  "#e11d48", "#2563eb", "#1d4ed8", "#f97316", "#ea580c", "#10b981", "#eab308", "#7c3aed",
  "#ffffff", "#f8fafc", "#0f172a", "#334155",
  "rgba(255, 255, 255", "rgba(15, 23, 42", "rgba(226, 232, 240", "rgba(37, 99, 235",
];

const source = (name) => read(`src/components/${name}/${name}.js`);
const styles = (name) => read(`src/components/${name}/${name}.module.scss`);

for (const name of HOME_COMPONENTS) {
  test(`Given the ${name} component, when read, then no light-theme classes or hard-coded light colors remain`, () => {
    const js = source(name).toLowerCase();
    const scss = styles(name).toLowerCase();
    for (const cls of FORBIDDEN_CLASSES) {
      assert.ok(!js.includes(cls), `${name}.js must not use ${cls}`);
    }
    for (const color of FORBIDDEN_COLORS) {
      assert.ok(!js.includes(color), `${name}.js must not contain ${color}`);
      assert.ok(!scss.includes(color), `${name}.module.scss must not contain ${color}`);
    }
  });
}

test("Given the Hero title, when styled, then it uses fluid Bungee sizing that wraps on narrow phones", () => {
  const scss = styles("Hero");
  assert.match(scss, /font-size:\s*clamp\(/);
  assert.match(scss, /overflow-wrap:\s*(anywhere|break-word)/);
  assert.match(source("Hero"), /display/);
});

test("Given the Hero stat cards, when rendered, then accent colors come from CSS variables not inline hex", () => {
  const js = source("Hero");
  assert.doesNotMatch(js, /style=\{\{[^}]*#[0-9a-fA-F]{3,6}/);
  assert.match(js, /--accent/);
  assert.match(styles("Hero"), /var\(--accent\)/);
});

test("Given the Schedule day cards, when rendered, then accents use Pride CSS variables with a purple uppercase day tag", () => {
  const js = source("Schedule");
  assert.match(js, /var\(--sfggc-pride-/);
  assert.doesNotMatch(js, /rgba\(\d/);
  assert.match(styles("Schedule"), /\.DayTag/);
  assert.match(styles("Schedule"), /text-transform:\s*uppercase/);
});

test("Given the registration call to action, when closed, then the disabled state stays readable on dark", () => {
  const js = source("RegisterCTA");
  assert.match(js, /Registration Closed/);
  assert.match(styles("RegisterCTA"), /\.Closed/);
});

test("Given the logo tiles, when rendered, then partner logos sit on a light tile class so dark artwork stays visible", () => {
  assert.match(read("src/scss/sfggc.scss"), /\.logo-tile\b/);
  assert.match(source("Sponsors"), /logo-tile/);
  assert.match(source("Location"), /logo-tile/);
});

/** WCAG relative-luminance contrast between two hex colors. */
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("Given the palette, when used for text on dark surfaces, then every pairing meets WCAG AA (4.5:1)", () => {
  const surfaces = { night: "#0b0a14", nightMid: "#171129", nightDeep: "#241a3d" };
  const text = {
    ink: "#f4f1fb", inkDim: "#a89fc9",
    red: "#ff4d5e", orange: "#ff9838", yellow: "#ffd54a", green: "#35d68f", blue: "#3fa8ff", purple: "#b874ff",
  };
  for (const [sName, s] of Object.entries(surfaces)) {
    for (const [tName, t] of Object.entries(text)) {
      const ratio = contrast(s, t);
      assert.ok(ratio >= 4.5, `${tName} on ${sName} is ${ratio.toFixed(2)}:1, needs 4.5:1`);
    }
  }
});

test("Given the call-to-action pill, when text sits on the orange-to-red gradient, then dark ink meets WCAG AA", () => {
  for (const bg of ["#ff9838", "#ff4d5e"]) {
    assert.ok(contrast("#1a0a0a", bg) >= 4.5, `ink on ${bg} must be at least 4.5:1`);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

/**
 * BDD tests for the dark design system shared with the sister site
 * (sflgbtbowl.com): near-black violet surfaces, neon Pride accents,
 * Bungee display headings, Inter body text, and a six-color stripe bar.
 */

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf-8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const variables = read("src/scss/_bootstrap-variables.scss");
const colorModes = read("src/scss/_bootstrap-color-modes.scss");
const mainScss = read("src/scss/sfggc.scss");
const documentJs = read("src/pages/_document.js");
const layoutJs = read("src/components/layout/layout.js");
const navigationJs = read("src/components/layout/navigation.js");

const PALETTE = {
  bg: "#0b0a14",
  bgMid: "#171129",
  bgDeep: "#241a3d",
  ink: "#f4f1fb",
  inkDim: "#a89fc9",
  red: "#ff4d5e",
  orange: "#ff9838",
  yellow: "#ffd54a",
  green: "#35d68f",
  blue: "#3fa8ff",
  purple: "#b874ff",
};

test("Given the Sass variables, when read, then every sister-site palette color is defined", () => {
  for (const [name, hex] of Object.entries(PALETTE)) {
    assert.ok(
      variables.toLowerCase().includes(hex),
      `_bootstrap-variables.scss must define ${name} (${hex})`
    );
  }
});

test("Given the Sass variables, when read, then Bungee is the display font and Inter the body font", () => {
  assert.match(variables, /\$font-family-display:\s*['"]?Bungee/);
  assert.match(variables, /\$font-family-sans-serif:\s*['"]?Inter/);
});

test("Given the color mode map, when read, then dark values are the default and no light mode block remains", () => {
  assert.doesNotMatch(colorModes, /\[data-bs-theme=["']light["']\]/);
  assert.match(colorModes, /:root,\s*\[data-bs-theme=["']dark["']\]/);
  assert.match(colorModes, /--#\{\$prefix\}body-bg:\s*#\{\$night\}/, "body background must be the dark violet token");
  assert.match(colorModes, /--#\{\$prefix\}body-color:\s*#\{\$ink\}/, "body text must be the light lavender ink token");
});

test("Given the document, when rendered, then it is locked to dark and loads Bungee and Inter", () => {
  assert.match(documentJs, /<Html[^>]*data-bs-theme=["']dark["']/);
  assert.match(documentJs, /family=Bungee/);
  assert.match(documentJs, /family=Inter/);
  assert.doesNotMatch(documentJs, /Plus\+Jakarta\+Sans/);
});

test("Given the main stylesheet, when read, then it defines the shared stripe bar, pill button, card and input styles", () => {
  assert.match(mainScss, /\.stripe-bar\b/);
  assert.match(mainScss, /\.btn-glow-orange\b/);
  assert.match(mainScss, /\.glass-card\b/);
  assert.match(mainScss, /\.form-control\b/);
  assert.match(mainScss, /\.display\b/);
});

test("Given the stripe bar, when styled, then it is 5px tall and uses all six Pride colors", () => {
  const block = mainScss.slice(mainScss.indexOf(".stripe-bar"));
  assert.match(block, /height:\s*5px/);
  for (const key of ["red", "orange", "yellow", "green", "blue", "purple"]) {
    assert.match(
      block.slice(0, 900),
      new RegExp(`pride-${key}|${PALETTE[key]}`, "i"),
      `stripe bar must include ${key}`
    );
  }
});

test("Given the main stylesheet, when read, then no light-theme surface colors remain", () => {
  for (const light of ["#f8fafc", "#0f172a", "rgba(255, 255, 255", "#ffffff"]) {
    assert.ok(
      !mainScss.toLowerCase().includes(light),
      `sfggc.scss must not contain light-theme color ${light}`
    );
  }
});

test("Given the layout, when rendered, then it uses the stripe bar instead of the old light ribbon", () => {
  assert.match(layoutJs, /stripe-bar/);
  assert.doesNotMatch(layoutJs, /pride-rainbow-bar/);
});

test("Given the theme toggler is removed, when searching the source, then no toggler or theme context remains", () => {
  assert.equal(exists("src/components/ColorModeToggler"), false, "ColorModeToggler directory must be deleted");
  assert.equal(exists("src/utils/ThemeContext.js"), false, "ThemeContext.js must be deleted");
  assert.doesNotMatch(layoutJs, /ThemeContext/);
  assert.doesNotMatch(navigationJs, /ColorModeToggler/);
});

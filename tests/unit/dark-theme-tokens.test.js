import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests for the dark design system shared with the sister site (sflgbtbowl.com).
 * They read the compiled stylesheet, so they follow what the browser receives and keep
 * passing when the SCSS is reformatted or a token's exact value is tuned.
 */

const require = createRequire(import.meta.url);
const { read, exists, mainCss, rootTokens, declarations, contrast } = require("../helpers/theme-sources.js");

const tokens = rootTokens();
const HEX = /^#[0-9a-f]{6}$/i;
const SURFACES = ["--sfggc-night", "--sfggc-night-mid", "--sfggc-night-deep"];
const TEXT = ["--sfggc-ink", "--sfggc-ink-dim", ...["red", "orange", "yellow", "green", "blue", "purple"].map((c) => `--sfggc-pride-${c}`)];

test("Given the compiled stylesheet, when reading :root, then every surface, ink and Pride accent token is a hex color", () => {
  for (const name of [...SURFACES, ...TEXT, "--sfggc-ink-on-accent"]) {
    assert.match(tokens[name] ?? "", HEX, `${name} must be defined as a #rrggbb color`);
  }
});

test("Given the palette, when text is drawn on any dark surface, then every pairing meets WCAG AA (4.5:1)", () => {
  for (const surface of SURFACES) {
    for (const text of TEXT) {
      const ratio = contrast(tokens[surface], tokens[text]);
      assert.ok(ratio >= 4.5, `${text} on ${surface} is ${ratio.toFixed(2)}:1, needs 4.5:1`);
    }
  }
});

test("Given the call-to-action gradient, when dark ink sits on it, then it is legible at both ends", () => {
  for (const accent of ["--sfggc-pride-orange", "--sfggc-pride-red"]) {
    const ratio = contrast(tokens["--sfggc-ink-on-accent"], tokens[accent]);
    assert.ok(ratio >= 4.5, `ink-on-accent over ${accent} is ${ratio.toFixed(2)}:1, needs 4.5:1`);
  }
});

test("Given the shared styles, when compiled, then the stripe bar, pill CTA, card, logo tile and inputs all exist", () => {
  const css = mainCss();
  for (const selector of [".stripe-bar", ".btn-glow-orange", ".surface-card", ".logo-tile", ".form-control", ".display"]) {
    assert.ok(declarations(css, selector), `${selector} must be defined`);
  }
});

test("Given the stripe bar, when compiled, then it is a gradient of all six Pride colors", () => {
  const rule = declarations(mainCss(), ".stripe-bar");
  assert.match(rule, /linear-gradient/);
  for (const color of ["red", "orange", "yellow", "green", "blue", "purple"]) {
    assert.ok(rule.includes(`--sfggc-pride-${color}`), `stripe bar must include ${color}`);
  }
});

test("Given the font settings, when read, then Bungee is the display face and Inter the body face", () => {
  const variables = read("src/scss/_bootstrap-variables.scss");
  assert.match(variables, /\$font-family-display:\s*['"]?Bungee/);
  assert.match(variables, /\$font-family-sans-serif:\s*['"]?Inter/);
  const documentJs = read("src/pages/_document.js");
  assert.match(documentJs, /Bungee/);
  assert.match(documentJs, /Inter/);
});

test("Given the document, when rendered, then the site is locked to the dark color mode", () => {
  assert.match(read("src/pages/_document.js"), /<Html[^>]*data-bs-theme=["']dark["']/);
});

test("Given the theme toggler was removed, when looking for it, then neither the component nor the context exists", () => {
  assert.equal(exists("src/components/ColorModeToggler"), false);
  assert.equal(exists("src/utils/ThemeContext.js"), false);
});

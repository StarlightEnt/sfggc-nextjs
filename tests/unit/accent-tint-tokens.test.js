import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests that keep translucent accent colors tied to the palette tokens. A tint written as a
 * literal rgba() copy of a palette color keeps the old color when the palette changes; a tint
 * written as color-mix(in srgb, var(--sfggc-...) N%, transparent) follows the token.
 */

const require = createRequire(import.meta.url);
const { read, walk, rootTokens } = require("../helpers/theme-sources.js");

const tokens = rootTokens();
// Accent and ink tints must follow the tokens. Page-background shades inside gradients (rgba of --sfggc-night)
// are deliberately left as literals: browsers round color-mix() gradient stops differently, so converting
// them would shift the rendered pixels.
const PALETTE = Object.entries(tokens).filter(([name, value]) => /^--sfggc-(pride-|ink$)/.test(name) && /^#[0-9a-f]{6}$/i.test(value));
const asRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");
const paletteByRgb = new Map(PALETTE.map(([name, hex]) => [asRgb(hex), name]));

// Hand-written styles. Token definitions in `:root` are derived from the Sass palette variables, not literals.
const styleSources = [...walk("src/components", [".scss"]), "src/scss/sfggc.scss"];

test("Given the palette tokens, when the hand-written styles are read, then none repeats a palette color as a literal rgba()", () => {
  const offenders = [];
  for (const file of styleSources) {
    for (const m of read(file).matchAll(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/g)) {
      const token = paletteByRgb.get(`${m[1]},${m[2]},${m[3]}`);
      if (token) offenders.push(`${file}: ${m[0]}... is ${token}; use color-mix(in srgb, var(${token}) N%, transparent)`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("Given a tint written with color-mix, when it names a palette token, then that token is defined", () => {
  const missing = [];
  for (const file of styleSources) {
    for (const m of read(file).matchAll(/color-mix\(in srgb,\s*var\((--sfggc-[a-z0-9-]+)/g)) {
      if (!tokens[m[1]]) missing.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

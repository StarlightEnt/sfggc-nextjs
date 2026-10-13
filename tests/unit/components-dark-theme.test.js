import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests for component-level dark-theme invariants that a static class-name scan cannot see.
 */

const require = createRequire(import.meta.url);
const { read, compile, declarations } = require("../helpers/theme-sources.js");

test("Given the Hero title, when compiled, then long Bungee words wrap instead of overflowing small phones", () => {
  const css = compile("src/components/Hero/Hero.module.scss");
  assert.match(declarations(css, ".Hero .Content .Title"), /overflow-wrap:\s*(anywhere|break-word)/);
});

test("Given partner logos with dark artwork, when shown on dark surfaces, then they sit on the light logo tile", () => {
  for (const file of ["src/components/Sponsors/Sponsors.js", "src/components/Location/Location.js"]) {
    assert.match(read(file), /\blogo-tile\b/, `${file} must place logos on .logo-tile`);
  }
});

test("Given the Committee and Scratch Masters cards, when compiled, then they do not paint dark text on a light card", () => {
  for (const [file, selector] of [
    ["src/components/Committee/Committee.module.scss", ".Committee .Card"],
    ["src/components/ScrMstWinners/ScrMstWinners.module.scss", ".ScrMstWinners .Card"],
  ]) {
    const rule = declarations(compile(file), selector);
    assert.doesNotMatch(rule, /(^|[;\s])color:\s*var\(--sfggc-body-bg\)/, `${file}: .Card must not use the page background as text color`);
  }
});

test("Given the San Francisco banner, when compiled, then the class the component uses carries the banner image", () => {
  assert.match(read("src/components/SanFrancisco/SanFrancisco.js"), /styles\.CityDaytimeImage/);
  const rule = declarations(compile("src/components/SanFrancisco/SanFrancisco.module.scss"), ".SanFrancisco .CityDaytimeImage");
  assert.match(rule, /background-image:[^;]*url\(/);
});

test("Given the display font stack, when Bungee has not loaded, then the fallback is not a script face", () => {
  const stack = read("src/scss/_bootstrap-variables.scss").match(/\$font-family-display:([^;]+);/)[1];
  assert.doesNotMatch(stack, /cursive|fantasy/);
});

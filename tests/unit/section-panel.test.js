import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests for the shared content-section look: a heading bar (.section-heading) sitting on top
 * of a body panel (.section-panel). The pairing is defined once in the global stylesheet, so
 * components must not re-spell its padding, radius or border utilities.
 */

const require = createRequire(import.meta.url);
const { read, walk, mainCss, parseRules, declarations, classNameStrings } = require("../helpers/theme-sources.js");

const componentFiles = walk("src/components", [".js"]);
const classesIn = (file) => classNameStrings(read(file)).flatMap((value) => value.split(/\s+/).filter(Boolean));

test("Given the section panel, when compiled, then it is a card body with padding that grows at md, no top border and flat top corners", () => {
  const css = mainCss();
  const rule = declarations(css, ".section-panel");
  assert.match(rule, /background:/, "the panel must paint the card surface");
  assert.match(rule, /border-top:\s*0/, "the heading bar draws the top edge, so the panel must not");
  assert.match(rule, /border-top-left-radius:\s*0/);
  assert.match(rule, /border-top-right-radius:\s*0/);
  const paddings = parseRules(css)
    .filter((r) => r.selectors.includes(".section-panel"))
    .flatMap((r) => [...r.body.matchAll(/(?:^|[;\s])padding:\s*([^;]+)/g)].map((m) => m[1]));
  assert.ok(paddings.length >= 2, "the panel must set a base padding and a larger one from md up");
  assert.match(css, /@media \(min-width: 768px\)\s*\{[^@]*\.section-panel/, "the larger padding must start at the md breakpoint");
});

test("Given the section heading, when compiled, then it removes its own bottom margin so it sits flush on the panel", () => {
  const rules = parseRules(mainCss()).filter((r) => r.selectors.some((s) => /\.section-heading$/.test(s)));
  assert.match(rules.map((r) => r.body).join(" "), /margin-bottom:\s*0/);
});

test("Given every component, when its classes are read, then none re-spells the panel utilities that .section-panel owns", () => {
  const offenders = [];
  for (const file of componentFiles) {
    for (const token of classesIn(file)) {
      if (["rounded-top-0", "border-top-0"].includes(token)) offenders.push(`${file}: ${token}`);
    }
  }
  assert.deepEqual(offenders, [], "use className=\"section-panel\" instead of p-4 p-md-5 rounded-top-0 border-top-0");
});

test("Given a component with a section heading, when its classes are read, then it does not repeat mb-0 and has a section panel", () => {
  const offenders = [];
  for (const file of componentFiles) {
    const tokens = classesIn(file);
    if (!tokens.includes("section-heading")) continue;
    for (const value of classNameStrings(read(file))) {
      const parts = value.split(/\s+/);
      if (parts.includes("section-heading") && parts.includes("mb-0")) offenders.push(`${file}: section-heading mb-0`);
    }
    if (!tokens.includes("section-panel") && !file.endsWith("Beneficiary.js")) offenders.push(`${file}: no section-panel`);
  }
  assert.deepEqual(offenders, []);
});

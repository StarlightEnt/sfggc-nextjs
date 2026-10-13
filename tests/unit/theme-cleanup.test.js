import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

/**
 * BDD tests that keep styles and markup in agreement: every CSS variable resolves, no utility
 * class is used that nothing defines, and no CSS-module class is styled but never used.
 */

const require = createRequire(import.meta.url);
const { ROOT, read, walk, mainCss, compile, parseRules, classNameStrings } = require("../helpers/theme-sources.js");

const sourceFiles = walk("src");

test("Given every var(--sfggc-*) reference, when the stylesheet is compiled, then each variable is defined somewhere", () => {
  const defined = new Set([...mainCss().matchAll(/(--sfggc-[a-z0-9-]+)['"]?\s*:/g)].map((m) => m[1]));
  const missing = [];
  for (const file of sourceFiles) {
    const text = read(file);
    // Variables a file sets for itself (inline style or module rule) also count as defined.
    const local = new Set([...text.matchAll(/(--sfggc-[a-z0-9-]+)['"]?\s*:/g)].map((m) => m[1]));
    for (const m of text.matchAll(/var\((--sfggc-[a-z0-9-]+)/g)) {
      if (!defined.has(m[1]) && !local.has(m[1])) missing.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual([...new Set(missing)], [], "an undefined CSS variable silently resolves to nothing");
});

test("Given classes that were once used as utilities, when a component uses one, then something must define it", () => {
  // These names look like Bootstrap/Tailwind utilities but were never defined here, so they did nothing.
  const lookAlikes = ["fw-extrabold", "fs-7", "fs-8", "tracking-tight", "tracking-wider", "leading-relaxed", "lh-relaxed",
    "hover-text-primary", "hover-transform-up", "hover-border-primary", "transition-all", "letter-spacing-1"];
  const defined = new Set(parseRules(mainCss()).flatMap((r) => r.selectors.flatMap((s) => [...s.matchAll(/\.([\w-]+)/g)].map((m) => m[1]))));
  const offenders = [];
  for (const file of sourceFiles.filter((f) => f.endsWith(".js"))) {
    for (const classes of classNameStrings(read(file))) {
      for (const token of classes.split(/\s+/)) {
        if (lookAlikes.includes(token) && !defined.has(token)) offenders.push(`${file}: ${token}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("Given each CSS module, when compiled, then every class it styles is used by a component in the same folder", () => {
  const unused = [];
  for (const scss of sourceFiles.filter((f) => f.endsWith(".module.scss"))) {
    const dir = path.dirname(scss);
    const js = fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".js")).map((f) => read(path.join(dir, f))).join("\n");
    const classes = new Set();
    for (const rule of parseRules(compile(scss))) {
      for (const selector of rule.selectors) {
        if (selector.includes(":global")) continue; // targets Bootstrap/global classes by design
        for (const m of selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) classes.add(m[1]);
      }
    }
    for (const cls of classes) {
      const used = new RegExp(`\\.${cls}\\b|\\[['"]${cls}['"]\\]`).test(js);
      if (!used) unused.push(`${scss}: .${cls}`);
    }
  }
  assert.deepEqual(unused, [], "styled but never referenced as styles.<Name>; remove the rule or use the class");
});

test("Given each component, when it references styles.<Name>, then its CSS module defines that class (no literal 'undefined' class)", () => {
  const missing = [];
  for (const jsFile of sourceFiles.filter((f) => f.endsWith(".js"))) {
    const source = read(jsFile);
    for (const imp of source.matchAll(/import\s+(\w+)\s+from\s+['"](\.\/[\w.-]+\.module\.scss)['"]/g)) {
      const [, binding, relPath] = imp;
      const scssPath = path.join(path.dirname(jsFile), relPath);
      const defined = new Set();
      for (const rule of parseRules(compile(scssPath))) {
        for (const selector of rule.selectors) {
          if (selector.includes(":global")) continue;
          for (const m of selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) defined.add(m[1]);
        }
      }
      for (const use of source.matchAll(new RegExp(`\\b${binding}\\.([A-Za-z_]\\w*)|\\b${binding}\\[['"]([\\w-]+)['"]\\]`, "g"))) {
        const name = use[1] ?? use[2];
        if (!defined.has(name)) missing.push(`${jsFile}: ${binding}.${name}`);
      }
    }
  }
  assert.deepEqual([...new Set(missing)], [], "a missing module class renders as the string 'undefined'");
});

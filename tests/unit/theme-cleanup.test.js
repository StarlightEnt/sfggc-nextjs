import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

/**
 * BDD tests that keep the dark-only design system free of leftovers:
 * no theme branching, no undefined CSS variables or utility classes,
 * and no unused legacy tokens from the previous light/dark setup.
 */

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf-8");
const require = createRequire(import.meta.url);
const sass = require("sass");

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(js|scss)$/.test(e.name)) out.push(rel);
  }
  return out;
};
const srcFiles = walk("src");
const compiled = sass.compile(path.join(root, "src/scss/sfggc.scss"), {
  loadPaths: [path.join(root, "node_modules")],
  logger: sass.Logger.silent,
  quietDeps: true,
}).css;

test("Given the source, when searching for theme branching, then only the document and color-mode map mention data-bs-theme", () => {
  const allowed = new Set(["src/pages/_document.js", "src/scss/_bootstrap-color-modes.scss"].map((p) => path.normalize(p)));
  const offenders = srcFiles.filter((f) => !allowed.has(path.normalize(f)) && /data-bs-theme/.test(read(f)));
  assert.deepEqual(offenders, []);
});

test("Given every var(--sfggc-*) reference, when the stylesheet is compiled, then each variable is defined somewhere", () => {
  const defined = new Set([...compiled.matchAll(/(--sfggc-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const missing = [];
  for (const file of srcFiles) {
    const text = read(file);
    // Variables a module sets for itself (e.g. --sfggc-foo: ...) also count as defined.
    const local = new Set([...text.matchAll(/(--sfggc-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    for (const m of text.matchAll(/var\((--sfggc-[a-z0-9-]+)/g)) {
      if (!defined.has(m[1]) && !local.has(m[1])) missing.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual([...new Set(missing)], [], "undefined CSS variables silently fall back to nothing");
});

test("Given the components, when searching for utility classes, then none are used that no stylesheet defines", () => {
  const undefinedClasses = /\b(fw-extrabold|fs-7|fs-8|max-w-[0-9a-z]+|tracking-[a-z]+|leading-relaxed|lh-relaxed|hover-text-primary|hover-transform-up|hover-border-primary|transition-all|letter-spacing-1)\b/;
  const offenders = srcFiles.filter((f) => f.endsWith(".js") && undefinedClasses.test(read(f)));
  assert.deepEqual(offenders, []);
});

test("Given the Sass variables, when read, then the legacy light/dark aliases are gone", () => {
  const variables = read("src/scss/_bootstrap-variables.scss");
  for (const legacy of ["$deep-gray", "$deep-blue", "$silver", "$silver-dark", "$burnt-orange", "$light-blue"]) {
    assert.ok(!variables.includes(legacy), `${legacy} is unused and must be removed`);
  }
});

test("Given the color mode map, when read, then it defines no custom properties that nothing consumes", () => {
  const colorModes = read("src/scss/_bootstrap-color-modes.scss");
  const everythingElse = srcFiles.filter((f) => !f.endsWith("_bootstrap-color-modes.scss")).map(read).join("\n");
  for (const name of ["background-shade-opacity", "section-background-shade-opacity", "image-shade-opacity", "location-logo-bg-gradient-start", "sponsor-logo-bg"]) {
    assert.ok(!colorModes.includes(`${name}:`) || everythingElse.includes(`--sfggc-${name}`), `--sfggc-${name} is defined but never used`);
  }
});

test("Given the San Francisco styles, when read, then only rules the component uses remain", () => {
  const styles = read("src/components/SanFrancisco/SanFrancisco.module.scss");
  const source = read("src/components/SanFrancisco/SanFrancisco.js");
  const classes = [...styles.matchAll(/\.([A-Z][A-Za-z0-9]+)\b/g)].map((m) => m[1]);
  for (const cls of new Set(classes)) {
    assert.ok(source.includes(`styles.${cls}`), `.${cls} is styled but never used by SanFrancisco.js`);
  }
});

test("Given the Location and San Francisco components, when styling links and intros, then they use module classes", () => {
  assert.match(read("src/components/Location/Location.js"), /styles\.VenueLink/);
  assert.match(read("src/components/SanFrancisco/SanFrancisco.js"), /styles\.Intro/);
});

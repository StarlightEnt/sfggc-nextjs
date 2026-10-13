import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests that stop the old light theme (and Bootstrap's unprefixed variables) from creeping
 * back in. They scan the whole of src/ instead of a hand-kept list of components, so new
 * components are covered automatically.
 *
 * A line can opt out with a `theme-exempt` comment on it or within the three lines above it.
 */

const require = createRequire(import.meta.url);
const { read, walk, classNameStrings } = require("../helpers/theme-sources.js");

const sourceFiles = walk("src");
const jsFiles = sourceFiles.filter((f) => f.endsWith(".js"));

/** Yields { file, line, text } for each line matching `regex` that is not marked theme-exempt. */
const findLines = (files, regex) => {
  const hits = [];
  for (const file of files) {
    const lines = read(file).split("\n");
    lines.forEach((text, i) => {
      if (!regex.test(text)) return;
      const nearby = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
      if (!/theme-exempt/.test(nearby)) hits.push(`${file}:${i + 1}: ${text.trim().slice(0, 100)}`);
    });
  }
  return hits;
};

test("Given every component and page, when reading class names, then none use light-surface Bootstrap utilities", () => {
  const offenders = [];
  for (const file of jsFiles) {
    for (const classes of classNameStrings(read(file))) {
      const tokens = classes.split(/\s+/);
      const bad = tokens.filter((t) => ["bg-white", "bg-light", "table-light", "navbar-light", "btn-light", "text-black"].includes(t));
      // text-dark is only legitimate on the yellow/cyan badges Bootstrap itself pairs it with
      if (tokens.includes("text-dark") && !tokens.some((t) => ["bg-warning", "bg-info"].includes(t))) bad.push("text-dark");
      if (bad.length) offenders.push(`${file}: ${bad.join(", ")}`);
    }
  }
  assert.deepEqual(offenders, [], "use the dark tokens, or add a theme-exempt comment with a reason");
});

test("Given the source, when searching for the retired light-theme palette, then none of its colors remain", () => {
  const retired = /#(f8fafc|0f172a|334155|e11d48|2563eb|f97316|10b981|eab308|7c3aed)\b/i;
  assert.deepEqual(findLines(sourceFiles, retired), []);
});

test("Given inline styles in components, when they set a hex color, then it is explicitly exempted", () => {
  const inlineHex = /style=\{\{[^}]*#[0-9a-f]{3,8}\b/i;
  assert.deepEqual(findLines(jsFiles, inlineHex), [], "inline colors bypass the theme; use a token or add theme-exempt");
});

test("Given any stylesheet or component, when it references Bootstrap variables, then it uses the sfggc- prefix not --bs-", () => {
  assert.deepEqual(findLines(sourceFiles, /var\(--bs-/), [], "--bs-* variables do not exist in this project");
});

test("Given the source, when searching for theme branching, then only the document and color-mode map mention data-bs-theme", () => {
  const allowed = ["src/pages/_document.js", "src/scss/_bootstrap-color-modes.scss"];
  const files = sourceFiles.filter((f) => !allowed.includes(f.split("\\").join("/")));
  assert.deepEqual(findLines(files, /data-bs-theme/), []);
});

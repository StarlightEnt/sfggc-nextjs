import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests for the shared card class. It is a solid dark surface (not translucent glass), so its
 * name must say so, and no source, test or agent doc may keep using the old, misleading name.
 */

const require = createRequire(import.meta.url);
const { read, walk, mainCss, parseRules, declarations } = require("../helpers/theme-sources.js");

// Built from parts so this file does not contain the name it forbids.
const STALE_NAME = ["glass", "card"].join("-");

test("Given the shared card, when compiled, then .surface-card paints the solid night-mid surface with a hairline border", () => {
  const rule = declarations(mainCss(), ".surface-card");
  assert.match(rule, /background:\s*var\(--sfggc-night-mid\)/);
  assert.match(rule, /border:[^;]*var\(--sfggc-hairline\)/);
});

test("Given sources, tests and agent docs, when searched, then nothing still uses the old misleading card name", () => {
  const files = [
    ...walk("src", [".js", ".scss"]),
    ...walk("tests", [".js"]),
    ...walk(".cursor", [".mdc", ".md"]),
    "CLAUDE.md",
    "CLAUDE-PATTERNS.md",
  ];
  const stale = files.filter((file) => read(file).includes(STALE_NAME));
  assert.deepEqual(stale, [], `rename ${STALE_NAME} to surface-card`);
});

test("Given the section panel, when compiled, then it is built on the shared card rather than repeating its surface", () => {
  const cardSelectors = new Set(
    parseRules(mainCss())
      .filter((r) => /background:\s*var\(--sfggc-night-mid\)/.test(r.body))
      .flatMap((r) => r.selectors)
  );
  assert.ok(cardSelectors.has(".section-panel"), ".section-panel must share the card's surface rule");
  assert.ok(cardSelectors.has(".surface-card"));
});

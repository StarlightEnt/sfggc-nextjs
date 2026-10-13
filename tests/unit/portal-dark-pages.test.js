import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests for the logged-in portal pages on the dark theme. Light-theme leftovers are covered
 * repo-wide by theme-no-light-leftovers.test.js; these cover what is specific to the portal.
 */

const require = createRequire(import.meta.url);
const { read, mainCss, compile, declarations } = require("../helpers/theme-sources.js");

test("Given the default portal shell, when compiled, then the page title carries a gradient accent bar", () => {
  const shellCss = compile("src/components/Portal/PortalShell/PortalShell.module.scss");
  assert.match(declarations(shellCss, ".PageTitle::after"), /linear-gradient/);
});

test("Given the default portal shell, when rendered, then the title is not styled as a flush content-section panel", () => {
  const shell = read("src/components/Portal/PortalShell/PortalShell.js");
  const defaultBranch = shell.slice(shell.lastIndexOf("return ("));
  assert.doesNotMatch(defaultBranch, /section-heading/);
});

test("Given the scratch masters cutoff row, when rendered, then it uses a themed divider class", () => {
  assert.match(read("src/pages/portal/admin/scratch-masters.js"), /scratch-cutoff-divider/);
  assert.match(declarations(mainCss(), ".scratch-cutoff-divider"), /background/);
});

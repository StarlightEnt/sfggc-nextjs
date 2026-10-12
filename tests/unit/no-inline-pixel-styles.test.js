import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

/**
 * BDD tests that keep pixel sizing in CSS modules. Inline style props are reserved for values that
 * are computed at render time (CSS custom properties such as --accent); a fixed logo height belongs
 * in the component's module so it can follow breakpoints and be reviewed with the rest of the styles.
 */

const require = createRequire(import.meta.url);
const { read, walk } = require("../helpers/theme-sources.js");

// The public site. Portal screens size scroll areas from shared constants and are out of scope here.
const publicComponents = walk("src/components", [".js"]).filter((file) => !file.includes("/Portal/"));

test("Given the public components, when their inline style props are read, then none sets a fixed pixel height or width", () => {
  const offenders = [];
  for (const file of publicComponents) {
    for (const m of read(file).matchAll(/style=\{\{([^}]*)\}\}/g)) {
      if (/(?:^|[\s,])(?:min|max)?-?(?:height|width)\s*:\s*['"]?\d+(?:px)?['"]?/i.test(m[1].replace(/Height/g, "-height").replace(/Width/g, "-width"))) {
        offenders.push(`${file}: style={{${m[1]}}}`);
      }
    }
  }
  assert.deepEqual(offenders, [], "move the size into the component's CSS module");
});

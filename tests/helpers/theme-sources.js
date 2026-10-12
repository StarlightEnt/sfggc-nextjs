/**
 * Shared helpers for the design-system tests.
 *
 * - Paths resolve from this file, not process.cwd(), so tests run from any directory.
 * - SCSS is compiled with the real `sass` package and inspected as CSS, so tests assert on
 *   what the browser receives rather than on how the source happens to be formatted.
 */
const fs = require("node:fs");
const path = require("node:path");
const sass = require("sass");

const ROOT = path.resolve(__dirname, "..", "..");

const abs = (rel) => path.join(ROOT, rel);
const read = (rel) => fs.readFileSync(abs(rel), "utf-8");
const exists = (rel) => fs.existsSync(abs(rel));

/** Recursively lists files under `dir` (relative to the repo root) with one of `exts`. */
const walk = (dir, exts = [".js", ".scss"], out = []) => {
  for (const entry of fs.readdirSync(abs(dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, exts, out);
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(rel);
  }
  return out;
};

const compileCache = new Map();
const compile = (rel) => {
  if (!compileCache.has(rel)) {
    compileCache.set(
      rel,
      sass.compile(abs(rel), {
        loadPaths: [abs("node_modules")],
        logger: sass.Logger.silent,
        quietDeps: true,
      }).css
    );
  }
  return compileCache.get(rel);
};

/** The global stylesheet exactly as the app builds it. */
const mainCss = () => compile("src/scss/sfggc.scss");

const normalize = (text) => text.replace(/\s+/g, " ").trim();

/**
 * Parses expanded CSS into [{ selectors: [..], body }] (flattening @media blocks).
 * Good enough for sass's expanded output; not a general CSS parser.
 */
const parseRules = (css) => {
  const rules = [];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(stripped))) {
    const prelude = normalize(m[1]);
    if (prelude.startsWith("@")) continue;
    rules.push({ selectors: prelude.split(",").map(normalize), body: normalize(m[2]) });
  }
  return rules;
};

/** Concatenated declaration text of every rule whose selector list contains `selector`. */
const declarations = (css, selector) =>
  parseRules(css)
    .filter((r) => r.selectors.includes(normalize(selector)))
    .map((r) => r.body)
    .join(" ");

/** Values of --sfggc-* custom properties declared on :root in the compiled stylesheet. */
const rootTokens = (css = mainCss()) => {
  const tokens = {};
  for (const rule of parseRules(css)) {
    if (!rule.selectors.includes(":root")) continue;
    for (const m of rule.body.matchAll(/(--sfggc-[a-z0-9-]+)\s*:\s*([^;]+);?/g)) tokens[m[1]] = m[2].trim();
  }
  return tokens;
};

/** Every whitespace-separated class token from static className strings in a JS source. */
const classNameStrings = (source) => {
  const found = [];
  for (const m of source.matchAll(/className=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{'([^']*)'\}|\{"([^"]*)"\})/g)) {
    found.push(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]);
  }
  return found;
};

/** WCAG 2.x relative luminance and contrast ratio for #rrggbb colors. */
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

module.exports = {
  ROOT,
  abs,
  read,
  exists,
  walk,
  compile,
  mainCss,
  parseRules,
  declarations,
  rootTokens,
  classNameStrings,
  contrast,
};

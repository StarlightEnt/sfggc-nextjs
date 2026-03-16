const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execSync } = require("child_process");

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = path.join(PROJECT_ROOT, "deploy_scripts/lib/optimize-images.sh");
const OUTPUT_LIB = path.join(PROJECT_ROOT, "deploy_scripts/lib/output.sh");
const BUILD_SCRIPT = path.join(PROJECT_ROOT, "deploy_scripts/lib/build.sh");
const DEPLOY_SCRIPT = path.join(PROJECT_ROOT, "deploy_scripts/deploy.sh");

// Temp directory for test images
const TEST_IMG_DIR = path.join(PROJECT_ROOT, "tests/.tmp-optimize-images");
const TEST_BUILD_DIR = path.join(PROJECT_ROOT, "tests/.tmp-images-build");

const MAX_WIDTH = 800;

/**
 * Helper: create a valid PNG test image with specified dimensions.
 * Builds a minimal PNG file using Node.js built-in zlib (no external deps).
 * Then converts to JPEG via sips for testing.
 */
function createTestImage(filepath, width, height) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Build a valid PNG programmatically
  const pngPath = filepath.replace(/\.jpg$/, ".png");

  // PNG raw pixel data: each row starts with filter byte (0x00 = None)
  // followed by RGB bytes (white pixels: 0xFF 0xFF 0xFF)
  const rowBytes = 1 + width * 3; // filter byte + RGB per pixel
  const rawData = Buffer.alloc(rowBytes * height, 0);
  for (let y = 0; y < height; y++) {
    const offset = y * rowBytes;
    rawData[offset] = 0; // filter: None
    for (let x = 0; x < width * 3; x++) {
      rawData[offset + 1 + x] = 0xFF; // white
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG helper: create a chunk (type + data + CRC)
  function pngChunk(type, data) {
    const typeBuffer = Buffer.from(type, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const payload = Buffer.concat([typeBuffer, data]);
    const crc = crc32(payload);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0);
    return Buffer.concat([length, payload, crcBuffer]);
  }

  // CRC32 for PNG
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // IHDR data: width(4) + height(4) + bitDepth(1) + colorType(1) + compression(1) + filter(1) + interlace(1)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const png = Buffer.concat([
    signature,
    pngChunk("IHDR", ihdrData),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  fs.writeFileSync(pngPath, png);

  // Convert PNG to JPEG via sips
  execSync(`sips -s format jpeg "${pngPath}" --out "${filepath}" 2>/dev/null`, { stdio: "pipe" });
  if (pngPath !== filepath) fs.unlinkSync(pngPath);
}

/**
 * Helper: get image width via sips
 */
function getImageWidth(filepath) {
  const output = execSync(`sips -g pixelWidth "${filepath}" 2>/dev/null`, {
    encoding: "utf-8",
  });
  const match = output.match(/pixelWidth:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Helper: run the optimize_images function from the shell script.
 */
function runOptimizeImages(options = {}) {
  const { dryRun = false, imageDir = TEST_IMG_DIR } = options;

  const env = dryRun ? 'DRY_RUN=true' : 'DRY_RUN=false';

  const cmd = `
    ${env} VERBOSE=false DEBUG=false
    source "${OUTPUT_LIB}"
    source "${SCRIPT_PATH}"
    optimize_images "${imageDir}"
  `;

  return execSync(`bash -c '${cmd.replace(/'/g, "'\\''")}'`, {
    encoding: "utf-8",
    cwd: PROJECT_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/**
 * Helper: run prepare_build_images from the shell script.
 */
function runPrepareBuildImages(options = {}) {
  const { dryRun = false, sourceDir = TEST_IMG_DIR, buildDir = TEST_BUILD_DIR } = options;

  const env = dryRun ? 'DRY_RUN=true' : 'DRY_RUN=false';

  const cmd = `
    ${env} VERBOSE=false DEBUG=false
    source "${OUTPUT_LIB}"
    source "${SCRIPT_PATH}"
    BUILD_IMAGES_DIR="${buildDir}"
    prepare_build_images "${sourceDir}"
  `;

  return execSync(`bash -c '${cmd.replace(/'/g, "'\\''")}'`, {
    encoding: "utf-8",
    cwd: PROJECT_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("Deploy image optimization", () => {
  beforeEach(() => {
    for (const dir of [TEST_IMG_DIR, TEST_BUILD_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    }
    fs.mkdirSync(TEST_IMG_DIR, { recursive: true });
  });

  afterEach(() => {
    for (const dir of [TEST_IMG_DIR, TEST_BUILD_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    }
  });

  test("Given optimize-images.sh exists, when checked, then it is a valid shell script", () => {
    assert.ok(
      fs.existsSync(SCRIPT_PATH),
      `optimize-images.sh should exist at ${SCRIPT_PATH}`
    );

    const content = fs.readFileSync(SCRIPT_PATH, "utf-8");
    assert.ok(
      content.includes("optimize_images"),
      "Script should define an optimize_images function"
    );
  });

  test("Given an image wider than 800px, when optimize_images runs, then it resizes to 800px wide", () => {
    const imgPath = path.join(TEST_IMG_DIR, "oversized.jpg");
    createTestImage(imgPath, 1600, 1200);

    const widthBefore = getImageWidth(imgPath);
    assert.ok(widthBefore > MAX_WIDTH, `Test image should start wider than ${MAX_WIDTH}px`);

    runOptimizeImages();

    const widthAfter = getImageWidth(imgPath);
    assert.strictEqual(widthAfter, MAX_WIDTH, `Image should be resized to ${MAX_WIDTH}px wide`);
  });

  test("Given an image at or below 800px, when optimize_images runs, then it is not modified", () => {
    const imgPath = path.join(TEST_IMG_DIR, "small.jpg");
    createTestImage(imgPath, 400, 300);

    const sizeBefore = fs.statSync(imgPath).size;
    const widthBefore = getImageWidth(imgPath);

    runOptimizeImages();

    const sizeAfter = fs.statSync(imgPath).size;
    const widthAfter = getImageWidth(imgPath);

    assert.strictEqual(widthAfter, widthBefore, "Small image width should not change");
    assert.strictEqual(sizeAfter, sizeBefore, "Small image file size should not change");
  });

  test("Given DRY_RUN=true, when optimize_images runs, then no images are modified", () => {
    const imgPath = path.join(TEST_IMG_DIR, "dryrun.jpg");
    createTestImage(imgPath, 1600, 1200);

    const sizeBefore = fs.statSync(imgPath).size;

    runOptimizeImages({ dryRun: true });

    const sizeAfter = fs.statSync(imgPath).size;
    assert.strictEqual(sizeAfter, sizeBefore, "Image should not be modified in dry-run mode");
  });

  test("Given no oversized images, when optimize_images runs, then it reports nothing to optimize", () => {
    const imgPath = path.join(TEST_IMG_DIR, "ok.jpg");
    createTestImage(imgPath, 600, 400);

    const output = runOptimizeImages();

    assert.ok(
      output.includes("No oversized images") || output.includes("0 images"),
      `Should report no images needed optimization, got: ${output}`
    );
  });

  test("Given a subdirectory with oversized images, when optimize_images runs, then it finds images recursively", () => {
    const subdir = path.join(TEST_IMG_DIR, "subdir");
    fs.mkdirSync(subdir, { recursive: true });

    const imgPath = path.join(subdir, "nested.jpg");
    createTestImage(imgPath, 1200, 900);

    runOptimizeImages();

    const widthAfter = getImageWidth(imgPath);
    assert.strictEqual(widthAfter, MAX_WIDTH, "Nested image should also be resized");
  });

  test("Given mixed images, when optimize_images runs, then only oversized ones are resized", () => {
    const smallImg = path.join(TEST_IMG_DIR, "small.jpg");
    const largeImg = path.join(TEST_IMG_DIR, "large.jpg");

    createTestImage(smallImg, 400, 300);
    createTestImage(largeImg, 2000, 1500);

    const smallSizeBefore = fs.statSync(smallImg).size;

    runOptimizeImages();

    const smallSizeAfter = fs.statSync(smallImg).size;
    const largeWidthAfter = getImageWidth(largeImg);

    assert.strictEqual(smallSizeAfter, smallSizeBefore, "Small image should not be touched");
    assert.strictEqual(largeWidthAfter, MAX_WIDTH, "Large image should be resized");
  });
});

describe("Non-destructive image optimization (prepare_build_images)", () => {
  beforeEach(() => {
    for (const dir of [TEST_IMG_DIR, TEST_BUILD_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    }
    fs.mkdirSync(TEST_IMG_DIR, { recursive: true });
  });

  afterEach(() => {
    for (const dir of [TEST_IMG_DIR, TEST_BUILD_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    }
  });

  test("Given oversized source images, when prepare_build_images runs, then originals are unchanged", () => {
    const imgPath = path.join(TEST_IMG_DIR, "photo.jpg");
    createTestImage(imgPath, 1600, 1200);

    const sizeBefore = fs.statSync(imgPath).size;
    const widthBefore = getImageWidth(imgPath);

    runPrepareBuildImages();

    const sizeAfter = fs.statSync(imgPath).size;
    const widthAfter = getImageWidth(imgPath);

    assert.strictEqual(sizeAfter, sizeBefore, "Original image file size must not change");
    assert.strictEqual(widthAfter, widthBefore, "Original image width must not change");
  });

  test("Given oversized source images, when prepare_build_images runs, then build dir has optimized copies", () => {
    const imgPath = path.join(TEST_IMG_DIR, "photo.jpg");
    createTestImage(imgPath, 1600, 1200);

    runPrepareBuildImages();

    const buildImgPath = path.join(TEST_BUILD_DIR, "photo.jpg");
    assert.ok(fs.existsSync(buildImgPath), "Optimized copy should exist in build dir");

    const buildWidth = getImageWidth(buildImgPath);
    assert.strictEqual(buildWidth, MAX_WIDTH, "Build copy should be resized to MAX_WIDTH");
  });

  test("Given source images in subdirectories, when prepare_build_images runs, then directory structure is preserved", () => {
    const subdir = path.join(TEST_IMG_DIR, "bg");
    fs.mkdirSync(subdir, { recursive: true });

    const imgPath = path.join(subdir, "hero.jpg");
    createTestImage(imgPath, 2000, 1500);

    runPrepareBuildImages();

    const buildImgPath = path.join(TEST_BUILD_DIR, "bg", "hero.jpg");
    assert.ok(fs.existsSync(buildImgPath), "Subdirectory structure should be preserved in build dir");

    const buildWidth = getImageWidth(buildImgPath);
    assert.strictEqual(buildWidth, MAX_WIDTH, "Nested build copy should be resized");
  });

  test("Given small source images, when prepare_build_images runs, then build copies match originals", () => {
    const imgPath = path.join(TEST_IMG_DIR, "icon.jpg");
    createTestImage(imgPath, 400, 300);

    const originalSize = fs.statSync(imgPath).size;

    runPrepareBuildImages();

    const buildImgPath = path.join(TEST_BUILD_DIR, "icon.jpg");
    const buildSize = fs.statSync(buildImgPath).size;

    assert.strictEqual(buildSize, originalSize, "Small images should be copied without modification");
  });
});

describe("Deploy pipeline integration", () => {
  test("Given deploy.sh sources libraries, when listing sources, then optimize-images.sh is included", () => {
    const content = fs.readFileSync(DEPLOY_SCRIPT, "utf-8");

    assert.ok(
      content.includes('optimize-images.sh'),
      "deploy.sh must source optimize-images.sh"
    );
  });

  test("Given build_static function, when building, then prepare_build_images is called before npm run build", () => {
    const content = fs.readFileSync(BUILD_SCRIPT, "utf-8");

    assert.ok(
      content.includes("prepare_build_images"),
      "build.sh must call prepare_build_images"
    );

    // Verify prepare and swap happen BEFORE npm run build
    const preparePos = content.indexOf("prepare_build_images");
    const swapPos = content.indexOf("swap_images_for_build");
    const npmBuildPos = content.indexOf("npm run build");

    assert.ok(
      preparePos < npmBuildPos,
      "prepare_build_images must be called before npm run build"
    );
    assert.ok(
      swapPos < npmBuildPos,
      "swap_images_for_build must be called before npm run build"
    );
  });

  test("Given build_static function, when building, then cleanup_build restores images after build", () => {
    const content = fs.readFileSync(BUILD_SCRIPT, "utf-8");

    // cleanup_build must call restore_images_after_build
    assert.ok(
      content.includes("restore_images_after_build"),
      "build.sh must call restore_images_after_build (via cleanup_build)"
    );

    // build_static must call cleanup_build after npm run build
    const buildStaticBody = content.slice(content.indexOf("build_static()"));
    const npmBuildPos = buildStaticBody.indexOf("npm run build");
    const cleanupPos = buildStaticBody.lastIndexOf("cleanup_build");

    assert.ok(
      cleanupPos > npmBuildPos,
      "cleanup_build must be called after npm run build in build_static"
    );
  });

  test("Given build_static function, when checked, then cleanup_build is set as trap handler", () => {
    const content = fs.readFileSync(BUILD_SCRIPT, "utf-8");

    assert.ok(
      content.includes("trap cleanup_build EXIT"),
      "build_static must set cleanup_build as EXIT trap for safety"
    );
  });

  test("Given .gitignore, when checked, then build image directories are ignored", () => {
    const gitignore = fs.readFileSync(
      path.join(PROJECT_ROOT, ".gitignore"),
      "utf-8"
    );

    assert.ok(
      gitignore.includes(".images-build"),
      ".gitignore must include .images-build"
    );
    assert.ok(
      gitignore.includes(".images-original"),
      ".gitignore must include .images-original"
    );
  });
});

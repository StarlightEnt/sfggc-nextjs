const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('fs');
const { join } = require('path');

const readFile = (relativePath) =>
  readFileSync(join(__dirname, '..', '..', '..', relativePath), 'utf8');

describe('Nginx Configuration (Unified Server Mode)', () => {

  test('Given vhost.txt, when checking location /, then it proxies to portal_backend', () => {
    const content = readFile('backend/config/vhost.txt');

    // location / should proxy to portal_backend (not use try_files)
    const locationSlash = content.match(/location\s+\/\s*\{[^}]+\}/s);
    assert.ok(locationSlash, 'location / block should exist');
    assert.ok(
      locationSlash[0].includes('proxy_pass http://portal_backend'),
      'location / should proxy_pass to portal_backend'
    );
  });

  test('Given vhost.txt, when checking /_next/static, then it has aggressive caching', () => {
    const content = readFile('backend/config/vhost.txt');

    // /_next/static should have cache headers
    const nextStatic = content.match(/location\s+\^~\s+\/_next\/static\s*\{[^}]+\}/s);
    assert.ok(nextStatic, '/_next/static block should exist');
    assert.ok(
      nextStatic[0].includes('expires 1y'),
      '/_next/static should have 1 year expiry'
    );
    assert.ok(
      nextStatic[0].includes('immutable'),
      '/_next/static should have immutable cache-control'
    );
  });

  test('Given vhost.txt, when checking locations, then there are no try_files directives', () => {
    const content = readFile('backend/config/vhost.txt');

    assert.ok(
      !content.includes('try_files'),
      'vhost.txt should not contain try_files (Next.js handles routing)'
    );
  });

  test('Given vhost.txt, when checking locations, then there are no regex location blocks', () => {
    const content = readFile('backend/config/vhost.txt');

    // Regex locations start with ~* or ~ (not in comments)
    // Allow ~ /.well-known for Let's Encrypt, but no others (especially ~* for static assets)
    const lines = content.split('\n').filter(l => !l.trim().startsWith('#'));
    const regexLocations = lines.filter(l =>
      /location\s+~/.test(l) && !l.includes('.well-known')
    );
    assert.equal(
      regexLocations.length,
      0,
      `Should have no regex locations (except .well-known), found: ${regexLocations.join(', ')}`
    );
  });

  test('Given vhost.txt, when checking upstream, then portal_backend uses keepalive', () => {
    const content = readFile('backend/config/vhost.txt');

    assert.ok(
      content.includes('upstream portal_backend'),
      'upstream portal_backend should be defined'
    );
    assert.ok(
      content.includes('keepalive'),
      'upstream should use keepalive for persistent connections'
    );
  });

});

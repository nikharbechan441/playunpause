import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';
import { createApp } from '../server/index.js';
import {
  CANONICAL_ORIGIN,
  EMBED_ROUTES,
  INDEXNOW_KEY,
  getSitemapRoutes,
  parseSafeStatefulQuery,
} from '../src/data/seoRoutes.js';
import { buildIndexNowPayload } from '../tools/indexnow_ping.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

function createRealAssetsMock() {
  const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(indexHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      const rel = url.pathname.replace(/^\/+/, '');
      const candidate = path.resolve(DIST_DIR, rel);
      if (candidate.startsWith(DIST_DIR) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const buf = fs.readFileSync(candidate);
        const ext = path.extname(candidate).toLowerCase();
        const ct =
          ext === '.png'
            ? 'image/png'
            : ext === '.xml'
              ? 'application/xml; charset=utf-8'
              : ext === '.txt'
                ? 'text/plain; charset=utf-8'
                : 'application/octet-stream';
        return new Response(buf, { status: 200, headers: { 'Content-Type': ct } });
      }
      return new Response('Not found', { status: 404 });
    },
  };
}

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = buf.subarray(0, 8);
  assert.deepEqual([...sig], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `Invalid PNG header: ${filePath}`);
  const chunkType = buf.toString('ascii', 12, 16);
  assert.equal(chunkType, 'IHDR');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

test('All 132 canonical routes pass Worker & Express SSR, metadata bounds, JSON-LD, and zero-inline-style CSP', async () => {
  assert.ok(fs.existsSync(INDEX_HTML_PATH), 'dist/index.html must exist before running seoVisibility tests');

  const routes = getSitemapRoutes();
  assert.equal(routes.length, 132);

  const workerEnv = {
    ASSETS: createRealAssetsMock(),
    NODE_ENV: 'production',
  };

  const titles = new Set();
  const descriptions = new Set();

  for (const r of routes) {
    assert.ok(r.title.length >= 25 && r.title.length <= 60, `Title length out of bounds (${r.title.length}): ${r.path}`);
    assert.ok(
      r.description.length >= 130 && r.description.length <= 160,
      `Description length out of bounds (${r.description.length}): ${r.path}`
    );
    assert.equal(titles.has(r.title), false, `Duplicate title: ${r.title}`);
    assert.equal(descriptions.has(r.description), false, `Duplicate description: ${r.description}`);
    titles.add(r.title);
    descriptions.add(r.description);

    const res = await worker.fetch(new Request(`${CANONICAL_ORIGIN}${r.path}`), workerEnv);
    assert.equal(res.status, 200, `Worker failed route ${r.path}`);
    const html = await res.text();

    assert.ok(
      html.includes(`<link rel="canonical" href="${CANONICAL_ORIGIN}${r.path}"`),
      `Missing canonical on ${r.path}`
    );
    assert.equal(/\sstyle="/i.test(html), false, `Unexpected style attribute in SSR HTML for ${r.path}`);

    const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.ok(ldMatches.length >= 2, `Expected base + page JSON-LD on ${r.path}`);
    const pageLd = JSON.parse(ldMatches[ldMatches.length - 1][1]);
    assert.ok(Array.isArray(pageLd['@graph']), `Expected @graph JSON-LD on ${r.path}`);
    if (r.path !== '/') {
      assert.ok(
        pageLd['@graph'].some((item) => item['@type'] === 'BreadcrumbList'),
        `Missing BreadcrumbList JSON-LD on ${r.path}`
      );
    }
    if (!r.legal) {
      assert.ok(
        pageLd['@graph'].some((item) => item['@type'] === 'FAQPage'),
        `Missing FAQPage JSON-LD on ${r.path}`
      );
    }
  }

  // Spot-check Express server SSR parity across key representative routes
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unpause-seo-test-'));
  const { app, db } = createApp({ dbPath: path.join(tmpDir, 'test.sqlite') });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    for (const checkPath of [
      '/',
      '/gta-6/storage/xbox-series-s-512gb',
      '/cod-warzone/ttk/raal-mg-open-bolt',
      '/minecraft/nether-portal-calculator',
      '/ea-fc-27/tax/100k-coins',
      '/legal/terms',
    ]) {
      const resp = await fetch(`${baseUrl}${checkPath}`);
      assert.equal(resp.status, 200, `Express status mismatch on ${checkPath}`);
      const html = await resp.text();
      assert.ok(html.includes(`href="${CANONICAL_ORIGIN}${checkPath}"`), `Express canonical mismatch on ${checkPath}`);
      assert.equal(/\sstyle="/i.test(html), false, `Express SSR leaked style attribute on ${checkPath}`);
    }

    // Redirects stay on local origin in local Express test without redirecting away from 127.0.0.1
    for (const [legacy, expectedSuffix] of [
      ['/?game=cod-warzone', '/cod-warzone'],
      ['/?tab=safes', '/gta-6/safe-codes'],
      ['/?legal=privacy', '/legal/privacy'],
      ['/minecraft/', '/minecraft'],
      ['/index.html', '/'],
      ['/embed', '/embed/gta-6/storage'],
    ]) {
      const r = await fetch(`${baseUrl}${legacy}`, { redirect: 'manual' });
      assert.equal(r.status, 301, `Expected 301 for ${legacy}`);
      assert.equal(r.headers.get('location'), expectedSuffix);
    }

    // 404 noindex + cache-control guard
    const notFoundResp = await fetch(`${baseUrl}/not-a-real-calculator`);
    assert.equal(notFoundResp.status, 404);
    assert.equal(notFoundResp.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(notFoundResp.headers.get('cache-control'), 'no-store');
    const notFoundHtml = await notFoundResp.text();
    assert.ok(notFoundHtml.includes('noindex, nofollow'));

    // Scoped /embed/* framing vs standard route isolation & uppercase/404 handling
    const embedResp = await fetch(`${baseUrl}/embed/minecraft`);
    assert.equal(embedResp.status, 200);
    assert.equal(embedResp.headers.get('x-frame-options'), null);
    assert.equal(embedResp.headers.get('cross-origin-opener-policy'), 'unsafe-none');
    assert.equal(embedResp.headers.get('x-robots-tag'), 'noindex, follow');
    assert.ok(embedResp.headers.get('content-security-policy').includes('frame-ancestors https:'));
    const embedHtml = await embedResp.text();
    assert.ok(embedHtml.includes(`href="${CANONICAL_ORIGIN}/minecraft"`));

    const embedUpperResp = await fetch(`${baseUrl}/EMBED/minecraft`);
    assert.equal(embedUpperResp.status, 200);
    assert.equal(embedUpperResp.headers.get('x-frame-options'), null);
    assert.ok(embedUpperResp.headers.get('content-security-policy').includes('frame-ancestors https:'));

    const embedNotFoundResp = await fetch(`${baseUrl}/embed/nonexistent`);
    assert.equal(embedNotFoundResp.status, 404);
    assert.equal(embedNotFoundResp.headers.get('x-frame-options'), 'DENY');
    assert.equal(embedNotFoundResp.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.ok(embedNotFoundResp.headers.get('content-security-policy').includes("frame-ancestors 'none'"));

    const homeResp = await fetch(`${baseUrl}/`);
    assert.equal(homeResp.headers.get('x-frame-options'), 'DENY');
    assert.equal(homeResp.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.ok(homeResp.headers.get('content-security-policy').includes("frame-ancestors 'none'"));

    // OG image public CORP header
    const ogResp = await fetch(`${baseUrl}/og/minecraft.png`);
    assert.equal(ogResp.status, 200);
    assert.equal(ogResp.headers.get('cross-origin-resource-policy'), 'cross-origin');
  } finally {
    server.close();
    db.close();
  }
});

test('Worker enforces www redirect, zero redirect chains, scoped /embed headers, and 404 noindex', async () => {
  const env = { ASSETS: createRealAssetsMock(), NODE_ENV: 'production' };

  const wwwRes = await worker.fetch(new Request('https://www.playunpause.com/cod-warzone?hp=300'), env);
  assert.equal(wwwRes.status, 301);
  assert.equal(wwwRes.headers.get('location'), 'https://playunpause.com/cod-warzone?hp=300');

  for (const [legacy, dest] of [
    ['https://playunpause.com/?game=cod-warzone', 'https://playunpause.com/cod-warzone'],
    ['https://playunpause.com/?tab=safes', 'https://playunpause.com/gta-6/safe-codes'],
    ['https://playunpause.com/?legal=privacy', 'https://playunpause.com/legal/privacy'],
    ['https://playunpause.com/minecraft/', 'https://playunpause.com/minecraft'],
    ['https://playunpause.com/index.html', 'https://playunpause.com/'],
    ['https://playunpause.com/embed', 'https://playunpause.com/embed/gta-6/storage'],
  ]) {
    const first = await worker.fetch(new Request(legacy), env);
    assert.equal(first.status, 301, `Expected 301 for ${legacy}`);
    assert.equal(first.headers.get('location'), dest);
    const second = await worker.fetch(new Request(dest), env);
    assert.equal(second.status, 200, `Expected single-hop 200 for ${dest}`);
  }

  // Embed security headers
  assert.equal(EMBED_ROUTES.length, 13);
  const embedRes = await worker.fetch(new Request('https://playunpause.com/embed/minecraft'), env);
  assert.equal(embedRes.status, 200);
  assert.equal(embedRes.headers.get('x-frame-options'), null);
  assert.equal(embedRes.headers.get('cross-origin-opener-policy'), 'unsafe-none');
  assert.equal(embedRes.headers.get('x-robots-tag'), 'noindex, follow');
  assert.ok(embedRes.headers.get('content-security-policy').includes('frame-ancestors https:'));

  // Worker /api framing must stay strict
  const apiRes = await worker.fetch(new Request('https://playunpause.com/api/config'), env);
  assert.equal(apiRes.headers.get('x-frame-options'), 'DENY');
  assert.ok(apiRes.headers.get('content-security-policy').includes("frame-ancestors 'none'"));

  // Unknown path returns 404
  const notFoundRes = await worker.fetch(new Request('https://playunpause.com/nonexistent-calc'), env);
  assert.equal(notFoundRes.status, 404);
  assert.equal(notFoundRes.headers.get('x-robots-tag'), 'noindex, nofollow');

  // OG card asset CORP
  const ogAsset = await worker.fetch(new Request('https://playunpause.com/og/minecraft.png'), env);
  assert.equal(ogAsset.status, 200);
  assert.equal(ogAsset.headers.get('cross-origin-resource-policy'), 'cross-origin');
});

test('Generated PNG OG assets, sitemap.xml, robots.txt, llms*.txt, IndexNow, and query fuzzer match specs', () => {
  const routes = getSitemapRoutes();
  const uniqueOgPaths = new Set(routes.map((r) => r.ogImage || '/og-cover.png'));

  for (const relWebPath of uniqueOgPaths) {
    const filePath = path.join(PUBLIC_DIR, relWebPath.replace(/^\//, ''));
    assert.ok(fs.existsSync(filePath), `Missing generated OG PNG: ${filePath}`);
    const dims = readPngDimensions(filePath);
    assert.equal(dims.width, 1200, `Unexpected width for ${relWebPath}`);
    assert.equal(dims.height, 630, `Unexpected height for ${relWebPath}`);

    const distPath = path.join(DIST_DIR, relWebPath.replace(/^\//, ''));
    assert.ok(fs.existsSync(distPath), `Missing built OG PNG in dist/: ${distPath}`);
  }

  const sitemap = fs.readFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, 132);
  assert.equal(locs.some((loc) => loc.includes('?')), false);

  const robots = fs.readFileSync(path.join(PUBLIC_DIR, 'robots.txt'), 'utf8');
  for (const bot of ['OAI-SearchBot', 'GPTBot', 'PerplexityBot', 'ClaudeBot']) {
    assert.ok(robots.includes(bot), `Missing AI crawler rule for ${bot}`);
  }
  assert.ok(robots.includes('Disallow: /api/'));
  assert.equal(robots.includes('Disallow: /embed/'), false);

  const llmsTxt = fs.readFileSync(path.join(PUBLIC_DIR, 'llms.txt'), 'utf8');
  assert.equal(llmsTxt.includes('?game='), false);
  assert.ok(llmsTxt.includes('NOT AN OFFICIAL MINECRAFT PRODUCT'));

  const llmsFull = fs.readFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), 'utf8');
  assert.equal(llmsFull.includes('?game='), false);
  assert.equal(llmsFull.includes('Category: undefined'), false);
  assert.ok(llmsFull.includes('212 GB'));
  assert.ok(llmsFull.includes('225 GB'));
  assert.equal(llmsFull.includes('175 GB'), false);
  assert.equal(llmsFull.includes('189 GB'), false);

  const keyFile = fs.readFileSync(path.join(PUBLIC_DIR, `${INDEXNOW_KEY}.txt`), 'utf8').trim();
  assert.equal(keyFile, INDEXNOW_KEY);

  const indexNowPayload = buildIndexNowPayload();
  assert.equal(indexNowPayload.host, 'playunpause.com');
  assert.equal(indexNowPayload.key, INDEXNOW_KEY);
  assert.equal(indexNowPayload.urlList.length, 128);

  // Query fuzzer clamping & XSS strip verification
  const fuzzed = parseSafeStatefulQuery(
    new URLSearchParams(
      'x=NaN&y=Infinity&free=-999999&mbps=99999999&cuts=999,999&q=<script>alert(1)</script>&c=evil-console'
    ),
    { consoleId: 'xss-512', freeGb: 140, cuts: [40, 30, 15, 15] }
  );
  assert.equal(fuzzed.consoleId, 'xss-512');
  assert.equal(fuzzed.freeGb, 0);
  assert.equal(fuzzed.mbps, 2500);
  assert.equal(Number.isFinite(fuzzed.netherX), true);
  assert.equal(Number.isFinite(fuzzed.netherY), true);
  assert.deepEqual(fuzzed.cuts, [40, 30, 15, 15]);
  assert.equal(fuzzed.query.includes('<'), false);
  assert.equal(fuzzed.query.includes('>'), false);
});

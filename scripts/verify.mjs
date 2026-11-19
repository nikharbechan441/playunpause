import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function runNpm(args) {
  const res = spawnSync('npm', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });
  if (res.status !== 0) {
    throw new Error(`Command "npm ${args.join(' ')}" exited with status ${res.status}`);
  }
}

function walkFiles(relDir, exts = null) {
  const base = path.join(ROOT, relDir);
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const rel = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(rel, exts));
    } else if (!exts || exts.some((e) => entry.name.endsWith(e))) {
      out.push(rel);
    }
  }
  return out;
}

function readRel(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function scanBannedPatterns(files, checks) {
  const hits = [];
  for (const rel of files) {
    const content = readRel(rel);
    for (const { label, regex } of checks) {
      regex.lastIndex = 0;
      const m = content.match(regex);
      if (m) {
        hits.push(`${rel}: matched banned ${label} (${m[0]})`);
      }
    }
  }
  assert.equal(hits.length, 0, `Banned patterns detected:\n${hits.join('\n')}`);
}

function createDistAssetsMock() {
  const distDir = path.join(ROOT, 'dist');
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
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
      const abs = path.resolve(distDir, rel);
      if (abs.startsWith(distDir) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        const buf = fs.readFileSync(abs);
        const ext = path.extname(abs).toLowerCase();
        const ct =
          ext === '.png'
            ? 'image/png'
            : ext === '.xml'
              ? 'application/xml; charset=utf-8'
              : ext === '.txt'
                ? 'text/plain; charset=utf-8'
                : ext === '.js' || ext === '.mjs'
                  ? 'application/javascript; charset=utf-8'
                  : ext === '.css'
                    ? 'text/css; charset=utf-8'
                    : 'application/octet-stream';
        return new Response(buf, { status: 200, headers: { 'Content-Type': ct } });
      }
      return new Response('Not found', { status: 404 });
    },
  };
}

async function main() {
  console.log('[verify] 1/5 Running production build (prebuild SEO + vite build)...');
  runNpm(['run', 'build']);

  console.log('[verify] 2/5 Running node --test suite...');
  runNpm(['test']);

  console.log('[verify] 3/5 Auditing source, public SEO files, and built dist bundles...');
  const srcFiles = walkFiles('src', ['.js', '.jsx', '.css']);
  const publicTxtFiles = ['public/robots.txt', 'public/llms.txt', 'public/llms-full.txt', 'public/sitemap.xml'].filter((p) =>
    fs.existsSync(path.join(ROOT, p))
  );
  const workerServerToolsFiles = [
    ...walkFiles('worker', ['.js', '.mjs']),
    ...walkFiles('server', ['.js', '.mjs']),
    ...walkFiles('tools', ['.js', '.mjs', '.py']),
  ];
  const distBundles = ['dist/index.html', ...walkFiles('dist/assets', ['.js', '.css'])];

  const globalStaleChecks = [
    { label: '"Nov 19 (1d)" countdown', regex: /Nov 19 \(1d\)/i },
    { label: '"225 GB" / "212-225 GB"', regex: /225\s*GB|212[–-]225\s*GB/i },
    { label: '"+35 GB" / "35 GB" patch copy', regex: /\+35\s*GB|35\s*GB Day-1|35\s*GB patch/i },
  ];
  scanBannedPatterns(
    [...srcFiles, ...publicTxtFiles, ...workerServerToolsFiles, ...distBundles],
    globalStaleChecks
  );

  scanBannedPatterns([...srcFiles, ...publicTxtFiles, ...distBundles], [
    { label: 'zombie "$6.99" pricing', regex: /\$6\.99/ },
  ]);

  scanBannedPatterns([...srcFiles, ...distBundles], [
    { label: '"Shop Gear" masked affiliate CTA', regex: /Shop Gear/ },
    { label: '"0 / 5" legacy free pin limit', regex: /0\s*\/\s*5\b|0\/5 Free/ },
    { label: '"0 / 2 Free" legacy limit', regex: /0\s*\/\s*2\s*Free/i },
  ]);

  scanBannedPatterns([...srcFiles, ...walkFiles('worker', ['.js']), ...walkFiles('server', ['.js']), ...distBundles], [
    { label: '/s?k= Amazon search URL leak', regex: /amazon\.com\/s\?k=/i },
  ]);

  scanBannedPatterns(srcFiles.filter((f) => f.endsWith('.js') || f.endsWith('.jsx')), [
    { label: 'innerHTML / dangerouslySetInnerHTML', regex: /\.innerHTML\b|dangerouslySetInnerHTML/ },
  ]);

  // Security ship check: no secret values bundled into dist JS
  const distJs = walkFiles('dist/assets', ['.js']);
  const envPath = path.join(ROOT, '.env');
  const envSecrets = [];
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(?:WHOP_WEBHOOK_SECRET|WHOP_API_KEY|ADMIN_API_KEY|EMAIL_HASH_PEPPER|INDEXNOW_KEY)=(.+)$/);
      if (m && m[1] && !line.startsWith('INDEXNOW_KEY=')) {
        const val = m[1].trim().replace(/^["']|["']$/g, '');
        if (val.length >= 10) envSecrets.push(val);
      }
    }
  }
  for (const rel of distJs) {
    const content = readRel(rel);
    for (const secretVal of envSecrets) {
      assert.equal(content.includes(secretVal), false, `Secret leaked into client bundle ${rel}`);
    }
  }

  // App.jsx structural requirements
  const appSrc = readRel('src/App.jsx');
  assert.match(appSrc, /GTA VI · OUT NOW/, 'Header must display "GTA VI · OUT NOW"');
  assert.match(appSrc, /Browse Other 9 Games/, 'Footer must collapse cross-game SEO directory under "Browse Other 9 Games"');
  assert.match(appSrc, /className="nz-compact-text"\s+aria-hidden="true"|aria-hidden="true"[^>]*nz-compact-text/);
  assert.match(appSrc, /className="pass-short-label"\s+aria-hidden="true"|aria-hidden="true"[^>]*pass-short-label/);
  assert.doesNotMatch(appSrc, /<span>\s*Sponsor Slot\s*<\/span>/, 'Footer Sponsor Slot button must be hidden until traffic scales');

  // Direct /dp/ ASIN links + verbatim Associate disclosure
  for (const affiliateFile of [
    'src/components/StorageUnlockDeck.jsx',
    'src/components/games/GameStudioDock.jsx',
    'src/components/gta6/Gta6SettingsTunerDeck.jsx',
  ]) {
    const src = readRel(affiliateFile);
    assert.ok(
      src.includes('B0C47ZX1WB?tag=playunpause-20') || src.includes('ps5SsdUrl'),
      `${affiliateFile} missing PS5 SN850P /dp/ link`
    );
    assert.ok(
      src.includes('B0C44XVWCH?tag=playunpause-20') || src.includes('xboxCardUrl'),
      `${affiliateFile} missing Xbox C50 /dp/ link`
    );
    assert.match(src, /As an Amazon Associate I earn from qualifying purchases\./, `${affiliateFile} missing FTC disclosure`);
  }

  // Direct test of Storage + Roblox Math
  const { calcRobloxDevEx } = await import('../src/utils/gameMath.js');
  const { resolveSeoRequest, getSitemapRoutes } = await import('../src/data/seoRoutes.js');
  const net100k = calcRobloxDevEx({ grossRobux: 100000, isNetEarned: true });
  assert.equal(net100k.usdPayout, 380, 'calcRobloxDevEx 100k Net Earned must equal $380.00');

  const devex100kRoute = resolveSeoRequest('/roblox/devex/100000-robux-to-usd');
  assert.equal(devex100kRoute.status, 200);
  assert.equal(devex100kRoute.route?.preset?.rbxMode, 'net');

  for (const r of getSitemapRoutes().filter((x) => x.path.startsWith('/roblox/devex/'))) {
    assert.equal(r.preset?.rbxMode, 'net', `Expected rbxMode: 'net' on ${r.path}`);
  }

  console.log('[verify] 4/5 Auditing Worker SSR, cache headers & 301 redirects...');
  const workerMod = await import('../worker/index.js');
  const worker = workerMod.default;
  const workerEnv = { ASSETS: createDistAssetsMock(), NODE_ENV: 'production' };

  const required200Routes = [
    '/',
    '/gta-6/storage',
    '/gta-6/cheats',
    '/gta-6/money',
    '/gta-6/robberies',
    '/gta-6/settings',
    '/gta-6/platinum',
    '/gta-6/ultimate',
    '/cod-warzone',
    '/roblox',
    '/roblox/devex/100000-robux-to-usd',
    '/gta-online',
    '/legal/refunds',
    '/legal/terms',
  ];

  const bannedHtmlRegexes = [
    /Nov 19 \(1d\)/i,
    /225\s*GB/i,
    /\+35\s*GB/i,
    /\$6\.99/,
    /0\s*\/\s*2\s*Free/i,
    /0\s*\/\s*5\s*Free/i,
    /Shop Gear/,
  ];

  for (const routePath of required200Routes) {
    const res = await worker.fetch(new Request(`https://playunpause.com${routePath}`), workerEnv);
    assert.equal(res.status, 200, `Worker expected 200 OK for ${routePath}, got ${res.status}`);
    const html = await res.text();
    assert.equal(/\sstyle="/i.test(html), false, `Worker SSR leaked inline style= on ${routePath}`);
    for (const badRe of bannedHtmlRegexes) {
      assert.doesNotMatch(html, badRe, `Worker SSR leaked ${badRe} on ${routePath}`);
    }
    if (routePath === '/roblox/devex/100000-robux-to-usd') {
      assert.ok(html.includes('$380.00'), '100k DevEx SSR must contain $380.00');
      assert.equal(html.includes('$266.00'), false, '100k DevEx SSR must not contain $266.00');
    }
    if (routePath === '/legal/refunds') {
      const cc = res.headers.get('cache-control') || '';
      assert.ok(/no-store|no-cache/i.test(cc), `/legal/refunds Cache-Control missing no-store/no-cache: ${cc}`);
      assert.equal(res.headers.get('cdn-cache-control'), 'no-store', '/legal/refunds must emit CDN-Cache-Control: no-store');
    }
  }

  const requiredRedirects = [
    ['/gta-6/safe-codes', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/safe-codes/vice-beach', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/safe-codes/port-gellhorn', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/safe-codes/leonida-keys', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/safe-codes/grassrivers', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/safe-codes/ambrosia', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/safe-codes/mount-kalaga', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/heist-split', 'https://playunpause.com/gta-online'],
    ['/gta-6/heist-split/4-player-squad', 'https://playunpause.com/gta-online'],
    ['/gta-6/stock-market-planner', 'https://playunpause.com/gta-6/money'],
    ['/gta-6/night-run', 'https://playunpause.com/gta-6/platinum'],
    ['/gta-6/night-run/45-minute-route', 'https://playunpause.com/gta-6/platinum'],
    ['/gta-6/missables-shield', 'https://playunpause.com/gta-6/platinum'],
  ];

  for (const [srcPath, destUrl] of requiredRedirects) {
    const res = await worker.fetch(new Request(`https://playunpause.com${srcPath}`), workerEnv);
    assert.equal(res.status, 301, `Worker expected 301 for ${srcPath}`);
    assert.equal(res.headers.get('location'), destUrl, `Redirect mismatch for ${srcPath}`);
  }

  console.log('[verify] 5/5 Auditing Express server parity across routes & 301s...');
  const { createApp } = await import('../server/index.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unpause-verify-'));
  const { app, db } = createApp({ dbPath: path.join(tmpDir, 'verify.sqlite') });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    for (const routePath of required200Routes) {
      const resp = await fetch(`${baseUrl}${routePath}`, { redirect: 'manual' });
      assert.equal(resp.status, 200, `Express expected 200 OK for ${routePath}, got ${resp.status}`);
      const html = await resp.text();
      assert.equal(/\sstyle="/i.test(html), false, `Express SSR leaked inline style= on ${routePath}`);
      for (const badRe of bannedHtmlRegexes) {
        assert.doesNotMatch(html, badRe, `Express SSR leaked ${badRe} on ${routePath}`);
      }
      if (routePath === '/roblox/devex/100000-robux-to-usd') {
        assert.ok(html.includes('$380.00'));
        assert.equal(html.includes('$266.00'), false);
      }
    }

    for (const [srcPath, destUrl] of requiredRedirects) {
      const resp = await fetch(`${baseUrl}${srcPath}`, { redirect: 'manual' });
      assert.equal(resp.status, 301, `Express expected 301 for ${srcPath}`);
      const loc = resp.headers.get('location') || '';
      const expectedSuffix = new URL(destUrl).pathname;
      assert.ok(loc.endsWith(expectedSuffix), `Express redirect ${loc} should target ${expectedSuffix}`);
    }
  } finally {
    server.close();
    db.close();
  }

  console.log('[verify] ALL LAUNCH-DAY GATES PASSED CLEANLY (EXIT 0)');
}

main().catch((err) => {
  console.error('[verify] FAILED:', err);
  process.exit(1);
});

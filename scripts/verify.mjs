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
          ext === '.webmanifest'
            ? 'application/manifest+json; charset=utf-8'
            : ext === '.png'
              ? 'image/png'
              : ext === '.jpg' || ext === '.jpeg'
                ? 'image/jpeg'
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
    { label: 'banned "Typhoon" boat typo', regex: /\bTyphoon\b/i },
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
    { label: 'Loading studio flash string', regex: /Loading\s+(?:\{[^}]+\}|GTA Online|EA FC 27|Cod|Fortnite|Minecraft|Roblox|CS2|Valorant|Apex)?\s*studio/i },
  ]);

  scanBannedPatterns([...srcFiles, ...walkFiles('worker', ['.js']), ...walkFiles('server', ['.js']), ...distBundles], [
    { label: '/s?k= Amazon search URL leak', regex: /amazon\.com\/s\?k=/i },
  ]);

  scanBannedPatterns(srcFiles.filter((f) => f.endsWith('.js') || f.endsWith('.jsx')), [
    { label: 'innerHTML / dangerouslySetInnerHTML', regex: /\.innerHTML\b|dangerouslySetInnerHTML/ },
    { label: 'native alert()/confirm()/prompt()', regex: /\b(?:alert|confirm|prompt)\s*\(/ },
  ]);

  scanBannedPatterns(srcFiles.filter((f) => f.endsWith('.css')), [
    { label: 'banned transition: all', regex: /transition\s*:\s*all\b/i },
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

  // Direct test of Storage + Roblox Math + V2.2 Leonida Engine (#s=, chips, 23 radio stations, Shitzu Squalo)
  const { calcRobloxDevEx } = await import('../src/utils/gameMath.js');
  const { LEONIDA_INSTALLED_GAMES, LEONIDA_RADIO_STATIONS } = await import('../src/data/games/leonidaV2Data.js');
  const {
    computeLeonidaStorage,
    createDefaultLeonidaState,
    decodeLeonidaShareHash,
    encodeLeonidaShareHash,
  } = await import('../src/utils/leonidaState.js');
  const { encodePlatinumShareHash, decodePlatinumShareHash } = await import('../src/utils/platinumHashShare.js');
  const { resolveSeoRequest, getSitemapRoutes } = await import('../src/data/seoRoutes.js');

  assert.equal(LEONIDA_RADIO_STATIONS.length, 23, 'Expected all 23 Leonida radio stations (22 base + Secret #23)');
  const secretVault = LEONIDA_RADIO_STATIONS.find((s) => s.num === 23);
  assert.ok(secretVault && secretVault.name === 'The Vault Radio' && secretVault.secret === true);

  const joinedJsBundle = distJs.map((rel) => readRel(rel)).join('\n');
  assert.ok(joinedJsBundle.includes('Shitzu Squalo'), 'Built bundle must include Shitzu Squalo');
  assert.ok(joinedJsBundle.includes('The Vault Radio'), 'Built bundle must include Secret #23 The Vault Radio');
  for (const st of LEONIDA_RADIO_STATIONS) {
    assert.ok(joinedJsBundle.includes(st.name), `Built bundle missing radio station: ${st.name}`);
  }

  // Toggling ANY of the 5 game chips recalculates verdict + segmented bar
  const emptyStorage = computeLeonidaStorage({ consoleId: 'xss', includePatch: true, installedGames: [], otherUsedGb: 77, mbps: 100 });
  for (const chip of LEONIDA_INSTALLED_GAMES) {
    const toggled = computeLeonidaStorage({ consoleId: 'xss', includePatch: true, installedGames: [chip.id], otherUsedGb: 77, mbps: 100 });
    assert.notEqual(toggled.diff, emptyStorage.diff, `Toggling chip ${chip.id} must recalculate verdict diff`);
    assert.notEqual(toggled.gamesPct, emptyStorage.gamesPct, `Toggling chip ${chip.id} must recalculate bar segment width`);
  }

  // V2 #s=... hash round-trip + malformed guard
  const v2Sample = createDefaultLeonidaState();
  v2Sample.chapter = 3;
  v2Sample.consoleId = 'ps5_slim';
  v2Sample.installedGames = ['cod', 'fn'];
  v2Sample.counts = { waink: 72, wildlife: 31, flamingos: 18, stunts: 99, cards: 6 };
  v2Sample.balconyDone = true;
  v2Sample.saves[1].saved = true;
  const v2Hash = encodeLeonidaShareHash(v2Sample);
  assert.match(v2Hash, /^#s=[A-Za-z0-9_-]+$/);
  const v2Decoded = decodeLeonidaShareHash(v2Hash);
  assert.ok(v2Decoded && v2Decoded.chapter === 3 && v2Decoded.consoleId === 'ps5_slim' && v2Decoded.balconyDone === true);
  assert.deepEqual(v2Decoded.counts, v2Sample.counts);
  assert.equal(v2Decoded.saves[1].saved, true);
  for (const badV2 of [
    '',
    '#s=not_valid',
    '#s=' + Buffer.from('{"v":2,"c":"invalid"}').toString('base64url'),
    '#s=' + Buffer.from('{"__proto__":{"polluted":1},"v":2,"c":1,"con":"xss","k":[1,2,3,4,5],"sv":"000000000000000"}').toString('base64url'),
  ]) {
    assert.equal(decodeLeonidaShareHash(badV2), null, `Malformed V2 hash must return null cleanly: ${badV2}`);
  }
  const net100k = calcRobloxDevEx({ grossRobux: 100000, isNetEarned: true });
  assert.equal(net100k.usdPayout, 380, 'calcRobloxDevEx 100k Net Earned must equal $380.00');
  assert.equal(net100k.withholdingPct, 0);
  assert.equal(net100k.paypalFeeUsd, 0);
  assert.equal(net100k.netPayoutUsd, 380);

  const net100kWithheld = calcRobloxDevEx({
    grossRobux: 100000,
    isNetEarned: true,
    withholdingPct: 24,
    includePaypalFee: true,
  });
  assert.equal(net100kWithheld.grossUsd, 380);
  assert.equal(net100kWithheld.withholdingUsd, 91.2);
  assert.equal(net100kWithheld.paypalFeeUsd, 8.6);
  assert.equal(net100kWithheld.netPayoutUsd, 280.2);

  // #s=... hash round-trip + malformed guard
  const sampleHash = encodePlatinumShareHash({
    waink: 120,
    wildlife: 45,
    flamingos: 30,
    stunts: 201,
    cards: 9,
  });
  assert.match(sampleHash, /^#s=[A-Za-z0-9_-]+$/);
  const decodedHash = decodePlatinumShareHash(sampleHash);
  assert.deepEqual(decodedHash, {
    v: 1,
    waink: 120,
    wildlife: 45,
    flamingos: 30,
    stunts: 201,
    cards: 9,
  });
  for (const badHash of [
    '',
    '#s=!!!not-base64!!!',
    '#s=e30',
    '#s=' + Buffer.from(JSON.stringify({ v: 1, waink: 999, wildlife: 0, flamingos: 0, stunts: 0, cards: 0 })).toString('base64url'),
    '#s=' + Buffer.from(JSON.stringify({ v: 1, waink: -1, wildlife: 0, flamingos: 0, stunts: 0, cards: 0 })).toString('base64url'),
    '#s=' + Buffer.from('{"__proto__":{"polluted":1},"v":1,"waink":1,"wildlife":1,"flamingos":1,"stunts":1,"cards":1}').toString('base64url'),
  ]) {
    assert.equal(decodePlatinumShareHash(badHash), null, `Malformed hash must return null: ${badHash}`);
  }

  const devex100kRoute = resolveSeoRequest('/roblox/devex/100000-robux-to-usd');
  assert.equal(devex100kRoute.status, 200);
  assert.equal(devex100kRoute.route?.preset?.rbxMode, 'net');

  for (const r of getSitemapRoutes().filter((x) => x.path.startsWith('/roblox/devex/'))) {
    assert.equal(r.preset?.rbxMode, 'net', `Expected rbxMode: 'net' on ${r.path}`);
  }

  const sitemapXml = readRel('public/sitemap.xml');
  assert.ok(sitemapXml.includes('https://playunpause.com/gta-6</loc>'), 'sitemap.xml missing /gta-6');
  assert.ok(sitemapXml.includes('https://playunpause.com/gta-6/fixes'), 'sitemap.xml missing /gta-6/fixes');
  assert.ok(sitemapXml.includes('https://playunpause.com/gta-6/radio'), 'sitemap.xml missing /gta-6/radio');

  const bannerPath = path.join(ROOT, 'public/images/leonida-banner.jpg');
  assert.ok(fs.existsSync(bannerPath), 'Missing public/images/leonida-banner.jpg');
  const bannerBytes = fs.readFileSync(bannerPath);
  assert.equal(bannerBytes[0], 0xff, 'leonida-banner.jpg must start with JPEG 0xFF');
  assert.equal(bannerBytes[1], 0xd8, 'leonida-banner.jpg must start with JPEG 0xD8');

  console.log('[verify] 4/5 Auditing Worker SSR, cache headers & 301 redirects...');
  const workerMod = await import('../worker/index.js');
  const worker = workerMod.default;
  const workerEnv = { ASSETS: createDistAssetsMock(), NODE_ENV: 'production' };

  const required200Routes = [
    '/',
    '/gta-6',
    '/gta-6/storage',
    '/gta-6/cheats',
    '/gta-6/money',
    '/gta-6/robberies',
    '/gta-6/settings',
    '/gta-6/platinum',
    '/gta-6/ultimate',
    '/gta-6/fixes',
    '/gta-6/radio',
    '/cod-warzone',
    '/ea-fc-27',
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
    /Loading .*studio/i,
  ];

  for (const routePath of required200Routes) {
    const res = await worker.fetch(new Request(`https://playunpause.com${routePath}`), workerEnv);
    assert.equal(res.status, 200, `Worker expected 200 OK for ${routePath}, got ${res.status}`);
    const html = await res.text();
    assert.equal(/\sstyle="/i.test(html), false, `Worker SSR leaked inline style= on ${routePath}`);
    assert.match(html, /<h1\b[^>]*>[\s\S]+?<\/h1>/i, `Worker SSR missing <h1> on ${routePath}`);
    assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/playunpause\.com/i, `Worker SSR missing canonical on ${routePath}`);
    assert.match(html, /<script\s+type="application\/ld\+json">/i, `Worker SSR missing JSON-LD on ${routePath}`);
    for (const badRe of bannedHtmlRegexes) {
      assert.doesNotMatch(html, badRe, `Worker SSR leaked ${badRe} on ${routePath}`);
    }
    if (routePath.startsWith('/gta-6/')) {
      assert.doesNotMatch(
        html,
        /4-player heist|Crew Payout Estimator|GTA 6 Online/i,
        `GTA VI route ${routePath} leaked multiplayer/4-player heist copy`
      );
    }
    if (routePath === '/gta-6/fixes') {
      assert.match(html, /FAQPage/i, '/gta-6/fixes SSR must include FAQPage JSON-LD');
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

  // Manifest JSON gate on Worker
  const manifestRes = await worker.fetch(new Request('https://playunpause.com/manifest.webmanifest'), workerEnv);
  assert.equal(manifestRes.status, 200, 'Worker /manifest.webmanifest must return 200');
  const manifestJson = JSON.parse(await manifestRes.text());
  assert.equal(manifestJson.name, 'PlayUnpause');
  assert.equal(manifestJson.display, 'standalone');
  assert.equal(manifestJson.theme_color, '#0D0E12');
  assert.ok(Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 2);

  // Banner JPEG gate on Worker
  const bannerRes = await worker.fetch(new Request('https://playunpause.com/images/leonida-banner.jpg'), workerEnv);
  assert.equal(bannerRes.status, 200, 'Worker /images/leonida-banner.jpg must return 200');
  assert.equal(bannerRes.headers.get('cross-origin-resource-policy'), 'cross-origin');

  // www -> apex 301 check on Worker
  const wwwWorkerRes = await worker.fetch(new Request('https://www.playunpause.com/gta-6/fixes?v=2'), workerEnv);
  assert.equal(wwwWorkerRes.status, 301);
  assert.equal(wwwWorkerRes.headers.get('location'), 'https://playunpause.com/gta-6/fixes?v=2');

  const requiredRedirects = [
    ['/gta-6/', 'https://playunpause.com/gta-6'],
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

    const expManifest = await fetch(`${baseUrl}/manifest.webmanifest`);
    assert.equal(expManifest.status, 200, 'Express /manifest.webmanifest must return 200');
    const expManifestJson = await expManifest.json();
    assert.equal(expManifestJson.name, 'PlayUnpause');
    assert.equal(expManifestJson.display, 'standalone');

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

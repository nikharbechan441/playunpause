import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import worker from '../worker/index.js';
import { gta6Pack } from '../src/data/games/gta6Pack.js';
import {
  GTA6_CHEAT_META,
  GTA6_COLLECTIBLE_TARGETS,
  GTA6_CONFIRMED_CHEATS,
  GTA6_CONSOLE_30FPS_SPECS,
  GTA6_LAUNCH_FIXES,
  GTA6_MONEY_METHODS,
  GTA6_PLATINUM_MISSABLES,
  GTA6_RADIO_STATIONS,
  GTA6_ROBBERY_TIERS,
  GTA6_SAVE_SLOT_TEMPLATES,
  GTA6_ULTIMATE_CLAIMS,
  SPOILER_CHAPTERS,
} from '../src/data/games/gta6LaunchTools.js';
import { TOP_GAMES } from '../src/data/games/allGames.js';
import { calcRobloxDevEx } from '../src/utils/gameMath.js';
import {
  MAX_FREE_PINS_PER_GAME,
  MAX_FREE_PROFILES,
  stripDangerousKeys,
} from '../src/utils/syncState.js';
import { generateQrMatrix } from '../src/utils/qrCode.js';
import {
  LEONIDA_INSTALLED_GAMES,
  LEONIDA_LAUNCH_FIXES,
  LEONIDA_RADIO_STATIONS,
  LEONIDA_VERIFIED_CHEATS,
} from '../src/data/games/leonidaV2Data.js';
import {
  computeFinishDate,
  computeLeonidaStorage,
  createDefaultLeonidaState,
  decodeLeonidaShareHash,
  encodeLeonidaShareHash,
  sanitizeLeonidaState,
} from '../src/utils/leonidaState.js';
import {
  LEGAL_META,
  resolveSeoRequest,
} from '../src/data/seoRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function collectFiles(dirRel, extensions = ['.js', '.jsx', '.css']) {
  const dirAbs = path.join(ROOT, dirRel);
  const results = [];
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const rel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(rel, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(rel);
    }
  }
  return results;
}

function createMockD1() {
  const sqlite = new DatabaseSync(':memory:');
  return {
    prepare(sql) {
      let boundParams = [];
      const stmtObj = {
        sql,
        get params() {
          return boundParams;
        },
        bind(...args) {
          for (const a of args) {
            if (a === undefined) {
              throw new Error('D1 does not allow undefined bind parameters');
            }
          }
          boundParams = args;
          return stmtObj;
        },
        async first() {
          const row = sqlite.prepare(sql).get(...boundParams);
          return row ?? null;
        },
        async run() {
          const info = sqlite.prepare(sql).run(...boundParams);
          return { success: true, meta: info };
        },
      };
      return stmtObj;
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const st of statements) {
          sqlite.prepare(st.sql).run(...st.params);
          results.push({ success: true });
        }
        sqlite.exec('COMMIT');
        return results;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

function createMockAssets() {
  const robotsTxt = fs.existsSync(path.join(ROOT, 'public/robots.txt'))
    ? readRepoFile('public/robots.txt')
    : 'User-agent: *\nAllow: /\n';
  const llmsTxt = fs.existsSync(path.join(ROOT, 'public/llms.txt'))
    ? readRepoFile('public/llms.txt')
    : '# PlayUnpause\n';
  const indexHtml = fs.existsSync(path.join(ROOT, 'dist/index.html'))
    ? readRepoFile('dist/index.html')
    : '<!doctype html><html><head><title>PlayUnpause</title></head><body><div id="root"></div></body></html>';

  return {
    async fetch(req) {
      const url = new URL(req instanceof Request ? req.url : String(req));
      if (url.pathname === '/robots.txt') {
        return new Response(robotsTxt, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      if (url.pathname === '/llms.txt') {
        return new Response(llmsTxt, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return new Response(indexHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    },
  };
}

function makeWorkerEnv(overrides = {}) {
  return {
    DB: createMockD1(),
    ASSETS: createMockAssets(),
    NODE_ENV: 'production',
    ALLOW_DEMO_UNLOCK: 'false',
    EMAIL_HASH_PEPPER: 'test-pepper-64',
    ...overrides,
  };
}

test('1. GTA VI ground-truth: 212 GB + Patch 01.002.002 / 1.0.2.2, pure D-Pad cheats, retired safes 301s', () => {
  assert.match(gta6Pack.statusBadge, /OUT NOW/i);
  assert.match(gta6Pack.statusBadge, /01\.002\.002/);
  assert.equal(gta6Pack.dayOnePatchPs5Gb, 0.6);
  assert.equal(gta6Pack.dayOnePatchXboxGb, 1.6);

  const serializedPack = JSON.stringify(gta6Pack);
  assert.doesNotMatch(serializedPack, /projected pre-preload/i);
  assert.doesNotMatch(serializedPack, /225\s*GB/i);
  assert.doesNotMatch(serializedPack, /\+35\s*GB/i);

  assert.equal(gta6Pack.safes, undefined);
  assert.equal(gta6Pack.heistPresets, undefined);
  assert.equal(gta6Pack.marketFlips, undefined);
  assert.equal(gta6Pack.nightRoutes, undefined);

  const consoles = gta6Pack.consoles || [];
  const xboxProfiles = consoles.filter((c) => c.platform === 'xbox');
  assert.equal(xboxProfiles.length, 3, 'Expected 3 Xbox console profiles');
  for (const xb of xboxProfiles) {
    assert.equal(xb.installGb, 212, `Expected ${xb.id} installGb === 212`);
    assert.equal(xb.patchGb, 1.6, `Expected ${xb.id} patchGb === 1.6`);
  }

  const ps5Base = consoles.find((c) => c.id === 'ps5-base');
  assert.ok(ps5Base, 'Expected ps5-base console option');
  assert.equal(ps5Base.name, 'PS5 Base / Slim Digital (825GB - 667 GB usable)');
  assert.equal(ps5Base.patchGb, 0.6);
  assert.match(ps5Base.nzDetail, /CFI-2100/i);

  const ps5Slim = consoles.find((c) => c.id === 'ps5-slim');
  assert.equal(ps5Slim?.name, 'PS5 Slim Disc (1TB - 848 GB usable)');

  const ps5Pro = consoles.find((c) => c.id === 'ps5-pro');
  assert.equal(ps5Pro?.name, 'PS5 Pro (2TB - 1,890 GB usable)');

  assert.equal(SPOILER_CHAPTERS.length, 6);
  assert.equal(GTA6_CHEAT_META.totalCount, 61);
  assert.equal(GTA6_CONFIRMED_CHEATS.length, 12);
  const bannedCheatTokenRe = /[✕□△○]|R2|L2|RT|LT|\b[ABXY]\b/;
  for (const ch of GTA6_CONFIRMED_CHEATS) {
    const ps5Seq = (ch.ps5Combo || []).join(' ');
    const xboxSeq = (ch.xboxCombo || []).join(' ');
    assert.doesNotMatch(ps5Seq, bannedCheatTokenRe, `Fake face/trigger button in GTA6_CONFIRMED_CHEATS PS5: ${ch.id}`);
    assert.doesNotMatch(xboxSeq, bannedCheatTokenRe, `Fake face/trigger button in GTA6_CONFIRMED_CHEATS Xbox: ${ch.id}`);
  }
  assert.ok(GTA6_MONEY_METHODS.some((m) => /Moses/i.test(m.title)));
  assert.equal(GTA6_ROBBERY_TIERS.length, 4);
  assert.equal(GTA6_CONSOLE_30FPS_SPECS.length, 4);
  assert.equal(GTA6_COLLECTIBLE_TARGETS.find((c) => c.id === 'waink')?.target, 200);
  assert.equal(GTA6_COLLECTIBLE_TARGETS.find((c) => c.id === 'wildlife')?.target, 100);
  assert.equal(GTA6_COLLECTIBLE_TARGETS.find((c) => c.id === 'flamingos')?.target, 100);
  assert.equal(GTA6_COLLECTIBLE_TARGETS.find((c) => c.id === 'stunts')?.target, 300);
  assert.equal(GTA6_COLLECTIBLE_TARGETS.find((c) => c.id === 'cards')?.target, 15);
  assert.equal(GTA6_SAVE_SLOT_TEMPLATES.filter((s) => s.group === 'chapter').length, 10);
  assert.equal(GTA6_SAVE_SLOT_TEMPLATES.filter((s) => s.group === 'freeroam').length, 5);
  assert.match(GTA6_PLATINUM_MISSABLES.warning, /0 missables for the in-game 100% Completion menu/i);
  assert.equal(GTA6_LAUNCH_FIXES.length, 6);
  assert.equal(GTA6_RADIO_STATIONS.length, 23);
  assert.ok(GTA6_ULTIMATE_CLAIMS.some((u) => /Shitzu Squalo/i.test(u.title)));
  assert.equal(
    GTA6_ULTIMATE_CLAIMS.some((u) => /Typhoon/i.test(u.title)),
    false
  );

  const gta6Meta = TOP_GAMES.find((g) => g.id === 'gta-6');
  assert.ok(gta6Meta);
  const serializedTop = JSON.stringify(gta6Meta);
  assert.match(serializedTop, /212 GB/);
  assert.match(serializedTop, /01\.002\.002/);

  for (const rel of [
    'src/components/gta6/LeonidaCommandCenter.jsx',
    'src/components/gta6/leonida/LeonidaSessionTab.jsx',
    'src/components/gta6/leonida/LeonidaStorageTab.jsx',
    'src/components/gta6/leonida/LeonidaSettingsTab.jsx',
    'src/components/gta6/leonida/LeonidaHeatMoneyCheatsTab.jsx',
    'src/components/gta6/leonida/LeonidaFixesRadioTab.jsx',
    'src/components/gta6/leonida/LeonidaSessionRail.jsx',
    'src/components/gta6/Gta6SpoilerShieldBar.jsx',
    'src/components/gta6/Gta6CheatDeck.jsx',
    'src/components/gta6/Gta6MoneyRobberyDeck.jsx',
    'src/components/gta6/Gta6SettingsTunerDeck.jsx',
    'src/components/gta6/Gta6PlatinumUltimateDeck.jsx',
    'src/components/gta6/Gta6FixesDeck.jsx',
    'src/components/gta6/Gta6RadioDeck.jsx',
    'src/components/gta6/WakeLockToggle.jsx',
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `Expected GTA VI component ${rel}`);
  }

  const resolvedGta6Home = resolveSeoRequest('/gta-6');
  assert.equal(resolvedGta6Home.status, 200, 'Expected /gta-6 to return 200 OK');

  for (const [oldPath, destUrl] of [
    ['/gta-6/', 'https://playunpause.com/gta-6'],
    ['/gta-6/safe-codes', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/safe-codes/vice-beach', 'https://playunpause.com/gta-6/robberies'],
    ['/gta-6/heist-split', 'https://playunpause.com/gta-online'],
    ['/gta-6/stock-market-planner', 'https://playunpause.com/gta-6/money'],
    ['/gta-6/night-run', 'https://playunpause.com/gta-6/platinum'],
  ]) {
    const resolved = resolveSeoRequest(oldPath);
    assert.equal(resolved.status, 301, `Expected 301 for ${oldPath}`);
    assert.equal(resolved.redirectTo, destUrl);
  }

  for (const rel of collectFiles('src', ['.js', '.jsx'])) {
    const content = readRepoFile(rel);
    assert.doesNotMatch(content, /225\s*GB|212[–-]225\s*GB/i, `Found stale 225 GB copy in ${rel}`);
    assert.doesNotMatch(content, /\+35\s*GB|35\s*GB\s*Day-1/i, `Found stale +35 GB patch copy in ${rel}`);
    assert.doesNotMatch(content, /0\s*\/\s*5\s*Free|0\s*\/\s*2\s*Free/i, `Found stale pin limit copy in ${rel}`);
    assert.doesNotMatch(content, /Typhoon/i, `Found banned Typhoon string in ${rel}`);
  }

  for (const rel of collectFiles('src', ['.css'])) {
    const cssText = readRepoFile(rel);
    assert.doesNotMatch(cssText, /transition\s*:\s*all\b/i, `Found banned transition: all in ${rel}`);
  }
  for (const rel of collectFiles('src', ['.js', '.jsx'])) {
    const jsText = readRepoFile(rel);
    assert.doesNotMatch(jsText, /\b(?:alert|confirm|prompt)\s*\(/, `Found banned native dialog in ${rel}`);
  }
});

test('1B. Leonida V2.3: 6 fixes, pure D-Pad cheats (12+7 TBC), 23 radio stations + Vault #23, 5 game chips recalc, #s= roundtrip', () => {
  assert.equal(LEONIDA_LAUNCH_FIXES.length, 6);
  assert.equal(LEONIDA_RADIO_STATIONS.length, 23);
  const vault = LEONIDA_RADIO_STATIONS.find((s) => s.num === 23);
  assert.ok(vault && vault.name === 'The Vault Radio' && vault.secret === true);

  const verifiedDPadCheats = LEONIDA_VERIFIED_CHEATS.filter((c) => !c.codeTbc);
  const tbcCheats = LEONIDA_VERIFIED_CHEATS.filter((c) => c.codeTbc);
  assert.equal(verifiedDPadCheats.length, 12);
  assert.equal(tbcCheats.length, 7);
  const bannedCheatTokenRe = /[✕□△○]|R2|L2|RT|LT|\b[ABXY]\b/;
  for (const c of LEONIDA_VERIFIED_CHEATS) {
    const seq = (c.dpad || []).join(' ');
    assert.doesNotMatch(seq, bannedCheatTokenRe, `Fake button in LEONIDA_VERIFIED_CHEATS: ${c.id}`);
  }
  const sanitizedCheatsState = sanitizeLeonidaState({
    checkedCheats: ['cash-250k', 'fake-cheat-id'],
  });
  assert.deepEqual(sanitizedCheatsState.checkedCheats, ['cash-250k']);

  // Toggling any of the 5 game chips changes installedGamesGb, diff, and bar proportions
  const baseline = computeLeonidaStorage({
    consoleId: 'xss',
    includePatch: true,
    installedGames: [],
    otherUsedGb: 77,
    mbps: 100,
  });
  assert.equal(baseline.isShort, false);
  for (const chip of LEONIDA_INSTALLED_GAMES) {
    const withChip = computeLeonidaStorage({
      consoleId: 'xss',
      includePatch: true,
      installedGames: [chip.id],
      otherUsedGb: 77,
      mbps: 100,
    });
    assert.equal(withChip.installedGamesGb, chip.gb);
    assert.notEqual(withChip.diff, baseline.diff);
    assert.notEqual(withChip.gamesPct, baseline.gamesPct);
  }

  // #s= V2 hash round-trip + malformed guard
  const sample = createDefaultLeonidaState();
  sample.chapter = 4;
  sample.consoleId = 'ps5_pro';
  sample.includePatch = false;
  sample.installedGames = ['cod', 'gta5'];
  sample.otherUsedGb = 120;
  sample.mbps = 250;
  sample.balconyDone = true;
  sample.counts = { waink: 88, wildlife: 42, flamingos: 19, stunts: 150, cards: 7 };
  sample.saves[0].saved = true;
  sample.saves[14].saved = true;

  const hash = encodeLeonidaShareHash(sample);
  assert.match(hash, /^#s=[A-Za-z0-9_-]+$/);
  const decoded = decodeLeonidaShareHash(hash);
  assert.ok(decoded);
  assert.equal(decoded.chapter, 4);
  assert.equal(decoded.consoleId, 'ps5_pro');
  assert.equal(decoded.includePatch, false);
  assert.deepEqual(decoded.installedGames, ['cod', 'gta5']);
  assert.equal(decoded.otherUsedGb, 120);
  assert.equal(decoded.mbps, 250);
  assert.equal(decoded.balconyDone, true);
  assert.deepEqual(decoded.counts, sample.counts);
  assert.equal(decoded.saves[0].saved, true);
  assert.equal(decoded.saves[14].saved, true);

  for (const badHash of [
    '',
    '#s=!!!bad!!!',
    '#s=e30',
    '#s=' + Buffer.from('{"v":2,"c":"xss"}').toString('base64url'),
    '#s=' + Buffer.from('{"v":1,"waink":10}').toString('base64url'),
    '#s=' + Buffer.from('{"__proto__":{"p":1},"v":2,"c":1,"con":"xss","k":[0,0,0,0,0],"sv":"000000000000000"}').toString('base64url'),
  ]) {
    assert.equal(decodeLeonidaShareHash(badHash), null, `Malformed V2 hash must return null: ${badHash}`);
  }

  // Chapter Pacer finish date sanity
  const finish = computeFinishDate({ pace: 'normal', chapter: 1, hoursPerDay: 2.5, nowDate: new Date('2026-11-19T12:00:00Z') });
  assert.equal(finish.remHrs, 70);
  assert.equal(finish.daysNeeded, 28);
  assert.equal(finish.formattedDate, 'Dec 17');
});

test('2. Roblox DevEx net-earned mode yields $380.00 for 100k Robux without double 30% deduction', () => {
  const netResult = calcRobloxDevEx({
    grossRobux: 100000,
    isNetEarned: true,
  });
  const netValues = Object.values(netResult).filter((v) => typeof v === 'number');
  assert.ok(
    netValues.some((n) => Math.abs(n - 380) < 0.01),
    `Expected $380.00 in Net Earned mode, got ${JSON.stringify(netResult)}`,
  );

  const grossResult = calcRobloxDevEx({
    grossRobux: 100000,
    isNetEarned: false,
  });
  const grossValues = Object.values(grossResult).filter((v) => typeof v === 'number');
  assert.ok(
    grossValues.some((n) => Math.abs(n - 266) < 0.01),
    `Expected $266.00 in default Gross mode, got ${JSON.stringify(grossResult)}`,
  );

  const netWithheld = calcRobloxDevEx({
    grossRobux: 100000,
    rateId: 'std-2025',
    isNetEarned: true,
    withholdingPct: 24,
    includePaypalFee: true,
  });
  assert.equal(netWithheld.grossUsd, 380);
  assert.equal(netWithheld.withholdingUsd, 91.2);
  assert.equal(netWithheld.paypalFeeUsd, 8.6);
  assert.equal(netWithheld.netPayoutUsd, 280.2);

  const highPaypalCap = calcRobloxDevEx({
    grossRobux: 1000000,
    rateId: 'std-2025',
    isNetEarned: true,
    withholdingPct: 10,
    includePaypalFee: true,
  });
  assert.equal(highPaypalCap.grossUsd, 3800);
  assert.equal(highPaypalCap.paypalFeeUsd, 21);
  assert.equal(highPaypalCap.netPayoutUsd, 3399);

  const preset100k = resolveSeoRequest('/roblox/devex/100000-robux-to-usd');
  assert.equal(preset100k.status, 200);
  assert.equal(preset100k.route?.preset?.rbxMode, 'net');

  const presetNewVsOld = resolveSeoRequest('/roblox/devex-new-vs-old-rate');
  assert.equal(presetNewVsOld.status, 200);
  assert.equal(presetNewVsOld.route?.preset?.rbxMode, 'net');

  const presetUsDirect = resolveSeoRequest('/roblox/us-direct-store-bonus-rate');
  assert.equal(presetUsDirect.status, 200);
  assert.equal(presetUsDirect.route?.preset?.rbxMode, 'net');

  const storageDeckSource = readRepoFile('src/components/StorageUnlockDeck.jsx');
  const animatedUsages = storageDeckSource.match(/<AnimatedValue/g) || [];
  assert.equal(animatedUsages.length, 0, 'Expected zero AnimatedValue tween lag wrappers in StorageUnlockDeck');
});

test('3. Amazon Associates compliance, canonical /dp/ ASINs, GTA Online split links, youth firewall', () => {
  const srcFiles = collectFiles('src', ['.js', '.jsx']);
  for (const rel of srcFiles) {
    const content = readRepoFile(rel);
    assert.doesNotMatch(content, /"Shop Gear"|'Shop Gear'|>Shop Gear</, `Found banned "Shop Gear" text in ${rel}`);
    assert.doesNotMatch(content, /amazon\.com\/s\?k=/, `Found /s?k= search URL leak in ${rel}`);
  }

  for (const rel of ['worker/index.js', 'server/index.js', 'src/App.jsx']) {
    const content = readRepoFile(rel);
    assert.doesNotMatch(content, /amazon\.com\/s\?k=/, `Found /s?k= search URL leak in ${rel}`);
  }

  const expectedAsins = [
    'B0C47ZX1WB',
    'B0C44XVWCH',
    'B00SW85KD4',
    'B09NBWL8J5',
    'B0CG7BWG7J',
    'B0BSYFB99D',
    'B0CZWM44QP',
  ];
  const appSource = readRepoFile('src/App.jsx');
  const workerSource = readRepoFile('worker/index.js');
  for (const asin of expectedAsins) {
    const re = new RegExp(`https://www\\.amazon\\.com/dp/${asin}\\?tag=playunpause-20`);
    assert.match(appSource, re, `Missing canonical ASIN ${asin} in src/App.jsx`);
    assert.match(workerSource, re, `Missing canonical ASIN ${asin} in worker/index.js`);
  }

  const storageSource = readRepoFile('src/components/StorageUnlockDeck.jsx');
  const dockSource = readRepoFile('src/components/games/GameStudioDock.jsx');
  const tunerSource = readRepoFile('src/components/gta6/Gta6SettingsTunerDeck.jsx');
  const leonidaRailSource = readRepoFile('src/components/gta6/leonida/LeonidaSessionRail.jsx');
  const leonidaStorageSource = readRepoFile('src/components/gta6/leonida/LeonidaStorageTab.jsx');
  assert.match(storageSource, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(dockSource, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(tunerSource, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(leonidaRailSource, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(leonidaStorageSource, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(tunerSource, /\/dp\/B0C47ZX1WB\?tag=playunpause-20/);
  assert.match(tunerSource, /\/dp\/B0C44XVWCH\?tag=playunpause-20/);
  assert.match(dockSource, /amazon-plain-link/);
  assert.match(dockSource, /Check Price on Amazon/);

  const gtaV = TOP_GAMES.find((g) => g.id === 'gta-v');
  assert.equal(gtaV.gearOffer.ctaLabel, 'Check PS5 M.2 NVMe on Amazon');
  assert.equal(gtaV.gearOffer.secondaryUrlKey, 'xboxCardUrl');
  assert.equal(gtaV.gearOffer.secondaryCtaLabel, 'Check Xbox Card on Amazon');

  for (const youthId of ['minecraft', 'roblox', 'fortnite']) {
    const game = TOP_GAMES.find((g) => g.id === youthId);
    assert.equal(game.gearOffer, null, `Youth firewall violated for ${youthId}`);
  }
});

test('4. Zombie $6.99 gate removed, 16 setups & OBS free, SVG QR matrix works, /api/sync/create live', async () => {
  assert.equal(MAX_FREE_PROFILES, 16);
  assert.equal(MAX_FREE_PINS_PER_GAME, 120);

  const matrix = generateQrMatrix('https://playunpause.com/#sync=UP-ABCD1234');
  const rows = Array.isArray(matrix) ? matrix : matrix.modules || matrix.matrix;
  assert.ok(Array.isArray(rows) && rows.length >= 21, 'Expected valid >=21x21 QR matrix');
  assert.equal(rows.length, rows[0].length, 'Expected square QR matrix');

  for (const rel of [
    'src/App.jsx',
    'src/components/EmbedWidgetModal.jsx',
    'src/components/LegalComplianceModal.jsx',
    'src/components/games/GameStudioDock.jsx',
    'src/components/StorageUnlockDeck.jsx',
  ]) {
    const content = readRepoFile(rel);
    assert.doesNotMatch(content, /\$6\.99/, `Found zombie $6.99 price in ${rel}`);
  }

  const appSource = readRepoFile('src/App.jsx');
  assert.match(appSource, /UP-••••/);
  assert.match(appSource, /revealSyncSecret/);

  const env = makeWorkerEnv();
  const res = await worker.fetch(
    new Request('https://playunpause.com/api/sync/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.10',
      },
      body: JSON.stringify({ state: { activeGameId: 'gta-6' } }),
    }),
    env,
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.deckCode || '', /^UP-[A-Z0-9]{6,12}$/);
});

test('5. Ctrl+K switcher, fixed viewport modal centering, header aria-hidden labels', () => {
  const appSource = readRepoFile('src/App.jsx');
  assert.match(appSource, /key\.toLowerCase\(\)\s*===\s*'k'/);
  assert.match(appSource, /nz-compact-text"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*nz-compact-text/);
  assert.match(appSource, /pass-short-label"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*pass-short-label/);

  const cssSource = readRepoFile('src/styles/deck.css');
  assert.match(cssSource, /position:\s*fixed/);
  assert.match(cssSource, /inset:\s*0/);
  assert.match(cssSource, /place-items:\s*center/);
  assert.match(cssSource, /90dvh/);
});

test('6. Worker single-hop 301s, YouTube slug 301s, UTF-8 robots.txt & complete llms.txt', async () => {
  const env = makeWorkerEnv();

  const gta6Res = await worker.fetch(new Request('https://playunpause.com/gta-6?src=short'), env);
  assert.equal(gta6Res.status, 200, 'Expected 200 for https://playunpause.com/gta-6');

  for (const url of [
    'http://playunpause.com/gta-6?src=short',
    'http://www.playunpause.com/gta-6?src=short',
    'https://www.playunpause.com/gta-6?src=short',
    'https://playunpause.com/gta-6/?src=short',
  ]) {
    const res = await worker.fetch(new Request(url), env);
    assert.equal(res.status, 301, `Expected 301 for ${url}`);
    assert.equal(res.headers.get('location'), 'https://playunpause.com/gta-6?src=short');
  }

  const wwwRes = await worker.fetch(new Request('https://www.playunpause.com/cod-warzone?x=1'), env);
  assert.equal(wwwRes.status, 301);
  assert.equal(wwwRes.headers.get('location'), 'https://playunpause.com/cod-warzone?x=1');

  for (const [slug, target] of [
    ['https://playunpause.com/eafc-tax', 'https://playunpause.com/ea-fc-27'],
    ['https://playunpause.com/warzone-ttk', 'https://playunpause.com/cod-warzone'],
  ]) {
    const res = await worker.fetch(new Request(slug), env);
    assert.equal(res.status, 301, `Expected 301 for ${slug}`);
    assert.equal(res.headers.get('location'), target);
  }

  const seoEafc = resolveSeoRequest('/eafc-tax');
  assert.equal(seoEafc.redirectTo, 'https://playunpause.com/ea-fc-27');
  const seoWarzone = resolveSeoRequest('/warzone-ttk');
  assert.equal(seoWarzone.redirectTo, 'https://playunpause.com/cod-warzone');

  const robotsRes = await worker.fetch(new Request('https://playunpause.com/robots.txt'), env);
  assert.equal(robotsRes.status, 200);
  assert.equal(robotsRes.headers.get('content-type'), 'text/plain; charset=utf-8');
  const robotsText = await robotsRes.text();
  const firstLine = robotsText.split(/\r?\n/)[0];
  assert.doesNotMatch(firstLine, /[—–â€]/, `Mojibake or non-ASCII dash on robots.txt line 1: ${firstLine}`);

  const llmsRes = await worker.fetch(new Request('https://playunpause.com/llms.txt'), env);
  assert.equal(llmsRes.status, 200);
  assert.equal(llmsRes.headers.get('content-type'), 'text/plain; charset=utf-8');
  const llmsText = await llmsRes.text();
  assert.match(llmsText, /\[TERMS\][\s\S]+?https:\/\/playunpause\.com\/legal\/terms/);
  assert.match(llmsText, /\[PRIVACY\][\s\S]+?https:\/\/playunpause\.com\/legal\/privacy/);
  assert.doesNotMatch(llmsText, /\$6\.99/);
});

test('7. AppSec: stripDangerousKeys blocks prototype pollution, zero innerHTML, per-code PUT 429 limit', async () => {
  const maliciousJson = '{"__proto__":{"polluted":true},"nested":{"constructor":{"x":1},"prototype":{"y":2},"ok":"safe"}}';
  const parsed = JSON.parse(maliciousJson);
  const cleaned = stripDangerousKeys(parsed);

  assert.equal(Object.hasOwn(cleaned, '__proto__'), false);
  assert.equal(Object.hasOwn(cleaned.nested, 'constructor'), false);
  assert.equal(Object.hasOwn(cleaned.nested, 'prototype'), false);
  assert.equal(cleaned.nested.ok, 'safe');
  assert.equal({}.polluted, undefined);

  const srcFiles = collectFiles('src', ['.js', '.jsx']);
  for (const rel of srcFiles) {
    const content = readRepoFile(rel);
    assert.doesNotMatch(content, /\.innerHTML\b|dangerouslySetInnerHTML/, `Unsafe HTML injection pattern in ${rel}`);
  }

  const env = makeWorkerEnv();
  const createRes = await worker.fetch(
    new Request('https://playunpause.com/api/sync/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '198.51.100.1',
      },
      body: JSON.stringify({ state: { activeGameId: 'gta-6' } }),
    }),
    env,
  );
  const created = await createRes.json();
  const code = created.deckCode;
  assert.ok(code);

  let hit429 = false;
  for (let i = 0; i < 20; i += 1) {
    const putRes = await worker.fetch(
      new Request(`https://playunpause.com/api/sync/${code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': `198.51.100.${10 + i}`,
        },
        body: JSON.stringify({ state: { activeGameId: 'gta-6', seq: i } }),
      }),
      env,
    );
    if (putRes.status === 429) {
      hit429 = true;
      break;
    }
    assert.equal(putRes.status, 200, `Expected 200 before rate limit hit on attempt ${i + 1}`);
  }
  assert.equal(hit429, true, 'Expected per-code PUT rate limit to trigger 429 within 20 writes across distinct IPs');
});

test('8. Legal pages alignment: zero $6.99, release date Nov 19 2026, complete legal meta', () => {
  const legalModal = readRepoFile('src/components/LegalComplianceModal.jsx');
  assert.doesNotMatch(legalModal, /Nov\s*18,\s*2026/i);
  assert.match(legalModal, /November 19, 2026/);
  assert.doesNotMatch(legalModal, /\$6\.99/);
  assert.match(legalModal, /ECTA/i);

  const legalMetaJson = JSON.stringify(LEGAL_META);
  assert.doesNotMatch(legalMetaJson, /\$6\.99/);
  assert.doesNotMatch(legalMetaJson, /Nov\s*18,\s*2026/i);
});

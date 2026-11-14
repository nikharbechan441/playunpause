#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANONICAL_ORIGIN,
  CORE_ROUTES,
  INDEXNOW_KEY,
  LEGAL_ROUTES,
  getSitemapRoutes,
} from '../src/data/seoRoutes.js';
import { TOP_GAMES, COD_MW4_WEAPONS } from '../src/data/games/allGames.js';
import { gta6Pack } from '../src/data/games/gta6Pack.js';
import {
  CS2_LOSS_LADDER,
  calcCodTtk,
  calcCs2Economy,
  calcFc27Tax,
  calcFortniteXp,
  calcGtaOnlineHeist,
  calcNetherCoords,
  calcRobloxDevEx,
  getFreeApexLevelPacks,
} from '../src/utils/gameMath.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSitemapXml() {
  const routes = getSitemapRoutes();
  const urls = routes
    .map(
      (r) => `  <url>
    <loc>${escapeXml(`${CANONICAL_ORIGIN}${r.path}`)}</loc>
    <lastmod>${escapeXml(r.lastmod || '2026-11-14')}</lastmod>
    <changefreq>${escapeXml(r.changefreq || 'weekly')}</changefreq>
    <priority>${escapeXml(String(r.priority ?? '0.8'))}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobotsTxt() {
  return `# Unpause (playunpause.com) — Crawler & AI Search Indexing Policy
# Machine-readable LLM indexes:
#   ${CANONICAL_ORIGIN}/llms.txt
#   ${CANONICAL_ORIGIN}/llms-full.txt

User-agent: *
Allow: /
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /
Disallow: /api/

User-agent: ChatGPT-User
Allow: /
Disallow: /api/

User-agent: GPTBot
Allow: /
Disallow: /api/

User-agent: PerplexityBot
Allow: /
Disallow: /api/

User-agent: ClaudeBot
Allow: /
Disallow: /api/

User-agent: Claude-Web
Allow: /
Disallow: /api/

User-agent: Google-Extended
Allow: /
Disallow: /api/

User-agent: Applebot-Extended
Allow: /
Disallow: /api/

Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml
`;
}

function buildLlmsTxt() {
  const toolLines = CORE_ROUTES.map(
    (r) => `- [${r.shortLabel}](${CANONICAL_ORIGIN}${r.path}): ${r.description}`
  ).join('\n');

  const legalLines = LEGAL_ROUTES.map(
    (r) => `- [${r.shortLabel}](${CANONICAL_ORIGIN}${r.path}): ${r.description}`
  ).join('\n');

  return `# Unpause (playunpause.com)

> Fast, dark-mode, zero-popup browser utility for GTA VI console storage checking, Vice City keypad vaults, integer-exact heist splitting, and 9 instant math calculators across COD Warzone, EA Sports FC 27, Minecraft, Roblox, CS2, Valorant, Fortnite, Apex Legends, and GTA Online.

- Canonical Site: ${CANONICAL_ORIGIN}/
- Extended Reference & Formula Tables: ${CANONICAL_ORIGIN}/llms-full.txt
- Full XML Sitemap (${getSitemapRoutes().length} canonical pages): ${CANONICAL_ORIGIN}/sitemap.xml
- Embeddable Calculators: Every core deck supports chromeless iframe embedding at \`${CANONICAL_ORIGIN}/embed/<slug>\`

## Core Game Calculators
${toolLines}

## Compliance, Privacy & Attribution
- All free interactive calculators execute 100% locally in the browser with zero ad-tech scripts and self-hosted fonts.
- Pre-launch GTA VI figures are clearly labeled as estimates ahead of November 19, 2026 release.
- NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
- Optional Sync Pass ($6.99 USD Founders until Nov 18, 2026 11:00 UTC, then $9.99 USD via Whop Merchant of Record) unlocks UP-XXXXXXXX cross-device sync and 14-day refunds.

## Legal & Trust Pages
${legalLines}
`;
}

function formatDownloadEta(gb, mbps) {
  const mins = Math.max(1, Math.round((gb * 8000) / (mbps * 60 * 0.9)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m (${mins}m)`;
}

function buildLlmsFullTxt() {
  const routes = getSitemapRoutes();
  const patchGb = gta6Pack.dayOnePatchGb ?? 35;

  const consoleRows = (gta6Pack.consoles || [])
    .map(
      (c) =>
        `| ${c.name} | ${c.usableGb} GB usable | ${c.installGb} GB base | ${c.installGb + patchGb} GB (+${patchGb} GB Day-1 patch) | ${c.nzTrickWorks ? 'Est. via Settings' : 'PSN Region Locked'} |`
    )
    .join('\n');

  const speedRows = [25, 50, 100, 150, 300, 500, 1000]
    .map(
      (mbps) =>
        `| ${mbps} Mbps | ${formatDownloadEta(212, mbps)} | ${formatDownloadEta(225, mbps)} | ${formatDownloadEta(225 + patchGb, mbps)} |`
    )
    .join('\n');

  const weaponRows = COD_MW4_WEAPONS.map((w) => {
    const hs1 = calcCodTtk({
      hp: 300,
      damage: w.damage,
      rpm: w.rpm,
      headshots: 1,
      headMult: w.headMult,
      openBoltMs: w.openBoltMs || 0,
    });
    const bodyOnly = calcCodTtk({
      hp: 300,
      damage: w.damage,
      rpm: w.rpm,
      headshots: 0,
      headMult: w.headMult,
      openBoltMs: w.openBoltMs || 0,
    });
    return `| ${w.name} (${w.category}) | ${w.rpm} RPM | ${w.damage} dmg (${w.headMult}x HS) | ${hs1.ttkMs} ms (${hs1.shotsToKill} shots, 1 HS) | ${bodyOnly.ttkMs} ms (${bodyOnly.shotsToKill} shots, body) |`;
  }).join('\n');

  const fcSample = [100000, 250000, 500000, 1000000]
    .map((b) => {
      const targetSell = Math.round(b * 1.15);
      const res = calcFc27Tax({ buyCoins: b, sellCoins: targetSell, quantity: 1 });
      return `| ${b.toLocaleString('en-US')} | ${res.minBreakEvenExact.toLocaleString('en-US')} (snap ${res.minBreakEvenSnapped.toLocaleString('en-US')}) | +${res.totalProfit.toLocaleString('en-US')} at ${targetSell.toLocaleString('en-US')} sell |`;
    })
    .join('\n');

  const netherSample = [
    [0, 64, 0],
    [-200, 64, 400],
    [1200, 64, -800],
    [-4000, 70, 2400],
  ]
    .map(([x, y, z]) => {
      const res = calcNetherCoords(x, y, z, 'toNether');
      return `| (${res.input.x}, ${res.input.y}, ${res.input.z}) | (${res.output.x}, ${res.output.y}, ${res.output.z}) | Chunk (${res.chunk.cx}, ${res.chunk.cz}) |`;
    })
    .join('\n');

  const devexSample = [30000, 50000, 100000, 500000]
    .map((robux) => {
      const direct = calcRobloxDevEx({ grossRobux: robux, rateId: 'std-2025', groupSplitPct: 100 });
      return `| ${robux.toLocaleString('en-US')} R$ | $${(robux * 0.0038).toFixed(2)} USD (if already net) | ${direct.afterMarketFee.toLocaleString('en-US')} net R$ -> $${direct.usdPayout.toFixed(2)} USD (after 30% fee) |`;
    })
    .join('\n');

  const cs2Rows = CS2_LOSS_LADDER.map((bonus, idx) => `| ${idx} | $${bonus.toLocaleString('en-US')} |`).join('\n');
  const cs2Sample = calcCs2Economy({ cash: 3200, lossLevel: 1, side: 'CT', bombPlanted: false });
  const fnSample = calcFortniteXp({
    currentLevel: 44,
    targetLevel: 200,
    daysRemaining: 28,
    includeDailies: true,
    includeCreative: true,
  });
  const apexTotalFree = getFreeApexLevelPacks(500, 0);
  const cayoSample = calcGtaOnlineHeist({
    primaryValue: 1300000,
    secondaryValue: 450000,
    players: 2,
    hostPct: 50,
    hardMode: true,
    setupFee: 100000,
  });

  const gameSummaries = TOP_GAMES.map(
    (g) => `### ${g.fullTitle}\n- Category: ${g.genre}\n- Tagline: ${g.tagline}`
  ).join('\n\n');

  const routeCatalog = routes.map((r) => `- ${CANONICAL_ORIGIN}${r.path} — ${r.title}`).join('\n');

  return `# Unpause (playunpause.com) — Full Structured Reference & Game Math Facts

Canonical origin: ${CANONICAL_ORIGIN}
Total indexable clean routes: ${routes.length}
Important attribution note: playunpause.com is an independent unofficial utility. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. FIFA is a registered trademark of FIFA.

## 1. GTA VI Console Storage Estimates (Pre-Launch Guide Until Nov 19, 2026)
| Console | Usable OS Storage | GTA VI Base Est. | With +${patchGb} GB Day-1 Patch | NZ Unlock Rule |
| --- | --- | --- | --- | --- |
${consoleRows}

### GTA VI Download ETA Reference (at 90% Realistic ISP Throughput)
| Connection Speed | PS5 Base (212 GB) | Xbox Base (225 GB) | Xbox + Patch (${225 + patchGb} GB) |
| --- | --- | --- | --- |
${speedRows}

## 2. Call of Duty: Warzone / BO7 (300 HP Armor Plate TTK Matrix)
| Weapon | Fire Rate | Base Body Damage | 300 HP (1 HS) | 300 HP (Body Only) |
| --- | --- | --- | --- | --- |
${weaponRows}

## 3. EA Sports FC 27 Ultimate Team 5% Transfer Tax Formula
- EA collects a flat 5% tax on all Transfer Market sales (\`netPerCard = sellCoins - round(sellCoins * 0.05)\`).
- Exact break-even sell price: \`ceil(buyCoins / 0.95)\`.
| Buy Price | Minimum Break-Even Sell | Profit Example (+15% Sale) |
| --- | --- | --- |
${fcSample}

## 4. Minecraft Nether Portal 8:1 Coordinate Conversion
- Overworld X and Z divide by 8 (floored) for Nether X and Z; Y height stays matched on the vertical axis for safe linking.
| Overworld (X, Y, Z) | Nether Target (X, Y, Z) | Overworld Chunk |
| --- | --- | --- |
${netherSample}

## 5. Roblox DevEx & Marketplace 30% Fee Reference
| Gross Sales Robux | DevEx Payout (After 30% Fee at 0.0038) | Net Breakdown |
| --- | --- | --- |
${devexSample}

## 6. CS2 Loss Bonus Ladder & Buy Floor Reference
| Consecutive Losses | Round Loss Bonus |
| --- | --- |
${cs2Rows}

- Sample CT state at $3,200 with 1 loss: next-round worst-case bank if saving = $${cs2Sample.cashIfSaveAll.toLocaleString('en-US')} (${cs2Sample.callout}).

## 7. Fortnite Level 200 Pace & Apex Free Pack Totals
- Battle Pass math uses 80,000 XP per level. From level 44 to 200 with 28 days remaining requires ${fnSample.levelsPerDay} levels/day (${fnSample.xpPerDay.toLocaleString('en-US')} XP/day).
- Apex Legends Levels 1–500 award ${apexTotalFree} total free Apex Packs (out of 500 needed for Heirloom Shards pity).

## 8. GTA Online Cayo Perico Payout Math
- Support crew / Pavel (2%) + fencing fee (10%) deduct 12% combined on Hard Mode. Example $1.3M primary + $450k secondary at 50/50 leaves net pool $${cayoSample.netPool.toLocaleString('en-US')} ($${cayoSample.hostGrossPayout.toLocaleString('en-US')} host share before $100k setup fee).

## 9. Game Roster Summary
${gameSummaries}

## 10. Complete Canonical Route Index (${routes.length} Pages)
${routeCatalog}
`;
}

function main() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), buildSitemapXml(), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), buildRobotsTxt(), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), buildLlmsTxt(), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), buildLlmsFullTxt(), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, `${INDEXNOW_KEY}.txt`), `${INDEXNOW_KEY}\n`, 'utf8');

  const routeCount = getSitemapRoutes().length;
  console.log(
    `[Unpause SEO] Wrote sitemap.xml (${routeCount} URLs), robots.txt, llms.txt, llms-full.txt, and ${INDEXNOW_KEY}.txt`
  );
}

main();

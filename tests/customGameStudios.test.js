import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOP_GAMES } from '../src/data/games/allGames.js';
import { CORE_ROUTES, resolveSeoRequest } from '../src/data/seoRoutes.js';
import { escapeHtml, renderSeoHtmlDocument } from '../src/data/ssrHtml.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const STUDIO_FILES = [
  'src/components/games/CodWarzoneStudio.jsx',
  'src/components/games/MinecraftStudio.jsx',
  'src/components/games/Cs2EconomyStudio.jsx',
  'src/components/games/ValorantStudio.jsx',
  'src/components/games/EaFc27Studio.jsx',
  'src/components/games/FortniteStudio.jsx',
  'src/components/games/RobloxStudio.jsx',
  'src/components/games/ApexLegendsStudio.jsx',
  'src/components/games/GtaOnlineStudio.jsx',
];

const GAME_IDS = [
  'gta-6',
  'cod-warzone',
  'fortnite',
  'minecraft',
  'ea-fc-27',
  'roblox',
  'cs2',
  'valorant',
  'apex-legends',
  'gta-v',
];

test('all 9 custom per-game studio modules exist and export default components', () => {
  for (const rel of STUDIO_FILES) {
    const abs = path.join(ROOT, rel);
    assert.equal(fs.existsSync(abs), true, `Missing studio module: ${rel}`);
    const src = fs.readFileSync(abs, 'utf8');
    assert.match(src, /export default function \w+Studio\(/, `${rel} must export default *Studio`);
    assert.match(src, /SpotlightPanel|AnimatedValue/, `${rel} must use motion primitives`);
  }
});

test('MinecraftStudio includes mandatory Mojang non-affiliation disclaimer', () => {
  const mcSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/games/MinecraftStudio.jsx'),
    'utf8'
  );
  assert.match(mcSrc, /NOT AN OFFICIAL MINECRAFT PRODUCT\./);
  assert.match(mcSrc, /NOT APPROVED BY OR ASSOCIATED WITH\s+MOJANG OR MICROSOFT\./);
});

test('RobloxStudio includes 30,000 R$ DevEx eligibility gate and creator disclaimer', () => {
  const rbxSrc = fs.readFileSync(path.join(ROOT, 'src/components/games/RobloxStudio.jsx'), 'utf8');
  assert.match(rbxSrc, /30,000 net earned R\$/);
  assert.match(rbxSrc, /Zero data\s+is collected on minors/i);
});

test('MultiGameToolDeck lazy-loads all 9 game studios and connects shared dock', () => {
  const deckSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/MultiGameToolDeck.jsx'),
    'utf8'
  );
  for (const studioImport of [
    'CodWarzoneStudio',
    'MinecraftStudio',
    'Cs2EconomyStudio',
    'ValorantStudio',
    'EaFc27Studio',
    'FortniteStudio',
    'RobloxStudio',
    'ApexLegendsStudio',
    'GtaOnlineStudio',
  ]) {
    assert.match(
      deckSrc,
      new RegExp(`lazy\\(\\(\\)\\s*=>\\s*import\\(['"]\\./games/${studioImport}\\.jsx['"]\\)\\)`),
      `MultiGameToolDeck should lazy-load ${studioImport}`
    );
  }
  assert.match(deckSrc, /GameStudioSideDock/);
  assert.match(deckSrc, /import\s*\{\s*buildMultiGameShareUrl\s*\}\s*from\s*['"]\.\.\/utils\/shareUrlHelpers\.js['"]/);
});

test('App.jsx isolates non-GTA-VI game chrome and hides Nov 19 countdown outside GTA 6', () => {
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  assert.match(appSrc, /data-game=\{activeGamePack\.id\}/);
  assert.match(appSrc, /activeGamePack\.isGta6Suite \?/);
  assert.match(appSrc, /className="game-studio-subbar"/);
  assert.match(appSrc, /className="cross-game-directory-drawer"/);
});

test('motionPrimitives provides reduced-motion aware animation components', () => {
  const mpSrc = fs.readFileSync(path.join(ROOT, 'src/utils/motionPrimitives.jsx'), 'utf8');
  assert.match(mpSrc, /export function usePrefersReducedMotion/);
  assert.match(mpSrc, /export function useAnimatedNumber/);
  assert.match(mpSrc, /export function AnimatedValue/);
  assert.match(mpSrc, /export function SpotlightPanel/);
  assert.match(mpSrc, /export function SegmentedSpringTabs/);
  assert.match(mpSrc, /prefers-reduced-motion:\s*reduce/);
});

test('gameStudios.css styles all 10 data-game shells and honors reduced-motion and forced-colors', () => {
  const cssSrc = fs.readFileSync(path.join(ROOT, 'src/styles/gameStudios.css'), 'utf8');
  for (const gameId of GAME_IDS) {
    assert.ok(
      cssSrc.includes(`.game-theme-shell[data-game='${gameId}']`),
      `Missing game-theme-shell style for ${gameId}`
    );
  }
  assert.match(cssSrc, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(cssSrc, /@media \(forced-colors:\s*active\)/);
  assert.match(cssSrc, /:root\[data-theme='paper'\]/);
  assert.match(cssSrc, /min-height:\s*44px/);
});

test('all 10 TOP_GAMES packs define world persona, distinct canvas hexes, and legal-safe notices', () => {
  assert.equal(TOP_GAMES.length, GAME_IDS.length);
  const obsidianHexes = new Set();
  const paperHexes = new Set();

  for (const gameId of GAME_IDS) {
    const pack = TOP_GAMES.find((g) => g.id === gameId);
    assert.ok(pack, `Missing TOP_GAMES pack for ${gameId}`);
    assert.equal(typeof pack.themePersonaLabel, 'string');
    assert.ok(pack.themePersonaLabel.trim().length > 0, `Empty themePersonaLabel for ${gameId}`);
    assert.equal(typeof pack.legalNotice, 'string');
    assert.ok(pack.legalNotice.trim().length > 0, `Empty legalNotice for ${gameId}`);
    assert.match(
      pack.legalNotice,
      /Not affiliated|NOT APPROVED BY OR ASSOCIATED WITH/i,
      `Missing non-affiliation disclosure for ${gameId}`
    );
    assert.match(pack.canvasHexObsidian || '', /^#[0-9A-F]{6}$/i, `Invalid canvasHexObsidian for ${gameId}`);
    assert.match(pack.canvasHexPaper || '', /^#[0-9A-F]{6}$/i, `Invalid canvasHexPaper for ${gameId}`);
    obsidianHexes.add(pack.canvasHexObsidian.toUpperCase());
    paperHexes.add(pack.canvasHexPaper.toUpperCase());
  }

  assert.equal(obsidianHexes.size, GAME_IDS.length, 'Each game must define a unique Obsidian canvas hex');
  assert.equal(paperHexes.size, GAME_IDS.length, 'Each game must define a unique Paper canvas hex');

  const minecraft = TOP_GAMES.find((g) => g.id === 'minecraft');
  assert.ok(
    minecraft.legalNotice.includes(
      'NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.'
    ),
    'Minecraft legalNotice must preserve verbatim Mojang/Microsoft clause'
  );

  const roblox = TOP_GAMES.find((g) => g.id === 'roblox');
  assert.ok(
    roblox.legalNotice.includes(
      'Requires 13+ account and 30,000 net earned R$ eligibility. Zero data is collected on minors.'
    ),
    'Roblox legalNotice must preserve verbatim 13+ / 30,000 R$ / zero-minor-data clause'
  );
});

test('ssrHtml.js stamps data-game on <html>, omits inline style= attrs, and emits per-game complianceNotice', () => {
  const baseHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ssrSrc = fs.readFileSync(path.join(ROOT, 'src/data/ssrHtml.js'), 'utf8');
  assert.doesNotMatch(ssrSrc, /\bstyle\s*=/i, 'ssrHtml.js must not emit inline style= HTML attributes');

  for (const gameId of GAME_IDS) {
    const pack = TOP_GAMES.find((g) => g.id === gameId);
    const route = CORE_ROUTES.find((r) => r.gameId === gameId && !r.legal);
    assert.ok(route, `Missing CORE_ROUTES entry for ${gameId}`);

    const resolution = resolveSeoRequest(route.path);
    assert.ok(resolution && !resolution.notFound, `Failed to resolve SSR route ${route.path}`);

    const html = renderSeoHtmlDocument(baseHtml, resolution);
    assert.match(
      html,
      new RegExp(`<html\\b[^>]*\\blang="en"[^>]*\\bdata-game="${gameId}"`),
      `SSR HTML for ${route.path} must stamp data-game="${gameId}" on <html lang="en">`
    );
    assert.doesNotMatch(
      html,
      /<[a-z][^>]*\sstyle\s*=/i,
      `SSR HTML for ${route.path} must contain zero inline style= HTML attributes`
    );

    const expectedNoticeHtml = `<p><strong>${escapeHtml(pack.legalNotice)}</strong></p>`;
    assert.ok(
      html.includes(expectedNoticeHtml),
      `SSR HTML for ${route.path} missing complianceNotice for ${gameId}`
    );
    assert.match(
      html,
      new RegExp(`<meta\\s+name="theme-color"\\s+content="${pack.canvasHexObsidian}"\\s*\\/?>`, 'i'),
      `SSR HTML for ${route.path} must emit Obsidian theme-color ${pack.canvasHexObsidian}`
    );
  }

  const mcEmbedHtml = renderSeoHtmlDocument(baseHtml, resolveSeoRequest('/embed/minecraft'));
  assert.match(mcEmbedHtml, /<html\b[^>]*\bdata-game="minecraft"/);
  assert.ok(
    mcEmbedHtml.includes(
      'NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.'
    )
  );
  assert.doesNotMatch(mcEmbedHtml, /<[a-z][^>]*\sstyle\s*=/i);

  const rbxEmbedHtml = renderSeoHtmlDocument(baseHtml, resolveSeoRequest('/embed/roblox'));
  assert.match(rbxEmbedHtml, /<html\b[^>]*\bdata-game="roblox"/);
  assert.ok(
    rbxEmbedHtml.includes(
      'Requires 13+ account and 30,000 net earned R$ eligibility. Zero data is collected on minors.'
    )
  );
  assert.doesNotMatch(rbxEmbedHtml, /<[a-z][^>]*\sstyle\s*=/i);

  const notFoundHtml = renderSeoHtmlDocument(baseHtml, { notFound: true });
  assert.match(notFoundHtml, /<html\b[^>]*\blang="en"[^>]*\bdata-game="gta-6"/);
  assert.doesNotMatch(notFoundHtml, /<[a-z][^>]*\sstyle\s*=/i);
});

test('App.jsx syncs document data-game + theme-color and renders world kicker and legalNotice', () => {
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  assert.match(
    appSrc,
    /document\.documentElement\.setAttribute\(\s*['"]data-game['"]\s*,\s*activeGamePack\.id\s*\)/
  );
  assert.match(appSrc, /activeGamePack\.canvasHexPaper/);
  assert.match(appSrc, /activeGamePack\.canvasHexObsidian/);
  assert.match(
    appSrc,
    /<span className="game-world-kicker">\{activeGamePack\.themePersonaLabel\}<\/span>/
  );
  assert.match(
    appSrc,
    /<span className="source-legal-note">\{activeGamePack\.legalNotice\}<\/span>/
  );
});

test('gameStudios.css defines root Obsidian and Paper world token blocks across all 10 games', () => {
  const cssSrc = fs.readFileSync(path.join(ROOT, 'src/styles/gameStudios.css'), 'utf8');

  for (const gameId of GAME_IDS) {
    const pack = TOP_GAMES.find((g) => g.id === gameId);
    const obsidianBlock = cssSrc.match(
      new RegExp(`:root\\[data-game='${gameId}'\\][^{]*\\{([\\s\\S]*?)\\}`)
    );
    assert.ok(obsidianBlock, `Missing :root[data-game='${gameId}'] token block in gameStudios.css`);
    const obsidianBody = obsidianBlock[1];
    assert.match(obsidianBody, /--bg-canvas:\s*#[0-9a-f]{6}\s*;/i);
    assert.match(obsidianBody, /--bg-surface:\s*[^;]+;/);
    assert.match(obsidianBody, /--game-radius-card:\s*[^;]+;/);
    const obsHexMatch = obsidianBody.match(/--bg-canvas:\s*(#[0-9a-f]{6})\s*;/i);
    assert.equal(
      obsHexMatch?.[1].toUpperCase(),
      pack.canvasHexObsidian.toUpperCase(),
      `Obsidian --bg-canvas mismatch between gameStudios.css and TOP_GAMES for ${gameId}`
    );

    const paperBlock = cssSrc.match(
      new RegExp(`:root\\[data-theme='paper'\\]\\[data-game='${gameId}'\\][^{]*\\{([\\s\\S]*?)\\}`)
    );
    assert.ok(
      paperBlock,
      `Missing :root[data-theme='paper'][data-game='${gameId}'] token block in gameStudios.css`
    );
    const paperBody = paperBlock[1];
    assert.match(paperBody, /--bg-canvas:\s*#[0-9a-f]{6}\s*;/i);
    assert.match(paperBody, /--bg-surface:\s*[^;]+;/);
    assert.match(paperBody, /--game-radius-card:\s*[^;]+;/);
    const paperHexMatch = paperBody.match(/--bg-canvas:\s*(#[0-9a-f]{6})\s*;/i);
    assert.equal(
      paperHexMatch?.[1].toUpperCase(),
      pack.canvasHexPaper.toUpperCase(),
      `Paper --bg-canvas mismatch between gameStudios.css and TOP_GAMES for ${gameId}`
    );
  }
});

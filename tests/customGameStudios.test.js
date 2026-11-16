import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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

const WORLD_DEFS_PREFIX_BY_GAME = {
  'gta-6': 'gw-gta6-',
  'cod-warzone': 'gw-cod-',
  fortnite: 'gw-fn-',
  minecraft: 'gw-mc-',
  'ea-fc-27': 'gw-fc-',
  roblox: 'gw-rbx-',
  cs2: 'gw-cs2-',
  valorant: 'gw-val-',
  'apex-legends': 'gw-apex-',
  'gta-v': 'gw-gtav-',
};

/**
 * Bundles a JSX module in-memory with esbuild so node --test can render and
 * inspect live React markup across Obsidian and Paper themes without temp files.
 */
function loadJsxModule(relPath) {
  const pkgRequire = createRequire(path.join(ROOT, 'package.json'));
  const esbuild = pkgRequire('esbuild');
  const absEntry = path.join(ROOT, relPath);
  const result = esbuild.buildSync({
    entryPoints: [absEntry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    write: false,
    logLevel: 'silent',
  });
  const mod = { exports: {} };
  const fn = new Function('require', 'module', 'exports', result.outputFiles[0].text);
  fn(pkgRequire, mod, mod.exports);
  return mod.exports;
}

test('WORLD_ART_PACK_A/B and WORLD_STRIP_PACK_A/B cover all 10 games with valid theme-aware SVG components and strip labels', () => {
  const packA = loadJsxModule('src/components/games/worldArtPackA.jsx');
  const packB = loadJsxModule('src/components/games/worldArtPackB.jsx');
  const heroMod = loadJsxModule('src/components/games/GameWorldHero.jsx');
  const GameWorldHero = heroMod.default;
  const { GameWorldTopStrip } = heroMod;

  const expectedPackAGames = ['gta-6', 'cod-warzone', 'fortnite', 'minecraft', 'ea-fc-27'];
  const expectedPackBGames = ['roblox', 'cs2', 'valorant', 'apex-legends', 'gta-v'];

  assert.deepEqual(Object.keys(packA.WORLD_ART_PACK_A).sort(), [...expectedPackAGames].sort());
  assert.deepEqual(Object.keys(packA.WORLD_STRIP_PACK_A).sort(), [...expectedPackAGames].sort());
  assert.deepEqual(Object.keys(packB.WORLD_ART_PACK_B).sort(), [...expectedPackBGames].sort());
  assert.deepEqual(Object.keys(packB.WORLD_STRIP_PACK_B).sort(), [...expectedPackBGames].sort());

  const mergedArt = { ...packA.WORLD_ART_PACK_A, ...packB.WORLD_ART_PACK_B };
  const mergedStrips = { ...packA.WORLD_STRIP_PACK_A, ...packB.WORLD_STRIP_PACK_B };
  assert.equal(Object.keys(mergedArt).length, GAME_IDS.length);
  assert.equal(Object.keys(mergedStrips).length, GAME_IDS.length);

  for (const gameId of GAME_IDS) {
    assert.equal(typeof mergedArt[gameId], 'function', `Expected component function for ${gameId}`);
    const strip = mergedStrips[gameId];
    assert.ok(strip && typeof strip === 'object', `Missing strip metadata for ${gameId}`);
    for (const key of ['leftLabel', 'centerTicks', 'rightReadout']) {
      assert.equal(typeof strip[key], 'string', `Strip ${key} must be string for ${gameId}`);
      assert.ok(strip[key].trim().length > 0, `Strip ${key} must be non-empty for ${gameId}`);
    }

    const stripHtml = renderToStaticMarkup(React.createElement(GameWorldTopStrip, { gameId }));
    assert.match(stripHtml, new RegExp(`class="gw-top-strip"[^>]*data-strip-game="${gameId}"`));
    assert.match(stripHtml, /class="gw-strip-left"/);
    assert.match(stripHtml, /class="gw-strip-center"/);
    assert.match(stripHtml, /class="gw-strip-right"/);

    const obsHtml = renderToStaticMarkup(
      React.createElement(GameWorldHero, { game: { id: gameId }, theme: 'obsidian' })
    );
    const paperHtml = renderToStaticMarkup(
      React.createElement(GameWorldHero, { game: { id: gameId }, theme: 'paper' })
    );

    for (const [themeName, markup] of [
      ['obsidian', obsHtml],
      ['paper', paperHtml],
    ]) {
      assert.match(
        markup,
        new RegExp(`class="gw-hero-visual-col"[^>]*data-hero-game="${gameId}"`),
        `${themeName} hero wrapper missing data-hero-game for ${gameId}`
      );
      assert.match(
        markup,
        new RegExp(`class="gw-art-stage"[^>]*data-art-game="${gameId}"`),
        `${themeName} stage missing data-art-game for ${gameId}`
      );
      assert.match(
        markup,
        /<svg[^>]*class="gw-hero-svg"[^>]*viewBox="0 0 520 260"[^>]*role="presentation"[^>]*focusable="false"/,
        `${themeName} SVG missing viewBox/presentation attributes for ${gameId}`
      );
      assert.doesNotMatch(markup, /<style\b/i, `${themeName} SVG must not render <style> tags`);
      assert.doesNotMatch(markup, /\sstyle\s*=/i, `${themeName} SVG must not emit inline style= attrs`);
      assert.doesNotMatch(markup, /https?:\/\//i, `${themeName} SVG must not emit external URLs`);
    }

    assert.notEqual(
      obsHtml,
      paperHtml,
      `Obsidian and Paper SVG hero scenes should adapt visually for ${gameId}`
    );
  }
});

test('all 10 world SVGs declare globally unique gw-<game>-* <defs> IDs with zero collisions', () => {
  const heroMod = loadJsxModule('src/components/games/GameWorldHero.jsx');
  const GameWorldHero = heroMod.default;
  const globalIds = new Set();

  for (const gameId of GAME_IDS) {
    const expectedPrefix = WORLD_DEFS_PREFIX_BY_GAME[gameId];
    assert.ok(expectedPrefix, `Missing expected defs prefix for ${gameId}`);

    const markup = renderToStaticMarkup(
      React.createElement(GameWorldHero, { game: { id: gameId }, theme: 'obsidian' })
    );
    const defsMatch = markup.match(/<defs>([\s\S]*?)<\/defs>/);
    assert.ok(defsMatch, `Expected <defs> block in rendered SVG for ${gameId}`);

    const localIds = new Set();
    for (const match of defsMatch[1].matchAll(/\bid="([^"]+)"/g)) {
      const defId = match[1];
      assert.ok(
        defId.startsWith(expectedPrefix),
        `SVG <defs> id "${defId}" for ${gameId} must start with "${expectedPrefix}"`
      );
      assert.equal(localIds.has(defId), false, `Duplicate local SVG id "${defId}" in ${gameId}`);
      assert.equal(globalIds.has(defId), false, `Global SVG <defs> id collision: "${defId}"`);
      localIds.add(defId);
      globalIds.add(defId);
    }

    assert.ok(localIds.size > 0, `Expected at least one <defs> id for ${gameId}`);
    for (const refMatch of markup.matchAll(/url\(#([^)]+)\)/g)) {
      const refId = refMatch[1];
      assert.ok(localIds.has(refId), `SVG url(#${refId}) in ${gameId} must resolve to local <defs>`);
    }
  }
});

test('world graphic modules and gameWorldGraphics.css contain zero <style> tags and zero external URLs', () => {
  const checkedFiles = [
    'src/components/games/worldArtPackA.jsx',
    'src/components/games/worldArtPackB.jsx',
    'src/components/games/GameWorldHero.jsx',
    'src/styles/gameWorldGraphics.css',
  ];

  for (const rel of checkedFiles) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.doesNotMatch(src, /<style\b/i, `${rel} must not contain <style> tags`);
    assert.doesNotMatch(src, /https?:\/\//i, `${rel} must not contain external http(s):// URLs`);
  }
});

test('gameWorldGraphics.css styles all 10 data-world-hero archetypes and honors reduced-motion', () => {
  const cssSrc = fs.readFileSync(path.join(ROOT, 'src/styles/gameWorldGraphics.css'), 'utf8');

  for (const className of [
    '.gw-world-masthead',
    '.gw-top-strip',
    '.gw-masthead-split',
    '.gw-hero-visual-col',
    '.gw-art-stage',
    '.gw-hero-svg',
  ]) {
    assert.ok(cssSrc.includes(className), `Missing required class ${className} in gameWorldGraphics.css`);
  }

  for (const gameId of GAME_IDS) {
    assert.ok(
      cssSrc.includes(`[data-world-hero='${gameId}']`),
      `Missing [data-world-hero='${gameId}'] archetype style in gameWorldGraphics.css`
    );
  }

  const reducedMotionMatch = cssSrc.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\})\s*\}/
  );
  assert.ok(reducedMotionMatch, 'Missing @media (prefers-reduced-motion: reduce) block');
  assert.match(reducedMotionMatch[1], /animation:\s*none\s*!important/);
});

test('main.jsx imports gameWorldGraphics.css and App.jsx mounts GameWorldTopStrip + GameWorldHero while preserving legal notices', () => {
  const mainSrc = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8');
  const studiosImportIdx = mainSrc.indexOf("import './styles/gameStudios.css'");
  const graphicsImportIdx = mainSrc.indexOf("import './styles/gameWorldGraphics.css'");
  assert.ok(studiosImportIdx !== -1, 'main.jsx must import gameStudios.css');
  assert.ok(graphicsImportIdx > studiosImportIdx, 'main.jsx must import gameWorldGraphics.css after gameStudios.css');

  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  assert.match(
    appSrc,
    /import GameWorldHero,\s*\{\s*GameWorldTopStrip\s*\}\s*from\s*['"]\.\/components\/games\/GameWorldHero\.jsx['"]/
  );
  assert.match(appSrc, /className="consumer-masthead gw-world-masthead"/);
  assert.match(appSrc, /data-world-hero=\{activeGamePack\.id\}/);
  assert.match(appSrc, /<GameWorldTopStrip gameId=\{activeGamePack\.id\} \/>/);
  assert.match(appSrc, /className="consumer-masthead-top gw-masthead-split"/);
  assert.match(appSrc, /<GameWorldHero game=\{activeGamePack\} theme=\{deckState\.theme\} \/>/);
  assert.match(appSrc, /<span className="game-world-kicker">\{activeGamePack\.themePersonaLabel\}<\/span>/);
  assert.match(appSrc, /<span className="source-legal-note">\{activeGamePack\.legalNotice\}<\/span>/);

  const mcPack = TOP_GAMES.find((g) => g.id === 'minecraft');
  const rbxPack = TOP_GAMES.find((g) => g.id === 'roblox');
  assert.ok(
    mcPack.legalNotice.includes(
      'NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.'
    )
  );
  assert.ok(
    rbxPack.legalNotice.includes(
      'Requires 13+ account and 30,000 net earned R$ eligibility. Zero data is collected on minors.'
    )
  );
});

test('all 10 TOP_GAMES packs define typographyProfile with 10 globally unique displayFont names', () => {
  const displayFonts = new Set();

  for (const gameId of GAME_IDS) {
    const pack = TOP_GAMES.find((g) => g.id === gameId);
    assert.ok(pack, `Missing TOP_GAMES pack for ${gameId}`);
    assert.ok(
      pack.typographyProfile && typeof pack.typographyProfile === 'object',
      `Missing typographyProfile for ${gameId}`
    );
    for (const key of ['displayFont', 'bodyFont', 'monoFont', 'styleLabel']) {
      assert.equal(
        typeof pack.typographyProfile[key],
        'string',
        `typographyProfile.${key} must be a string for ${gameId}`
      );
      assert.ok(
        pack.typographyProfile[key].trim().length > 0,
        `typographyProfile.${key} must be non-empty for ${gameId}`
      );
    }
    displayFonts.add(pack.typographyProfile.displayFont);
  }

  assert.equal(
    displayFonts.size,
    GAME_IDS.length,
    'Every game must define a globally unique displayFont (expected 10)'
  );
});

test('every referenced /fonts/*.woff2 in deck.css and gameTypography.css exists in public/fonts with wOF2 magic bytes and OFL-LICENSES.txt', () => {
  const deckCss = fs.readFileSync(path.join(ROOT, 'src/styles/deck.css'), 'utf8');
  const typoCss = fs.readFileSync(path.join(ROOT, 'src/styles/gameTypography.css'), 'utf8');
  const fontUrlSet = new Set();

  for (const cssSrc of [deckCss, typoCss]) {
    for (const match of cssSrc.matchAll(/url\(['"]?(\/fonts\/[^'")?#]+\.woff2)['"]?\)/gi)) {
      fontUrlSet.add(match[1]);
    }
  }

  assert.ok(fontUrlSet.size >= 42, `Expected at least 42 referenced .woff2 fonts, found ${fontUrlSet.size}`);

  const fontsDir = path.join(ROOT, 'public/fonts');
  for (const fontUrl of fontUrlSet) {
    const fileName = fontUrl.replace(/^\/fonts\//, '');
    const filePath = path.join(fontsDir, fileName);
    assert.equal(fs.existsSync(filePath), true, `Missing referenced font asset: ${fontUrl}`);
    const buf = fs.readFileSync(filePath);
    assert.ok(buf.length >= 4, `Font asset ${fontUrl} is truncated`);
    assert.equal(
      buf.readUInt32BE(0),
      0x774f4632,
      `Font asset ${fontUrl} must begin with wOF2 magic bytes (0x774F4632)`
    );
  }

  const licensesPath = path.join(fontsDir, 'OFL-LICENSES.txt');
  assert.equal(fs.existsSync(licensesPath), true, 'Missing public/fonts/OFL-LICENSES.txt');
  const licenseText = fs.readFileSync(licensesPath, 'utf8');
  assert.ok(licenseText.trim().length > 0, 'OFL-LICENSES.txt must be non-empty');
  assert.match(licenseText, /SIL OPEN FONT LICENSE/i);
});

test('gameTypography.css covers all 10 worlds cleanly with zero external URLs and is imported in main.jsx', () => {
  const typoCss = fs.readFileSync(path.join(ROOT, 'src/styles/gameTypography.css'), 'utf8');
  assert.doesNotMatch(typoCss, /<style\b/i, 'gameTypography.css must not contain <style> tags');
  assert.doesNotMatch(typoCss, /https?:\/\//i, 'gameTypography.css must not contain external http(s):// URLs');
  assert.doesNotMatch(typoCss, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  assert.match(typoCss, /font-display:\s*swap/);

  for (const gameId of GAME_IDS) {
    const pack = TOP_GAMES.find((g) => g.id === gameId);
    const ruleBlock = typoCss.match(
      new RegExp(`:root\\[data-game='${gameId}'\\][^{]*\\{([\\s\\S]*?)\\}`)
    );
    assert.ok(ruleBlock, `Missing :root[data-game='${gameId}'] typography token block`);
    const body = ruleBlock[1];
    assert.match(body, /--font-display:\s*[^;]+;/);
    assert.match(body, /--font-sans:\s*[^;]+;/);
    assert.match(body, /--font-mono:\s*[^;]+;/);
    assert.ok(
      body.includes(`'${pack.typographyProfile.displayFont}'`),
      `gameTypography.css --font-display for ${gameId} should include '${pack.typographyProfile.displayFont}'`
    );
    assert.ok(
      body.includes(`'${pack.typographyProfile.bodyFont}'`),
      `gameTypography.css --font-sans for ${gameId} should include '${pack.typographyProfile.bodyFont}'`
    );
    assert.ok(
      body.includes(`'${pack.typographyProfile.monoFont}'`),
      `gameTypography.css --font-mono for ${gameId} should include '${pack.typographyProfile.monoFont}'`
    );
  }

  const mainSrc = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8');
  const graphicsImportIdx = mainSrc.indexOf("import './styles/gameWorldGraphics.css'");
  const typoImportIdx = mainSrc.indexOf("import './styles/gameTypography.css'");
  assert.ok(typoImportIdx !== -1, 'main.jsx must import gameTypography.css');
  assert.ok(typoImportIdx > graphicsImportIdx, 'main.jsx must import gameTypography.css after gameWorldGraphics.css');
});

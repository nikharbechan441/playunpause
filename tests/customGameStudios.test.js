import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

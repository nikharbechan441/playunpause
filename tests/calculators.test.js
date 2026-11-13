import assert from 'node:assert/strict';
import test from 'node:test';
import { generateQrMatrix } from '../src/utils/qrCode.js';
import { gta6Pack } from '../src/data/games/gta6Pack.js';
import { resolveGameIdFromSlug, COD_MW4_WEAPONS, TOP_GAMES } from '../src/data/games/allGames.js';
import {
  calcNetherCoords,
  checkPortalCollision,
  calcFc27Tax,
  calcSbcSquadRating,
  calcCs2Economy,
  calcRobloxDevEx,
  calcValorantRrClimb,
  calcApexRankedLadder,
  getFreeApexLevelPacks,
} from '../src/utils/gameMath.js';

test('generateQrMatrix produces deterministic ISO square matrix with finder patterns', () => {
  const url = 'https://playunpause.com/#sync=UP-ABCD1234';
  const matrix = generateQrMatrix(url);
  assert.ok(Array.isArray(matrix));
  assert.ok(matrix.length >= 25 && matrix.length % 2 === 1);
  for (const row of matrix) {
    assert.equal(row.length, matrix.length);
    for (const bit of row) {
      assert.ok(bit === 0 || bit === 1);
    }
  }
  // Top-left 7x7 finder corners must be dark (1)
  assert.equal(matrix[0][0], 1);
  assert.equal(matrix[0][6], 1);
  assert.equal(matrix[6][0], 1);
  assert.equal(matrix[1][1], 0);
  // Deterministic across repeated calls
  assert.deepEqual(generateQrMatrix(url), matrix);
});

test('GTA VI pack defines 6 balanced consoles (3 Xbox @ 225GB + 3 PS5 @ 212GB) and 4 route waypoints', () => {
  assert.equal(gta6Pack.consoles.length, 6);
  const xbox = gta6Pack.consoles.filter((c) => c.platform === 'xbox');
  const ps5 = gta6Pack.consoles.filter((c) => c.platform === 'ps5');
  assert.equal(xbox.length, 3);
  assert.equal(ps5.length, 3);
  xbox.forEach((c) => assert.equal(c.installGb, 225));
  ps5.forEach((c) => assert.equal(c.installGb, 212));
  assert.equal(gta6Pack.dayOnePatchGb, 35);
  assert.equal(gta6Pack.routeWaypoints.length, 4);
});

test('resolveGameIdFromSlug preserves legacy FC 25 aliases and maps MW4 / FC 27 canonically', () => {
  assert.equal(resolveGameIdFromSlug('ea-fc-27'), 'ea-fc-27');
  assert.equal(resolveGameIdFromSlug('ea-fc-25'), 'ea-fc-27');
  assert.equal(resolveGameIdFromSlug('fc25'), 'ea-fc-27');
  assert.equal(resolveGameIdFromSlug('fifa'), 'ea-fc-27');
  assert.equal(resolveGameIdFromSlug('mw4'), 'cod-warzone');
  assert.equal(resolveGameIdFromSlug('cod-mw4'), 'cod-warzone');
  assert.ok(COD_MW4_WEAPONS.length >= 10);
  assert.ok(TOP_GAMES.some((g) => g.id === 'ea-fc-27'));
});

test('Minecraft Math.floor handles negative Overworld coordinates (-20 -> -3) + .mca regions & collision', () => {
  const res = calcNetherCoords(-20, 64, -520, 'toNether');
  assert.equal(res.output.x, -3);
  assert.equal(res.output.z, -65);
  assert.equal(res.chunk.cx, -2);
  assert.equal(res.chunk.rx, -1);

  const farPortals = checkPortalCollision({ x: 0, y: 64, z: 0 }, { x: 400, y: 64, z: 400 });
  assert.equal(farPortals.conflictRisk, false);
});

test('EA FC 27 11-player excess SBC solver and step-snapped break-even sell', () => {
  const sbc = calcSbcSquadRating([86, 86, 85, 85, 85, 84, 84, 84, 84, 84, 84]);
  assert.equal(sbc.rating, 85);

  const tax = calcFc27Tax({ buyCoins: 50000, sellCoins: 52750, quantity: 2 });
  assert.equal(tax.minBreakEvenSnapped, 53000);
  assert.equal(tax.taxPerCard, 2638);
});

test('CS2 MR12 loss step-down and Roblox 3 rates enforce exact economy rules', () => {
  const cs = calcCs2Economy({ cash: 2200, lossLevel: 3, side: 'CT' });
  assert.equal(cs.nextIfWinLvl, 2);
  assert.equal(cs.nextBonusOnLoss, 3400);

  const usDirect = calcRobloxDevEx({ grossRobux: 100000, rateId: 'us-direct' });
  assert.equal(usDirect.creatorNetRobux, 70000);
  assert.equal(usDirect.eligible, true);
  assert.equal(Number(usDirect.usdPayout.toFixed(2)), 378.0);
});

test('Valorant RR EV and Apex Prestige 0-3 packs + Ranked ladder work accurately', () => {
  const val = calcValorantRrClimb({ currentRr: 60, winRatePct: 60, avgWinRr: 20, avgLossRr: 15 });
  assert.equal(val.positiveClimb, true);
  assert.equal(val.evPerMatch, 6);
  assert.equal(val.matchesToPromote, 7);

  assert.equal(getFreeApexLevelPacks(500, 3), 544);
  const rp = calcApexRankedLadder({ currentRp: 14500, targetTierId: 'diamond', avgNetRpPerMatch: 100 });
  assert.equal(rp.rpGap, 500);
  assert.equal(rp.matchesNeeded, 5);
});

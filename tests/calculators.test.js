import assert from 'node:assert/strict';
import test from 'node:test';
import { generateQrMatrix, MAX_QR_UTF8_BYTES } from '../src/utils/qrCode.js';
import { computeStorageDiagnosis, renderStorageReceiptCanvas, renderSquadSplitCanvas } from '../src/utils/canvasCards.js';
import { renderStudioSpecCardCanvas } from '../src/utils/shareCardEngine.js';
import { buildCrewFromCuts } from '../src/utils/shareUrlHelpers.js';
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

test('ISO 18004 QR Strips A & B agree, decode payload accurately, and enforce 78-byte UTF-8 ceiling', () => {
  const url = 'https://playunpause.com/#sync=UP-ABCD1234';
  const m = generateQrMatrix(url);
  const size = m.length;

  // Read Strip A bits (0..14) per ISO 18004: col 8 top-down (0..5,7,8), row 8 right-to-left (7,5..0)
  let stripA = 0;
  const stripACoords = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8], [8, 7],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  ];
  stripACoords.forEach(([r, c], idx) => {
    stripA |= (m[r][c] & 1) << idx;
  });

  // Read Strip B bits (0..14): row 8 right-to-left (size-1..size-8), col 8 top-down (size-7..size-1)
  let stripB = 0;
  for (let i = 0; i < 8; i += 1) stripB |= (m[8][size - 1 - i] & 1) << i;
  for (let i = 8; i < 15; i += 1) stripB |= (m[size - 15 + i][8] & 1) << i;

  assert.equal(stripA, stripB, 'QR format Strip A and Strip B must carry identical ISO bits');
  assert.equal(m[size - 8][8], 1, 'Dark module must sit at (size-8, 8)');

  // Unmask BCH format word to verify EC Level L (0b01) & mask pattern
  const unmaskedFmt = stripA ^ 0x5412;
  const dataBits = unmaskedFmt >>> 10;
  assert.equal(dataBits >>> 3, 0b01, 'EC Level must be L (01)');
  const maskId = dataBits & 0b111;
  const maskFns = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  // Mark function modules to reverse zig-zag bitstream
  const isFunc = Array.from({ length: size }, () => Array(size).fill(false));
  for (let r = 0; r <= 8; r += 1) {
    for (let c = 0; c <= 8; c += 1) isFunc[r][c] = true;
    for (let c = size - 8; c < size; c += 1) isFunc[r][c] = true;
  }
  for (let r = size - 8; r < size; r += 1) {
    for (let c = 0; c <= 8; c += 1) isFunc[r][c] = true;
  }
  for (let i = 8; i < size - 8; i += 1) {
    isFunc[6][i] = true;
    isFunc[i][6] = true;
  }
  const alignCenters = size === 25 ? [6, 18] : size === 29 ? [6, 22] : [6, 26];
  for (const cr of alignCenters) {
    for (const cc of alignCenters) {
      if ((cr <= 8 && cc <= 8) || (cr <= 8 && cc >= size - 9) || (cr >= size - 9 && cc <= 8)) continue;
      for (let r = cr - 2; r <= cr + 2; r += 1) {
        for (let c = cc - 2; c <= cc + 2; c += 1) isFunc[r][c] = true;
      }
    }
  }

  const decodedBits = [];
  let dirUp = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < size; step += 1) {
      const r = dirUp ? size - 1 - step : step;
      for (const offset of [0, 1]) {
        const c = col - offset;
        if (!isFunc[r][c]) {
          decodedBits.push(m[r][c] ^ (maskFns[maskId](r, c) ? 1 : 0));
        }
      }
    }
    dirUp = !dirUp;
  }
  const readInt = (start, len) => {
    let val = 0;
    for (let i = 0; i < len; i += 1) val = (val << 1) | decodedBits[start + i];
    return val;
  };
  assert.equal(readInt(0, 4), 0b0100, 'Byte mode indicator');
  const byteLen = readInt(4, 8);
  assert.equal(byteLen, Buffer.byteLength(url, 'utf8'));
  const outBytes = [];
  for (let i = 0; i < byteLen; i += 1) outBytes.push(readInt(12 + i * 8, 8));
  assert.equal(Buffer.from(outBytes).toString('utf8'), url);

  // Max UTF-8 capacity boundaries (78 bytes allowed, >= 79 bytes throws RangeError cleanly)
  assert.equal(MAX_QR_UTF8_BYTES, 78);
  assert.equal(generateQrMatrix('a'.repeat(78)).length, 33);
  assert.throws(() => generateQrMatrix('a'.repeat(79)), RangeError);
  // Multi-byte UTF-8 test: 40 chars of 'é' = 80 UTF-8 bytes (< 78 chars!) must still throw cleanly
  assert.throws(() => generateQrMatrix('é'.repeat(40)), RangeError);
});

test('Heist crew slicer & Canvas diagnosis/headless guards handle 2/3-player splits and exact GB totals', () => {
  const duo = buildCrewFromCuts([55, 45]);
  assert.equal(duo.length, 2);
  assert.deepEqual(duo.map((m) => m.pct), [55, 45]);

  const trio = buildCrewFromCuts([40, 30, 30]);
  assert.equal(trio.length, 3);
  assert.deepEqual(trio.map((m) => m.pct), [40, 30, 30]);

  const badSum = buildCrewFromCuts([60, 60]);
  assert.equal(badSum.length, 4);

  const codPlusNba = gta6Pack.commonInstalledGames.filter((g) => g.id === 'cod-hq' || g.id === 'nba-2k');
  assert.equal(computeStorageDiagnosis('ps5-base', codPlusNba, true), 'STATUS: HEAVY CLEAR (+293 GB RECLAIMED)');

  // Headless Node guards return null cleanly without crashing
  assert.equal(renderStorageReceiptCanvas({ consoleName: 'PS5', consoleId: 'ps5-base', usableGb: 667, installSizeGb: 212, deletedGames: [], alreadyFreeGb: 200, mbps: 120, downloadTimeText: '4h', nzStatusLabel: '5d' }), null);
  assert.equal(renderSquadSplitCanvas({ jobTitle: 'Duo', grossDollars: 2450000, supportFeePct: 12, supportFeeDollars: 294000, netPoolDollars: 2156000, crewRows: duo }), null);
  assert.equal(renderStudioSpecCardCanvas({ gameTitle: 'Minecraft', toolTitle: 'Portal', heroLabel: 'NETHER', heroValue: '-3750000 / 64 / 3750000', heroSub: 'Chunk 12, 12' }), null);
});

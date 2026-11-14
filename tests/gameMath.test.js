import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calcNetherCoords,
  checkPortalCollision,
  triangulateStronghold,
  calcCodTtk,
  calcCs2Economy,
  calcValorantEconomy,
  calcFc27Tax,
  calcSbcSquadRating,
  calcRobloxDevEx,
  calcRobloxMinSalesFor30k,
  calcFortniteXp,
  getFreeApexLevelPacks,
  calcGtaOnlineHeist,
} from '../src/utils/gameMath.js';

test('Minecraft uses Math.floor (never Math.round) on negative & positive coordinates', () => {
  const pos = calcNetherCoords(1023, 64, 799, 'toNether');
  assert.deepEqual(pos.output, { x: 127, y: 64, z: 99 });

  const neg = calcNetherCoords(-1, 64, -9, 'toNether');
  assert.deepEqual(neg.output, { x: -1, y: 64, z: -2 });

  const rev = calcNetherCoords(10, 70, -5, 'toOverworld');
  assert.deepEqual(rev.output, { x: 80, y: 70, z: -40 });

  const collision = checkPortalCollision({ x: 100, y: 64, z: 100 }, { x: 140, y: 64, z: 120 });
  assert.equal(collision.conflictRisk, true);
});

test('Minecraft Stronghold 2-Throw triangulation locates intersection', () => {
  const res = triangulateStronghold(0, 0, -45, 200, 0, 45);
  assert.equal(res.valid, true);
  assert.equal(res.x, 100);
  assert.equal(res.z, 100);
});

test('CoD TTK honors open-bolt delay and mixed headshots', () => {
  const body = calcCodTtk({ hp: 300, damage: 30, rpm: 600, headshots: 0, openBoltMs: 0 });
  assert.equal(body.shotsToKill, 10);
  assert.equal(body.ttkMs, 900);

  const lmgBolt = calcCodTtk({ hp: 300, damage: 30, rpm: 600, headshots: 0, openBoltMs: 50 });
  assert.equal(lmgBolt.ttkMs, 950);
});

test('CS2 Valve MR12 loss bonus ladder & CT/T buy costs', () => {
  const pistolLoss = calcCs2Economy({ cash: 1900, lossLevel: 1, side: 'CT' });
  assert.equal(pistolLoss.currentBonus, 1900);
  assert.equal(pistolLoss.nextBonusOnLoss, 2400);
  assert.equal(pistolLoss.fullBuyNeed, 5100);

  const maxLoss = calcCs2Economy({ cash: 1400, lossLevel: 4, side: 'T', bombPlanted: true });
  assert.equal(maxLoss.nextBonusOnLoss, 4200); // $3400 + $800 plant
});

test('Valorant economy matrix uses real Shield & Rifle costs', () => {
  const res = calcValorantEconomy({ credits: 3900, weaponCost: 2900, armorCost: 1000, utilCost: 0, lossStreak: 0 });
  assert.equal(res.canAfford, true);
  assert.equal(res.leftover, 0);
  assert.equal(res.nextRoundMinOnLoss, 1900);
});

test('FC 27 5% tax & snapped EA break-even price prevent coin loss', () => {
  const res = calcFc27Tax({ buyCoins: 100000, sellCoins: 105000, quantity: 1 });
  assert.equal(res.taxPerCard, 5250);
  assert.equal(res.profitPerCard, -250); // Real trap caught!
  assert.equal(res.minBreakEvenSnapped, 106000); // Snaps ceil(100000/0.95)=105264 to legal 1k step

  const sbc = calcSbcSquadRating([85, 85, 85, 85, 84, 84, 84, 84, 84, 84, 84]);
  assert.equal(sbc.rating, 84);
});

test('Roblox DevEx respects 30,000 R$ eligibility & 30% market cut', () => {
  const below = calcRobloxDevEx({ grossRobux: 30000 }); // nets 21,000
  assert.equal(below.creatorNetRobux, 21000);
  assert.equal(below.eligible, false);

  const exact = calcRobloxDevEx({ grossRobux: 42858 }); // 30,001 R$
  assert.equal(exact.eligible, true);
  assert.equal(Math.round(exact.usdPayout), 114);
});

test('Fortnite XP handles target <= current safely and Apex computes level packs', () => {
  const done = calcFortniteXp({ currentLevel: 140, targetLevel: 100, daysRemaining: 10 });
  assert.equal(done.alreadyDone, true);
  assert.equal(done.levelsLeft, 0);

  assert.equal(getFreeApexLevelPacks(500, 0), 199);
});

test('GTA Online enforces mandatory 15% crew share floor', () => {
  const duo = calcGtaOnlineHeist({ primaryValue: 1000000, secondaryValue: 400000, players: 2, hostPct: 95, hardMode: false });
  assert.equal(duo.maxHostPct, 85);
  assert.equal(duo.hostPct, 85);
  assert.equal(duo.crewPayouts[0].pct, 15);
});

test('Regression: Stronghold divergent rays, CoD headMult, CS2 cashIfSaveAll, Valorant/Roblox, & Apex Prestige monotonicity', () => {
  // Divergent Stronghold rays (intersecting behind throw points) must be rejected
  const behind = triangulateStronghold(0, 0, 135, 200, 0, -135);
  assert.equal(behind.valid, false);

  // CoD headMult invalid/non-positive values sanitize safely without NaN or 0 head damage
  const badMult = calcCodTtk({ hp: 300, damage: 30, rpm: 600, headshots: 2, headMult: 'NaN' });
  assert.equal(Number.isFinite(badMult.ttkMs), true);
  assert.equal(badMult.headDmg, Math.round(30 * 1.32));
  const zeroMult = calcCodTtk({ hp: 300, damage: 30, rpm: 600, headshots: 1, headMult: -2 });
  assert.equal(zeroMult.headDmg, 30);

  // CS2 cashIfSaveAll reflects nextBonusOnLoss (+1 loss tier & T-side plant)
  const ctDefault = calcCs2Economy({ cash: 3200, lossLevel: 1, side: 'CT', bombPlanted: false });
  assert.equal(ctDefault.cashIfSaveAll, 5600);
  const tPlant = calcCs2Economy({ cash: 3200, lossLevel: 1, side: 'T', bombPlanted: true });
  assert.equal(tPlant.cashIfSaveAll, 6400);

  // Valorant economy rejects NaN gear cost & tracks !canAfford cleanly
  const opNoBuy = calcValorantEconomy({ credits: 3900, weaponCost: 4700, armorCost: 1000, utilCost: 0, lossStreak: 1 });
  assert.equal(opNoBuy.canAfford, false);
  assert.equal(opNoBuy.leftover, 3900);
  const nanVal = calcValorantEconomy({ credits: 3600, weaponCost: NaN, armorCost: 0, utilCost: 0, lossStreak: NaN });
  assert.equal(Number.isFinite(nanVal.totalBuy), true);

  // Roblox 30K sales requirement scales inversely with group split
  assert.equal(calcRobloxMinSalesFor30k(100), 42858);
  assert.equal(calcRobloxMinSalesFor30k(50), 85715);
  assert.equal(calcRobloxDevEx({ grossRobux: 50000, groupSplitPct: 50 }).minSalesFor30k, 85715);

  // Apex Prestige 0-3 packs must be monotonically non-decreasing with zero drops across rollovers
  let prev = -1;
  for (let prestige = 0; prestige <= 3; prestige += 1) {
    for (let level = 1; level <= 500; level += 1) {
      const packs = getFreeApexLevelPacks(level, prestige);
      assert.ok(packs >= prev, `Apex pack drop at prestige=${prestige} level=${level}: ${prev} -> ${packs}`);
      prev = packs;
    }
  }
  assert.equal(getFreeApexLevelPacks(500, 0), 199);
  assert.equal(getFreeApexLevelPacks(1, 1), 199);
  assert.equal(getFreeApexLevelPacks(500, 1), 314);
  assert.equal(getFreeApexLevelPacks(1, 2), 314);
  assert.equal(getFreeApexLevelPacks(500, 2), 429);
  assert.equal(getFreeApexLevelPacks(1, 3), 429);
  assert.equal(getFreeApexLevelPacks(500, 3), 544);
});

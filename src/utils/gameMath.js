/**
 * Pure domain calculation helpers for Unpause Top-10 Game Suite.
 * Zero DOM dependencies so every formula runs in Vite/React AND node --test.
 */

export function parseSafeNum(val, fallback = 0) {
  if (val === '' || val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function clampNum(val, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Minecraft Overworld <-> Nether 8:1 linker + 3D collision & chunk calculator
 * Uses Math.floor (exact game integer rule, never Math.round).
 */
export function calcNetherCoords(xVal, yVal, zVal, direction = 'toNether') {
  const x = parseSafeNum(xVal, 0);
  const y = clampNum(parseSafeNum(yVal, 64), -64, 320);
  const z = parseSafeNum(zVal, 0);

  if (direction === 'toNether') {
    const outX = Math.floor(x / 8);
    const outZ = Math.floor(z / 8);
    const cx = Math.floor(x / 16);
    const cz = Math.floor(z / 16);
    const ocx = Math.floor(outX / 16);
    const ocz = Math.floor(outZ / 16);
    return {
      input: { x, y, z },
      output: { x: outX, y, z: outZ },
      chunk: {
        cx,
        cz,
        rx: Math.floor(cx / 32),
        rz: Math.floor(cz / 32),
        lx: ((Math.floor(x) % 16) + 16) % 16,
        lz: ((Math.floor(z) % 16) + 16) % 16,
      },
      outChunk: {
        cx: ocx,
        cz: ocz,
        rx: Math.floor(ocx / 32),
        rz: Math.floor(ocz / 32),
        lx: ((outX % 16) + 16) % 16,
        lz: ((outZ % 16) + 16) % 16,
      },
      netherYWarning: y < 28 ? 'Below Lava Sea (Y=31) — dig carefully in Nether' : y > 120 ? 'Near Nether Bedrock Roof (Y=128)' : 'Safe build band (Y=32–118)',
    };
  }

  const outX = Math.floor(x * 8);
  const outZ = Math.floor(z * 8);
  const cx = Math.floor(x / 16);
  const cz = Math.floor(z / 16);
  const ocx = Math.floor(outX / 16);
  const ocz = Math.floor(outZ / 16);
  return {
    input: { x, y, z },
    output: { x: outX, y, z: outZ },
    chunk: {
      cx,
      cz,
      rx: Math.floor(cx / 32),
      rz: Math.floor(cz / 32),
      lx: ((Math.floor(x) % 16) + 16) % 16,
      lz: ((Math.floor(z) % 16) + 16) % 16,
    },
    outChunk: {
      cx: ocx,
      cz: ocz,
      rx: Math.floor(ocx / 32),
      rz: Math.floor(ocz / 32),
      lx: ((outX % 16) + 16) % 16,
      lz: ((outZ % 16) + 16) % 16,
    },
    netherYWarning: 'Overworld exit uses closest valid terrain within 128 blocks',
  };
}

export function checkPortalCollision(aOverworld, bOverworld) {
  const ax = Math.floor(parseSafeNum(aOverworld.x, 0) / 8);
  const ay = parseSafeNum(aOverworld.y, 64);
  const az = Math.floor(parseSafeNum(aOverworld.z, 0) / 8);

  const bx = Math.floor(parseSafeNum(bOverworld.x, 0) / 8);
  const by = parseSafeNum(bOverworld.y, 64);
  const bz = Math.floor(parseSafeNum(bOverworld.z, 0) / 8);

  const netherHorizontalDist = Math.hypot(bx - ax, bz - az);
  const nether3dDist = Math.hypot(bx - ax, by - ay, bz - az);
  const overworldChebyshevXZ = Math.max(
    Math.abs(parseSafeNum(bOverworld.x, 0) - parseSafeNum(aOverworld.x, 0)),
    Math.abs(parseSafeNum(bOverworld.z, 0) - parseSafeNum(aOverworld.z, 0))
  );

  const conflictRisk = netherHorizontalDist < 16 || overworldChebyshevXZ < 128;
  return {
    netherA: { x: ax, y: ay, z: az },
    netherB: { x: bx, y: by, z: bz },
    netherHorizontalDist: Number(netherHorizontalDist.toFixed(1)),
    nether3dDist: Number(nether3dDist.toFixed(1)),
    overworldGap: Math.round(overworldChebyshevXZ),
    conflictRisk,
    verdict: conflictRisk
      ? 'LINK RISK — Portals share the 128-block Overworld / 16-block Nether search radius. Match exact divided X/Y/Z frames inside both dimensions!'
      : 'CLEAR SEPARATION — Safe outside neighbor portal search range.',
  };
}

/**
 * Minecraft Stronghold 2-Throw Eye of Ender Intersection
 * Facing angle convention: 0 = +Z (South), -90 = +X (East), +90 = -X (West), +-180 = -Z (North).
 */
export function triangulateStronghold(x1Val, z1Val, deg1Val, x2Val, z2Val, deg2Val) {
  const x1 = parseSafeNum(x1Val, 0);
  const z1 = parseSafeNum(z1Val, 0);
  const x2 = parseSafeNum(x2Val, 200);
  const z2 = parseSafeNum(z2Val, 0);
  const a1 = (parseSafeNum(deg1Val, 0) * Math.PI) / 180;
  const a2 = (parseSafeNum(deg2Val, -45) * Math.PI) / 180;

  const dx1 = -Math.sin(a1);
  const dz1 = Math.cos(a1);
  const dx2 = -Math.sin(a2);
  const dz2 = Math.cos(a2);

  const denom = dx1 * dz2 - dz1 * dx2;
  if (Math.abs(denom) < 0.025) {
    return { valid: false, reason: 'Angles too parallel — walk 150+ blocks sideways before Throw #2' };
  }

  const t1 = ((x2 - x1) * dz2 - (z2 - z1) * dx2) / denom;
  const t2 = ((x2 - x1) * dz1 - (z2 - z1) * dx1) / denom;
  if (!(t1 > 0 && t2 > 0)) {
    return { valid: false, reason: 'Rays diverge behind throw points — stand sideways and throw facing forward' };
  }
  const ix = Math.round(x1 + t1 * dx1);
  const iz = Math.round(z1 + t1 * dz1);
  const distFromThrow2 = Math.round(Math.hypot(ix - x2, iz - z2));

  return {
    valid: true,
    x: ix,
    z: iz,
    netherX: Math.floor(ix / 8),
    netherZ: Math.floor(iz / 8),
    distFromThrow2,
  };
}

/**
 * CoD MW4 / Warzone Presets & TTK Simulation
 */
export const COD_PRESETS = [
  { id: 'custom', name: 'Custom Stats', category: 'Manual', damage: 34, rpm: 820, headMult: 1.32, openBoltMs: 0 },
  { id: 'mw4-smg', name: 'Striker / Sub CQB', category: 'SMG · 0–14m', damage: 36, rpm: 857, headMult: 1.28, openBoltMs: 0 },
  { id: 'mw4-ar', name: 'M4A1 Tactical Rifle', category: 'AR · Mid-Range', damage: 32, rpm: 750, headMult: 1.35, openBoltMs: 0 },
  { id: 'mw4-heavy-ar', name: 'Lachmann / MCW Beam', category: 'AR · Long-Range', damage: 39, rpm: 632, headMult: 1.38, openBoltMs: 0 },
  { id: 'mw4-lmg', name: 'Pulemyot Support LMG', category: 'LMG · Open-Bolt', damage: 44, rpm: 600, headMult: 1.3, openBoltMs: 50 },
];

export function calcCodTtk({ hp = 300, damage = 34, rpm = 820, headshots = 0, headMult = 1.32, openBoltMs = 0 }) {
  const safeHp = clampNum(parseSafeNum(hp, 300), 1, 1000);
  const safeDmg = clampNum(parseSafeNum(damage, 34), 1, 500);
  const safeRpm = clampNum(parseSafeNum(rpm, 820), 60, 2000);
  const hsCount = clampNum(parseSafeNum(headshots, 0), 0, 20);
  const safeHeadMult = clampNum(parseSafeNum(headMult, 1.32), 1, 10);
  const boltDelay = Math.max(0, parseSafeNum(openBoltMs, 0));

  const headDmg = Math.round(safeDmg * safeHeadMult);
  let remainingHp = safeHp;
  let totalShots = 0;

  // Apply realistic headshots from shot 1..hsCount
  for (let i = 0; i < hsCount && remainingHp > 0; i += 1) {
    remainingHp -= headDmg;
    totalShots += 1;
  }
  if (remainingHp > 0) {
    totalShots += Math.ceil(remainingHp / safeDmg);
  }

  const fireIntervalMs = 60000 / safeRpm;
  const ttkMs = Math.round(Math.max(0, totalShots - 1) * fireIntervalMs + boltDelay);
  const dps = Math.round((safeDmg * safeRpm) / 60);

  return {
    shotsToKill: totalShots,
    ttkMs,
    dps,
    headDmg,
    fireIntervalMs: Number(fireIntervalMs.toFixed(1)),
  };
}

/**
 * CS2 Valve MR12 Loss Bonus State Machine
 * Loss bonus levels: 0 = $1,400 (reset / base), 1 = $1,900 (pistol loss / 1 loss), 2 = $2,400, 3 = $2,900, 4 = $3,400.
 * Winning 1 round steps loss level down by -1 (min 0).
 */
export const CS2_LOSS_LADDER = [1400, 1900, 2400, 2900, 3400];

export function calcCs2Economy({ cash = 3200, lossLevel = 1, side = 'CT', bombPlanted = false }) {
  const curCash = clampNum(parseSafeNum(cash, 0), 0, 16000);
  const lvl = clampNum(Math.round(parseSafeNum(lossLevel, 1)), 0, 4);
  const currentBonus = CS2_LOSS_LADDER[lvl];
  const nextIfLossLvl = Math.min(4, lvl + 1);
  const nextBonusOnLoss = CS2_LOSS_LADDER[nextIfLossLvl] + (side === 'T' && bombPlanted ? 800 : 0);
  const nextIfWinLvl = Math.max(0, lvl - 1);
  const fullBuyNeed = side === 'CT' ? 5100 : 4700; // Rifle + Armor/Helm + Utility (+Defuse CT)
  const coreBuyNeed = side === 'CT' ? 4300 : 3700; // Rifle + Armor (+Kit CT)

  const cashAfterCore = curCash - coreBuyNeed;
  const cashIfSaveAll = Math.min(16000, curCash + nextBonusOnLoss);
  const maxSafeSpendForNextFullBuy = Math.max(0, curCash + nextBonusOnLoss - fullBuyNeed);

  let callout = 'ECO / SAVE';
  if (curCash >= fullBuyNeed) callout = 'FULL BUY';
  else if (curCash >= coreBuyNeed) callout = 'CORE RIFLE BUY';
  else if (curCash + nextBonusOnLoss < fullBuyNeed && maxSafeSpendForNextFullBuy < 1200) callout = 'HARD SAVE';
  else if (maxSafeSpendForNextFullBuy >= 1500) callout = 'LIGHT FORCE ALLOWED';

  return {
    curCash,
    lvl,
    currentBonus,
    nextIfLossLvl,
    nextBonusOnLoss,
    nextIfWinLvl,
    fullBuyNeed,
    coreBuyNeed,
    cashIfSaveAll,
    maxSafeSpendForNextFullBuy,
    cashAfterCoreIfLoss: cashAfterCore + nextBonusOnLoss,
    callout,
  };
}

/**
 * Valorant Economy Matrix & RR Climb
 */
export const VAL_WEAPONS = [
  { id: 'classic', name: 'Classic / Eco', cost: 0 },
  { id: 'sheriff', name: 'Sheriff / Marshall', cost: 800 },
  { id: 'stinger', name: 'Stinger / Bucky', cost: 1100 },
  { id: 'spectre', name: 'Spectre / Ares', cost: 1600 },
  { id: 'outlaw', name: 'Outlaw', cost: 2400 },
  { id: 'vandal', name: 'Vandal / Phantom', cost: 2900 },
  { id: 'op', name: 'Operator', cost: 4700 },
];

export const VAL_ARMOR = [
  { id: 'none', name: 'No Shield', cost: 0 },
  { id: 'light', name: 'Light Armor', cost: 400 },
  { id: 'regen', name: 'Regen Shield', cost: 650 },
  { id: 'heavy', name: 'Heavy Armor', cost: 1000 },
];

export function calcValorantEconomy({ credits = 3600, weaponCost = 2900, armorCost = 1000, utilCost = 600, lossStreak = 1 }) {
  const safeCreds = clampNum(parseSafeNum(credits, 3600), 0, 9000);
  const safeWeapon = Math.max(0, Math.round(parseSafeNum(weaponCost, 0)));
  const safeArmor = Math.max(0, Math.round(parseSafeNum(armorCost, 0)));
  const safeUtil = Math.max(0, Math.round(parseSafeNum(utilCost, 0)));
  const safeLoss = clampNum(Math.round(parseSafeNum(lossStreak, 1)), 0, 2);
  const totalBuy = safeWeapon + safeArmor + safeUtil;
  const canAfford = safeCreds >= totalBuy;
  const leftover = canAfford ? safeCreds - totalBuy : safeCreds;
  const nextLossCredit = safeLoss <= 0 ? 1900 : safeLoss === 1 ? 2400 : 2900;
  const nextRoundMinOnLoss = Math.min(9000, leftover + nextLossCredit);
  const nextRoundMinOnWin = Math.min(9000, leftover + 3000);
  const fullBuyNextTarget = 3900; // Vandal 2900 + Heavy 1000
  const maxSafeSpendNow = Math.max(0, safeCreds + nextLossCredit - fullBuyNextTarget);

  return {
    totalBuy,
    canAfford,
    leftover,
    nextLossCredit,
    nextRoundMinOnLoss,
    nextRoundMinOnWin,
    nextRoundReady: nextRoundMinOnLoss >= fullBuyNextTarget,
    maxSafeSpendNow,
  };
}

/**
 * EA Sports FC 27 Tax, Sniping Break-Even & 11-Player SBC Rating Formula
 */
export function snapEaPrice(rawCoins) {
  const c = Math.max(200, Math.round(parseSafeNum(rawCoins, 200)));
  if (c < 1000) return Math.ceil(c / 50) * 50;
  if (c < 10000) return Math.ceil(c / 100) * 100;
  if (c < 50000) return Math.ceil(c / 250) * 250;
  if (c < 100000) return Math.ceil(c / 500) * 500;
  return Math.ceil(c / 1000) * 1000;
}

export function calcFc27Tax({ buyCoins = 185000, sellCoins = 215000, quantity = 1 }) {
  const buy = Math.max(0, parseSafeNum(buyCoins, 0));
  const sell = Math.max(0, parseSafeNum(sellCoins, 0));
  const qty = clampNum(Math.round(parseSafeNum(quantity, 1)), 1, 100);

  const taxPerCard = Math.round(sell * 0.05);
  const netPerCard = sell - taxPerCard;
  const profitPerCard = netPerCard - buy;
  const totalProfit = profitPerCard * qty;
  const roiPct = buy > 0 ? Number(((profitPerCard / buy) * 100).toFixed(1)) : 0;

  const minBreakEvenExact = buy > 0 ? Math.ceil(buy / 0.95) : 0;
  const minBreakEvenSnapped = buy > 0 ? snapEaPrice(minBreakEvenExact) : 0;

  return {
    taxPerCard,
    netPerCard,
    profitPerCard,
    totalProfit,
    roiPct,
    minBreakEvenExact,
    minBreakEvenSnapped,
    maxSafeBuyGivenSell: Math.floor(sell * 0.95),
  };
}

export function calcSbcSquadRating(ratings11) {
  const list = Array.isArray(ratings11) && ratings11.length === 11
    ? ratings11.map((r) => clampNum(parseSafeNum(r, 83), 45, 99))
    : Array(11).fill(83);
  const sum = list.reduce((a, b) => a + b, 0);
  const avg = sum / 11;
  const excess = list.reduce((acc, r) => acc + Math.max(0, r - avg), 0);
  const rating = Math.min(99, Math.floor(Math.round(sum + excess) / 11));
  return {
    rating,
    exactFloat: Number(((sum + excess) / 11).toFixed(2)),
    avgFloat: Number(avg.toFixed(2)),
  };
}

/**
 * Roblox DevEx Calculator (Post-Sept 2025 + Legacy + Reverse Calculator)
 */
export const ROBLOX_RATES = [
  { id: 'std-2025', label: 'Standard DevEx ($0.0038 / R$)', usdPerRobux: 0.0038 },
  { id: 'legacy', label: 'Pre-Sept 2025 Legacy ($0.0035 / R$)', usdPerRobux: 0.0035 },
  { id: 'us-direct', label: 'US 18+ Direct Store ($0.0054 / R$)', usdPerRobux: 0.0054 },
];

export function calcRobloxMinSalesFor30k(groupSplitPct = 100) {
  const split = clampNum(parseSafeNum(groupSplitPct, 100), 1, 100) / 100;
  return Math.ceil(30000 / (0.7 * split));
}

export function calcRobloxDevEx({ grossRobux = 50000, rateId = 'std-2025', groupSplitPct = 100, targetUsd = 100 }) {
  const gross = Math.max(0, Math.round(parseSafeNum(grossRobux, 0)));
  const split = clampNum(parseSafeNum(groupSplitPct, 100), 1, 100) / 100;
  const rateObj = ROBLOX_RATES.find((r) => r.id === rateId) || ROBLOX_RATES[0];

  const afterMarketFee = Math.round(gross * 0.7);
  const creatorNetRobux = Math.round(afterMarketFee * split);
  const usdPayout = creatorNetRobux * rateObj.usdPerRobux;
  const eligible = creatorNetRobux >= 30000;
  const minSalesFor30k = calcRobloxMinSalesFor30k(groupSplitPct);
  const robuxNeededForTargetUsd = Math.ceil(Math.max(0, parseSafeNum(targetUsd, 100)) / rateObj.usdPerRobux);
  const grossSalesNeededForTargetUsd = Math.ceil(robuxNeededForTargetUsd / (0.7 * split));

  return {
    gross,
    afterMarketFee,
    creatorNetRobux,
    usdPayout,
    eligible,
    minSalesFor30k,
    shortfallForMin: Math.max(0, 30000 - creatorNetRobux),
    robuxNeededForTargetUsd,
    grossSalesNeededForTargetUsd,
    rate: rateObj.usdPerRobux,
  };
}

/**
 * Fortnite Realistic Daily & Weekly XP Pace
 */
export function calcFortniteXp({ currentLevel = 42, targetLevel = 100, daysRemaining = 24, includeDailies = true, includeCreative = false }) {
  const cur = clampNum(Math.round(parseSafeNum(currentLevel, 1)), 1, 200);
  const tgt = clampNum(Math.round(parseSafeNum(targetLevel, 100)), 1, 200);
  const days = clampNum(Math.round(parseSafeNum(daysRemaining, 1)), 1, 120);

  const alreadyDone = tgt <= cur;
  const levelsLeft = alreadyDone ? 0 : tgt - cur;
  const totalXpLeft = levelsLeft * 80000;
  const xpPerDay = Math.ceil(totalXpLeft / days);
  const levelsPerDay = (levelsLeft / days).toFixed(1);

  const dailyQuestXp = includeDailies ? 60000 : 0; // 3x daily bonus goals
  const avgCreativeDaily = includeCreative ? 300000 : 0; // Sustainable UEFN portion
  const passiveXpPerDay = dailyQuestXp + avgCreativeDaily;
  const activeBrXpNeededPerDay = Math.max(0, xpPerDay - passiveXpPerDay);
  // Real non-quest BR combat/survival + accolades averages ~28k–35k XP/match when questing
  const estMatchesPerDay = Math.ceil(activeBrXpNeededPerDay / 30000) + (includeDailies ? 1 : 0);

  return {
    cur,
    tgt,
    alreadyDone,
    levelsLeft,
    totalXpLeft,
    xpPerDay,
    levelsPerDay,
    passiveXpPerDay,
    activeBrXpNeededPerDay,
    estMatchesPerDay: alreadyDone ? 0 : estMatchesPerDay,
  };
}

/**
 * Apex Legends Accurate Level Pack Counter + Ranked Estimator
 */
export function getFreeApexLevelPacks(level = 1, prestige = 0) {
  const lvl = clampNum(Math.round(parseSafeNum(level, 1)), 1, 500);
  const pTier = clampNum(Math.round(parseSafeNum(prestige, 0)), 0, 3);

  // Base Tier 0 (1-500): L2-20 = 19, L22-300 step 2 = 140, L305-500 step 5 = 40 -> 199 packs
  const countBaseTierPacks = (l) => {
    if (l <= 1) return 0;
    const band1 = Math.min(20, l) - 1;
    const band2 = l > 20 ? Math.floor((Math.min(300, l) - 20) / 2) : 0;
    const band3 = l > 300 ? Math.floor((l - 300) / 5) : 0;
    return band1 + band2 + band3;
  };

  // Prestige Tiers 1-3 (500 levels each): 115 packs per tier (199 + 3*115 = 544 total)
  // Monotonic cadence: L10..100 (+10 -> 10), L108..196 (+8 -> 22), L202..298 (+6 -> 39),
  // L302..398 (+4 -> 64), L400..500 (+2 -> 115) with zero backward drops across Prestige transitions.
  const countPrestigeTierPacks = (l) => {
    if (l <= 1) return 0;
    if (l <= 100) return Math.floor(l / 10);
    if (l <= 200) return 10 + Math.floor((l - 100) / 8);
    if (l <= 300) return 22 + Math.floor((l - 196) / 6);
    if (l < 400) return 39 + Math.floor((l - 298) / 4);
    return 64 + Math.floor((l - 398) / 2);
  };

  if (pTier === 0) {
    return countBaseTierPacks(lvl);
  }
  const completedTierPacks = 199 + (pTier - 1) * 115;
  return Math.min(544, completedTierPacks + countPrestigeTierPacks(lvl));
}

/**
 * GTA Online Cayo Perico / Casino Heist with 15% Mandatory Crew Floor
 */
export function calcGtaOnlineHeist({ primaryValue = 1300000, secondaryValue = 450000, players = 2, hostPct = 85, hardMode = true, setupFee = 100000 }) {
  const safePlayers = clampNum(Math.round(parseSafeNum(players, 2)), 1, 4);
  const primary = Math.max(0, parseSafeNum(primaryValue, 0)) * (hardMode ? 1.1 : 1.0);
  const secondary = Math.max(0, parseSafeNum(secondaryValue, 0));
  const gross = Math.round(primary + secondary);
  const pavelCut = Math.round(gross * 0.02);
  const fenceCut = Math.round(gross * 0.1);
  const netPool = Math.max(0, gross - pavelCut - fenceCut);

  const minCrewCut = 15;
  const maxHostPct = safePlayers === 1 ? 100 : 100 - minCrewCut * (safePlayers - 1);
  const clampedHostPct = safePlayers === 1 ? 100 : clampNum(Math.round(parseSafeNum(hostPct, maxHostPct)), 15, maxHostPct);
  const remainingPct = 100 - clampedHostPct;
  const crewCount = Math.max(0, safePlayers - 1);

  const eachCrewPct = crewCount > 0 ? Math.floor(remainingPct / crewCount) : 0;
  const crewExtra = crewCount > 0 ? remainingPct % crewCount : 0;

  const hostGrossPayout = Math.round((netPool * clampedHostPct) / 100);
  const hostProfitAfterSetup = hostGrossPayout - Math.max(0, setupFee);
  const crewPayouts = Array.from({ length: crewCount }, (_, idx) => {
    const pct = eachCrewPct + (idx < crewExtra ? 1 : 0);
    return {
      label: `Crew #${idx + 1}`,
      pct,
      payout: Math.round((netPool * pct) / 100),
    };
  });

  return {
    gross,
    pavelCut,
    fenceCut,
    netPool,
    hostPct: clampedHostPct,
    maxHostPct,
    hostGrossPayout,
    hostProfitAfterSetup,
    crewPayouts,
    hardMode,
  };
}

/**
 * Valorant Ranked RR Climb Simulator (Win/Loss RR EV)
 */
export function calcValorantRrClimb({ currentRr = 42, winRatePct = 54, avgWinRr = 20, avgLossRr = 16 }) {
  const curRr = clampNum(parseSafeNum(currentRr, 0), 0, 99);
  const wr = clampNum(parseSafeNum(winRatePct, 52), 1, 99) / 100;
  const winRr = clampNum(parseSafeNum(avgWinRr, 20), 5, 50);
  const lossRr = clampNum(parseSafeNum(avgLossRr, 16), 5, 50);

  const rrNeeded = Math.max(1, 100 - curRr);
  const evPerMatch = wr * winRr - (1 - wr) * lossRr;
  const positiveClimb = evPerMatch > 0.05;
  const matchesToPromote = positiveClimb ? Math.ceil(rrNeeded / evPerMatch) : null;

  return {
    curRr,
    rrNeeded,
    evPerMatch: Number(evPerMatch.toFixed(2)),
    positiveClimb,
    matchesToPromote,
  };
}

/**
 * Apex Legends Ranked RP Match Estimator
 */
export const APEX_RANK_TIERS = [
  { id: 'bronze', name: 'Bronze', thresholdRp: 1000, entryCost: 0 },
  { id: 'silver', name: 'Silver', thresholdRp: 3000, entryCost: 20 },
  { id: 'gold', name: 'Gold', thresholdRp: 6000, entryCost: 35 },
  { id: 'plat', name: 'Platinum', thresholdRp: 10000, entryCost: 55 },
  { id: 'diamond', name: 'Diamond', thresholdRp: 15000, entryCost: 75 },
  { id: 'master', name: 'Master', thresholdRp: 21000, entryCost: 100 },
];

export function calcApexRankedLadder({ currentRp = 7400, targetTierId = 'diamond', avgNetRpPerMatch = 85 }) {
  const cur = clampNum(parseSafeNum(currentRp, 7400), 0, 40000);
  const tier = APEX_RANK_TIERS.find((t) => t.id === targetTierId) || APEX_RANK_TIERS[4];
  const avgGain = clampNum(parseSafeNum(avgNetRpPerMatch, 85), -100, 400);
  const rpGap = Math.max(0, tier.thresholdRp - cur);
  const matchesNeeded = rpGap === 0 ? 0 : avgGain > 0 ? Math.ceil(rpGap / avgGain) : null;

  return {
    cur,
    tier,
    rpGap,
    avgGain,
    matchesNeeded,
    alreadyReached: rpGap === 0,
  };
}

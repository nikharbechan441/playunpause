import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Link2,
  Zap,
  TrendingUp,
  Crosshair,
  Shield,
  DollarSign,
  Compass,
  Sparkles,
  Bookmark,
  Trash2,
  Box,
  Trophy,
  Target,
  Flame,
  AlertTriangle,
  Share2,
} from 'lucide-react';
import { COD_MW4_WEAPONS } from '../data/games/allGames.js';
import { GAME_TO_CANONICAL_PATH } from '../data/seoRoutes.js';
import {
  downloadStudioSpecPng,
  formatDiscordSummary,
} from '../utils/shareCardEngine.js';
import {
  parseSafeNum,
  calcNetherCoords,
  checkPortalCollision,
  triangulateStronghold,
  calcCodTtk,
  CS2_LOSS_LADDER,
  calcCs2Economy,
  VAL_WEAPONS,
  VAL_ARMOR,
  calcValorantEconomy,
  calcValorantRrClimb,
  calcFc27Tax,
  calcSbcSquadRating,
  ROBLOX_RATES,
  calcRobloxDevEx,
  calcFortniteXp,
  getFreeApexLevelPacks,
  APEX_RANK_TIERS,
  calcApexRankedLadder,
  calcGtaOnlineHeist,
} from '../utils/gameMath.js';
import { playSwitchTick } from '../utils/soundHaptics.js';
import { copyTextReliably } from '../utils/clipboard.js';

const ICON_MAP = {
  Crosshair,
  Zap,
  Box,
  Trophy,
  Sparkles,
  Shield,
  Target,
  Flame,
  DollarSign,
};

const EMPTY_PIN_HINTS = {
  'cod-warzone': 'No saved builds yet — pin Weapon A vs B TTK results above.',
  fortnite: 'No saved XP schedules yet — pin your daily match plan above.',
  minecraft: 'No saved coordinates yet — pin Overworld ↔ Nether links or Stronghold coords above.',
  'ea-fc-27': 'No saved snipes yet — pin card flips or SBC targets above.',
  roblox: 'No saved DevEx targets yet — pin a Gamepass price goal above.',
  cs2: 'No saved buy plans yet — pin a round eco or squad threshold above.',
  valorant: 'No saved buys yet — pin your round buy plan or RR target above.',
  'apex-legends': 'No saved pity snapshots yet — pin your Heirloom progress above.',
  'gta-v': 'No saved Cayo splits yet — pin a payout loadout above.',
};

const CAYO_TARGETS = [
  { id: 'tequila', name: 'Sinsimito Tequila ($630K)', val: 630000 },
  { id: 'ruby', name: 'Ruby Necklace ($700K–$1M)', val: 1000000 },
  { id: 'bonds', name: 'Bearer Bonds ($1.1M)', val: 1100000 },
  { id: 'diamond', name: 'Pink Diamond ($1.3M)', val: 1300000 },
  { id: 'panther', name: 'Panther Statue ($1.9M Event)', val: 1900000 },
];

const CAYO_BAGS = [
  { id: 'gold', name: 'Full Gold Stacks (2+ Players, ~$495K)', val: 495000 },
  { id: 'coke', name: 'Full Cocaine (Best Solo Bag, ~$400K)', val: 400000 },
  { id: 'paint', name: '2x Office Paintings (~$360K)', val: 360000 },
  { id: 'weed', name: 'Mixed Weed / Cash (~$315K)', val: 315000 },
];

export default function MultiGameToolDeck({
  game,
  isPro,
  onOpenProModal,
  soundEnabled,
  savedPins = [],
  onSavePin,
  onRemovePin,
  initialPreset = null,
  presetKey = '',
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [pinNotice, setPinNotice] = useState('');

  const gamePins = useMemo(
    () => savedPins.filter((p) => p.gameId === game.id),
    [savedPins, game.id]
  );

  const flashCopied = (key) => {
    playSwitchTick(soundEnabled, 840);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const copyText = async (text, key) => {
    const ok = await copyTextReliably(text);
    flashCopied(ok ? key : `blocked:${key}`);
  };

  const handlePinSnapshot = (label, value) => {
    if (!onSavePin) return;
    if (!isPro && gamePins.length >= 5) {
      playSwitchTick(soundEnabled, 660);
      setPinNotice('Free tier saves up to 5 pins per game. Unlock Sync Pass for unlimited cloud pins across Phone + PC.');
      onOpenProModal();
      return;
    }
    playSwitchTick(soundEnabled, 820);
    onSavePin({
      id: `${game.id}-${Date.now().toString(36)}`,
      gameId: game.id,
      label,
      value,
    });
    setPinNotice('Pinned locally.');
    setTimeout(() => setPinNotice(''), 2000);
  };

  // ==================== 1. COD: WARZONE & MULTIPLAYER ====================
  const [weaponAId, setWeaponAId] = useState('raal-mg');
  const [weaponBId, setWeaponBId] = useState('c9-smg');
  const [customDmg, setCustomDmg] = useState(36);
  const [customRpm, setCustomRpm] = useState(882);
  const [useCustomStats, setUseCustomStats] = useState(false);
  const [codOpenBolt, setCodOpenBolt] = useState(true);
  const [codHp, setCodHp] = useState(300);
  const [codHeadshots, setCodHeadshots] = useState(1);
  const [camoClassCount, setCamoClassCount] = useState(21);
  const [camoMatchesPerGun, setCamoMatchesPerGun] = useState(6);

  const weaponAObj = useMemo(
    () => COD_MW4_WEAPONS.find((w) => w.id === weaponAId) || COD_MW4_WEAPONS[0],
    [weaponAId]
  );
  const weaponBObj = useMemo(
    () => COD_MW4_WEAPONS.find((w) => w.id === weaponBId) || COD_MW4_WEAPONS[1],
    [weaponBId]
  );

  const ttkA = useMemo(
    () =>
      calcCodTtk({
        hp: codHp,
        damage: useCustomStats ? customDmg : weaponAObj.damage,
        rpm: useCustomStats ? customRpm : weaponAObj.rpm,
        headshots: codHeadshots,
        headMult: weaponAObj.headMult,
        openBoltMs: codOpenBolt ? weaponAObj.openBoltMs : 0,
      }),
    [codHp, useCustomStats, customDmg, customRpm, weaponAObj, codHeadshots, codOpenBolt]
  );

  const ttkB = useMemo(
    () =>
      calcCodTtk({
        hp: codHp,
        damage: weaponBObj.damage,
        rpm: weaponBObj.rpm,
        headshots: codHeadshots,
        headMult: weaponBObj.headMult,
        openBoltMs: codOpenBolt ? weaponBObj.openBoltMs : 0,
      }),
    [codHp, weaponBObj, codHeadshots, codOpenBolt]
  );

  const camoRemainingGuns = Math.max(0, 33 - camoClassCount);
  const camoMatchesLeft = camoRemainingGuns * camoMatchesPerGun;

  // ==================== 2. FORTNITE ====================
  const [fnCurLvl, setFnCurLvl] = useState(44);
  const [fnTargetLvl, setFnTargetLvl] = useState(200);
  const [fnDaysLeft, setFnDaysLeft] = useState(28);
  const [fnIncludeDailies, setFnIncludeDailies] = useState(true);
  const [fnIncludeCreative, setFnIncludeCreative] = useState(true);
  const [fnIncludeLego, setFnIncludeLego] = useState(false);

  const fortniteResult = useMemo(() => {
    const base = calcFortniteXp({
      currentLevel: fnCurLvl,
      targetLevel: fnTargetLvl,
      daysRemaining: fnDaysLeft,
      includeDailies: fnIncludeDailies,
      includeCreative: fnIncludeCreative,
    });
    const legoDailyXp = fnIncludeLego ? 120000 : 0;
    const totalPassive = base.passiveXpPerDay + legoDailyXp;
    const activeBrNeeded = base.alreadyDone ? 0 : Math.max(0, base.xpPerDay - totalPassive);
    const estMatches = base.alreadyDone
      ? 0
      : Math.ceil(activeBrNeeded / 30000) + (fnIncludeDailies ? 1 : 0);
    return {
      ...base,
      passiveXpPerDay: totalPassive,
      activeBrXpNeededPerDay: activeBrNeeded,
      estMatchesPerDay: estMatches,
    };
  }, [fnCurLvl, fnTargetLvl, fnDaysLeft, fnIncludeDailies, fnIncludeCreative, fnIncludeLego]);

  // ==================== 3. MINECRAFT ====================
  const [mcDir, setMcDir] = useState('toNether');
  const [mcX, setMcX] = useState('-20');
  const [mcY, setMcY] = useState('64');
  const [mcZ, setMcZ] = useState('1023');
  const [portalBX, setPortalBX] = useState('45');
  const [portalBY, setPortalBY] = useState('64');
  const [portalBZ, setPortalBZ] = useState('980');
  const [throw1X, setThrow1X] = useState('0');
  const [throw1Z, setThrow1Z] = useState('0');
  const [throw1Deg, setThrow1Deg] = useState('-45');
  const [throw2X, setThrow2X] = useState('200');
  const [throw2Z, setThrow2Z] = useState('0');
  const [throw2Deg, setThrow2Deg] = useState('45');

  const mcResult = useMemo(() => calcNetherCoords(mcX, mcY, mcZ, mcDir), [mcX, mcY, mcZ, mcDir]);
  const mcCollision = useMemo(() => {
    const baseOwX = mcDir === 'toNether' ? parseSafeNum(mcX, 0) : parseSafeNum(mcX, 0) * 8;
    const baseOwZ = mcDir === 'toNether' ? parseSafeNum(mcZ, 0) : parseSafeNum(mcZ, 0) * 8;
    return checkPortalCollision(
      { x: baseOwX, y: parseSafeNum(mcY, 64), z: baseOwZ },
      { x: parseSafeNum(portalBX, 45), y: parseSafeNum(portalBY, 64), z: parseSafeNum(portalBZ, 980) }
    );
  }, [mcDir, mcX, mcY, mcZ, portalBX, portalBY, portalBZ]);

  const strongholdResult = useMemo(
    () => triangulateStronghold(throw1X, throw1Z, throw1Deg, throw2X, throw2Z, throw2Deg),
    [throw1X, throw1Z, throw1Deg, throw2X, throw2Z, throw2Deg]
  );

  // ==================== 4. EA SPORTS FC 27 ====================
  const [eaBuyCoins, setEaBuyCoins] = useState(185000);
  const [eaSellCoins, setEaSellCoins] = useState(215000);
  const [eaQty, setEaQty] = useState(1);
  const [sbcRatings, setSbcRatings] = useState([86, 86, 85, 85, 85, 84, 84, 84, 84, 84, 84]);

  const eaTaxResult = useMemo(
    () => calcFc27Tax({ buyCoins: eaBuyCoins, sellCoins: eaSellCoins, quantity: eaQty }),
    [eaBuyCoins, eaSellCoins, eaQty]
  );
  const eaSbcResult = useMemo(() => calcSbcSquadRating(sbcRatings), [sbcRatings]);

  // ==================== 5. ROBLOX ====================
  const [rbxGross, setRbxGross] = useState(50000);
  const [rbxRateId, setRbxRateId] = useState('std-2025');
  const [rbxGroupSplit, setRbxGroupSplit] = useState(100);
  const [rbxDesiredNet, setRbxDesiredNet] = useState(30000);

  const rbxResult = useMemo(
    () => calcRobloxDevEx({ grossRobux: rbxGross, rateId: rbxRateId, groupSplitPct: rbxGroupSplit, targetUsd: 114 }),
    [rbxGross, rbxRateId, rbxGroupSplit]
  );
  const reverseGamepassPrice = Math.ceil(
    Math.max(1, parseSafeNum(rbxDesiredNet, 30000)) / (0.7 * (Math.max(1, rbxGroupSplit) / 100))
  );

  // ==================== 6. COUNTER-STRIKE 2 ====================
  const [csCash, setCsCash] = useState(3200);
  const [csLossLevel, setCsLossLevel] = useState(1);
  const [csSide, setCsSide] = useState('CT');
  const [csBombPlanted, setCsBombPlanted] = useState(false);
  const [csTeamCash, setCsTeamCash] = useState([4900, 3200, 2100, 5600, 3800]);

  const csResult = useMemo(
    () => calcCs2Economy({ cash: csCash, lossLevel: csLossLevel, side: csSide, bombPlanted: csBombPlanted }),
    [csCash, csLossLevel, csSide, csBombPlanted]
  );
  const csSquadStats = useMemo(() => {
    const need = csSide === 'CT' ? 4300 : 3700;
    const dropCost = csSide === 'CT' ? 3100 : 2700;
    const total = csTeamCash.reduce((s, c) => s + Number(c || 0), 0);
    const canBuyCount = csTeamCash.filter((c) => c >= need).length;
    const dropsAvailable = csTeamCash.reduce((d, c) => d + Math.max(0, Math.floor((c - need) / dropCost)), 0);
    return { need, avg: Math.round(total / 5), canBuyCount, dropsAvailable };
  }, [csTeamCash, csSide]);

  // ==================== 7. VALORANT ====================
  const [valCreds, setValCreds] = useState(3900);
  const [valWeaponCost, setValWeaponCost] = useState(2900);
  const [valArmorCost, setValArmorCost] = useState(650);
  const [valUtilCost, setValUtilCost] = useState(350);
  const [valLossStreak, setValLossStreak] = useState(1);
  const [valCurRr, setValCurRr] = useState(44);
  const [valWr, setValWr] = useState(55);
  const [valWinRr, setValWinRr] = useState(21);
  const [valLossRr, setValLossRr] = useState(16);

  const valResult = useMemo(
    () =>
      calcValorantEconomy({
        credits: valCreds,
        weaponCost: valWeaponCost,
        armorCost: valArmorCost,
        utilCost: valUtilCost,
        lossStreak: valLossStreak,
      }),
    [valCreds, valWeaponCost, valArmorCost, valUtilCost, valLossStreak]
  );
  const valRrResult = useMemo(
    () => calcValorantRrClimb({ currentRr: valCurRr, winRatePct: valWr, avgWinRr: valWinRr, avgLossRr: valLossRr }),
    [valCurRr, valWr, valWinRr, valLossRr]
  );

  // ==================== 8. APEX LEGENDS ====================
  const [apexLevel, setApexLevel] = useState(420);
  const [apexPrestige, setApexPrestige] = useState(0);
  const [apexBpPacks, setApexBpPacks] = useState(28);
  const [apexPurchasedPacks, setApexPurchasedPacks] = useState(20);
  const [apexCurRp, setApexCurRp] = useState(8400);
  const [apexTargetTier, setApexTargetTier] = useState('diamond');
  const [apexAvgRp, setApexAvgRp] = useState(95);

  const apexLevelPacks = useMemo(
    () => getFreeApexLevelPacks(apexLevel, apexPrestige),
    [apexLevel, apexPrestige]
  );
  const apexTotalOpened = Math.min(500, apexLevelPacks + Number(apexBpPacks || 0) + Number(apexPurchasedPacks || 0));
  const apexRemaining = Math.max(0, 500 - apexTotalOpened);
  const apexRpResult = useMemo(
    () => calcApexRankedLadder({ currentRp: apexCurRp, targetTierId: apexTargetTier, avgNetRpPerMatch: apexAvgRp }),
    [apexCurRp, apexTargetTier, apexAvgRp]
  );

  // ==================== 9. GTA ONLINE (CAYO PERICO) ====================
  const [cayoPrimaryVal, setCayoPrimaryVal] = useState(1300000);
  const [cayoSecondaryVal, setCayoSecondaryVal] = useState(495000);
  const [cayoPlayers, setCayoPlayers] = useState(2);
  const [cayoHostPct, setCayoHostPct] = useState(85);
  const [cayoHardMode, setCayoHardMode] = useState(true);
  const [cayoEliteBonus, setCayoEliteBonus] = useState(true);

  const cayoResult = useMemo(
    () =>
      calcGtaOnlineHeist({
        primaryValue: cayoPrimaryVal,
        secondaryValue: cayoSecondaryVal,
        players: cayoPlayers,
        hostPct: cayoHostPct,
        hardMode: cayoHardMode,
        setupFee: 100000,
      }),
    [cayoPrimaryVal, cayoSecondaryVal, cayoPlayers, cayoHostPct, cayoHardMode]
  );
  const cayoEliteDollars = cayoEliteBonus ? (cayoHardMode ? 100000 : 50000) : 0;

  // Sync route presets on initial deep-link or SPA subpage navigation
  useEffect(() => {
    const p = initialPreset;
    if (!p || typeof p !== 'object') return;
    if (p.weaponAId) setWeaponAId(p.weaponAId);
    if (p.weaponBId) setWeaponBId(p.weaponBId);
    if (p.codHp !== undefined) setCodHp(p.codHp);
    if (p.codHeadshots !== undefined) setCodHeadshots(p.codHeadshots);
    if (p.codOpenBolt !== undefined) setCodOpenBolt(Boolean(p.codOpenBolt));

    if (p.fnLevel !== undefined) setFnCurLvl(p.fnLevel);
    if (p.fnTarget !== undefined) setFnTargetLvl(p.fnTarget);
    if (p.fnDays !== undefined) setFnDaysLeft(p.fnDays);
    if (p.fnCreative !== undefined) setFnIncludeCreative(Boolean(p.fnCreative));
    if (p.fnLego !== undefined) setFnIncludeLego(Boolean(p.fnLego));

    if (p.mcDir) setMcDir(p.mcDir);
    if (p.netherX !== undefined) setMcX(String(p.netherX));
    if (p.netherY !== undefined) setMcY(String(p.netherY));
    if (p.netherZ !== undefined) setMcZ(String(p.netherZ));

    if (p.buyPrice !== undefined) setEaBuyCoins(p.buyPrice);
    if (p.sellPrice !== undefined) setEaSellCoins(p.sellPrice);
    if (p.quantity !== undefined) setEaQty(p.quantity);
    if (Array.isArray(p.sbcRatings) && p.sbcRatings.length === 11) setSbcRatings(p.sbcRatings);

    if (p.robux !== undefined) setRbxGross(p.robux);
    if (p.devexRate) setRbxRateId(p.devexRate);
    if (p.groupSplit !== undefined) setRbxGroupSplit(p.groupSplit);
    if (p.desiredNet !== undefined) setRbxDesiredNet(p.desiredNet);

    if (p.cs2Cash !== undefined) setCsCash(p.cs2Cash);
    if (p.cs2Loss !== undefined) setCsLossLevel(p.cs2Loss);
    if (p.cs2Side) setCsSide(p.cs2Side);
    if (p.cs2Plant !== undefined) setCsBombPlanted(Boolean(p.cs2Plant));

    if (p.valCreds !== undefined) setValCreds(p.valCreds);
    if (p.valWeapon !== undefined) setValWeaponCost(p.valWeapon);
    if (p.valArmor !== undefined) setValArmorCost(p.valArmor);
    if (p.valUtil !== undefined) setValUtilCost(p.valUtil);
    if (p.valLoss !== undefined) setValLossStreak(p.valLoss);
    if (p.valRr !== undefined) setValCurRr(p.valRr);
    if (p.valWr !== undefined) setValWr(p.valWr);

    if (p.apexLevel !== undefined) setApexLevel(p.apexLevel);
    if (p.apexPrestige !== undefined) setApexPrestige(p.apexPrestige);
    if (p.apexBp !== undefined) setApexBpPacks(p.apexBp);
    if (p.apexBought !== undefined) setApexPurchasedPacks(p.apexBought);
    if (p.apexRp !== undefined) setApexCurRp(p.apexRp);
    if (p.apexTier) setApexTargetTier(p.apexTier);
    if (p.apexAvgRp !== undefined) setApexAvgRp(p.apexAvgRp);

    if (p.cayoPrimary !== undefined) setCayoPrimaryVal(p.cayoPrimary);
    if (p.cayoSecondary !== undefined) setCayoSecondaryVal(p.cayoSecondary);
    if (p.cayoPlayers !== undefined) setCayoPlayers(p.cayoPlayers);
    if (p.cayoHostPct !== undefined) setCayoHostPct(p.cayoHostPct);
    if (p.cayoHard !== undefined) setCayoHardMode(Boolean(p.cayoHard));
  }, [presetKey]);

  const currentShareUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://playunpause.com';
    const defaultBase = GAME_TO_CANONICAL_PATH[game.id] || '/';
    const rawPathname =
      typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : defaultBase;
    const base =
      defaultBase !== '/' && (rawPathname === defaultBase || rawPathname.startsWith(`${defaultBase}/`))
        ? rawPathname
        : defaultBase;
    switch (game.id) {
      case 'cod-warzone':
        return `${origin}${base}?a=${encodeURIComponent(weaponAId)}&b=${encodeURIComponent(weaponBId)}&hp=${codHp}&hs=${codHeadshots}&bolt=${codOpenBolt ? 1 : 0}`;
      case 'fortnite':
        return `${origin}${base}?lvl=${fnCurLvl}&target=${fnTargetLvl}&days=${fnDaysLeft}&creative=${fnIncludeCreative ? 1 : 0}&lego=${fnIncludeLego ? 1 : 0}`;
      case 'minecraft':
        return `${origin}${base}?dir=${encodeURIComponent(mcDir)}&x=${parseSafeNum(mcX, -20)}&y=${parseSafeNum(mcY, 64)}&z=${parseSafeNum(mcZ, 1023)}`;
      case 'ea-fc-27':
        return `${origin}${base}?buy=${eaBuyCoins}&sell=${eaSellCoins}&qty=${eaQty}&sbc=${encodeURIComponent(sbcRatings.join(','))}`;
      case 'roblox':
        return `${origin}${base}?robux=${rbxGross}&rate=${encodeURIComponent(rbxRateId)}&split=${rbxGroupSplit}&net=${rbxDesiredNet}`;
      case 'cs2':
        return `${origin}${base}?side=${encodeURIComponent(csSide)}&cash=${csCash}&loss=${csLossLevel}&plant=${csBombPlanted ? 1 : 0}`;
      case 'valorant':
        return `${origin}${base}?cred=${valCreds}&vw=${valWeaponCost}&va=${valArmorCost}&vu=${valUtilCost}&vl=${valLossStreak}&rr=${valCurRr}&wr=${valWr}`;
      case 'apex-legends':
        return `${origin}${base}?apexLvl=${apexLevel}&prestige=${apexPrestige}&bp=${apexBpPacks}&bought=${apexPurchasedPacks}&tier=${encodeURIComponent(apexTargetTier)}&apexRp=${apexCurRp}&avgRp=${apexAvgRp}`;
      case 'gta-v':
        return `${origin}${base}?cayo=${cayoPrimaryVal}&csec=${cayoSecondaryVal}&players=${cayoPlayers}&hostPct=${cayoHostPct}&hard=${cayoHardMode ? 1 : 0}`;
      default:
        return `${origin}${base}`;
    }
  }, [
    game.id,
    weaponAId,
    weaponBId,
    codHp,
    codHeadshots,
    codOpenBolt,
    fnCurLvl,
    fnTargetLvl,
    fnDaysLeft,
    fnIncludeCreative,
    fnIncludeLego,
    mcDir,
    mcX,
    mcY,
    mcZ,
    eaBuyCoins,
    eaSellCoins,
    eaQty,
    sbcRatings,
    rbxGross,
    rbxRateId,
    rbxGroupSplit,
    rbxDesiredNet,
    csSide,
    csCash,
    csLossLevel,
    csBombPlanted,
    valCreds,
    valWeaponCost,
    valArmorCost,
    valUtilCost,
    valLossStreak,
    valCurRr,
    valWr,
    apexLevel,
    apexPrestige,
    apexBpPacks,
    apexPurchasedPacks,
    apexTargetTier,
    apexCurRp,
    apexAvgRp,
    cayoPrimaryVal,
    cayoSecondaryVal,
    cayoPlayers,
    cayoHostPct,
    cayoHardMode,
  ]);

  const currentShareSpec = useMemo(() => {
    switch (game.id) {
      case 'cod-warzone':
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'MW4 / WZ TTK Spec',
          heroLabel: `${weaponAObj.name} vs ${weaponBObj.name}`,
          heroValue: `${ttkA.ttkMs} vs ${ttkB.ttkMs} ms`,
          heroSub: `${codHp} HP · ${codHeadshots} HS`,
          accentColor: game.accentColor,
          fileSlug: `unpause-mw4-${weaponAObj.id}`,
          rows: [
            { label: 'Shots to Kill (A/B)', value: `${ttkA.shotsToKill} / ${ttkB.shotsToKill}` },
            { label: 'Open-Bolt Delay', value: codOpenBolt ? 'ON (+trigger delay)' : 'OFF' },
            { label: 'Camo Remaining', value: `${camoRemainingGuns} guns` },
            { label: 'DPS (A / B)', value: `${ttkA.dps} / ${ttkB.dps}` },
          ],
        };
      case 'fortnite':
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'XP Level Schedule',
          heroLabel: 'DAILY XP PACE',
          heroValue: `${fortniteResult.xpPerDay.toLocaleString('en-US')} XP`,
          heroSub: `Lvl ${fnCurLvl} -> ${fnTargetLvl} (${fnDaysLeft}d)`,
          accentColor: game.accentColor,
          fileSlug: 'unpause-fortnite-xp',
          rows: [
            { label: 'Est. BR Matches/Day', value: `${fortniteResult.estMatchesPerDay}` },
            { label: 'Passive XP/Day', value: `${fortniteResult.passiveXpPerDay.toLocaleString('en-US')}` },
          ],
        };
      case 'minecraft':
        return {
          gameTitle: game.shortTitle,
          toolTitle: '8:1 Portal Link',
          heroLabel: mcDir === 'toNether' ? 'NETHER BUILD COORDS' : 'OVERWORLD BUILD COORDS',
          heroValue: `${mcResult.output.x} / ${mcResult.output.y} / ${mcResult.output.z}`,
          heroSub: `Chunk ${mcResult.chunk.cx}, ${mcResult.chunk.cz}`,
          accentColor: game.accentColor,
          fileSlug: 'unpause-minecraft-portal',
          rows: [
            { label: 'Region File', value: `r.${mcResult.chunk.rx}.${mcResult.chunk.rz}.mca` },
            { label: '2nd Portal Check', value: mcCollision.conflictRisk ? 'LINK RISK' : 'ISOLATED' },
          ],
        };
      case 'ea-fc-27':
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'FUT Tax & SBC Spec',
          heroLabel: 'NET PROFIT PER CARD',
          heroValue: `${eaTaxResult.profitPerCard >= 0 ? '+' : ''}${eaTaxResult.profitPerCard.toLocaleString('en-US')}`,
          heroSub: `Min Sell ${eaTaxResult.minBreakEvenSnapped.toLocaleString('en-US')}`,
          accentColor: game.accentColor,
          fileSlug: 'unpause-fc27-tax',
          rows: [
            { label: '5% EA Tax', value: `-${eaTaxResult.taxPerCard.toLocaleString('en-US')}` },
            { label: '11-Player SBC', value: `${eaSbcResult.rating} OVR` },
          ],
        };
      case 'roblox':
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'DevEx Cashout Spec',
          heroLabel: 'DEVEX USD PAYOUT',
          heroValue: `$${rbxResult.usdPayout.toFixed(2)}`,
          heroSub: rbxResult.eligible ? 'DevEx Eligible (30K+)' : 'Below 30K Threshold',
          accentColor: game.accentColor,
          fileSlug: 'unpause-roblox-devex',
          rows: [
            { label: 'After 30% Cut', value: `${rbxResult.afterMarketFee.toLocaleString('en-US')} R$` },
            { label: `Pass for ${rbxDesiredNet} Net`, value: `${reverseGamepassPrice.toLocaleString('en-US')} R$` },
          ],
        };
      case 'cs2': {
        const csNextOnLoss = Math.min(16000, csResult.curCash + csResult.nextBonusOnLoss);
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'MR12 Eco Spec',
          heroLabel: 'NEXT ROUND FLOOR',
          heroValue: `$${csNextOnLoss.toLocaleString('en-US')}`,
          heroSub: csNextOnLoss >= csResult.fullBuyNeed ? 'Full Buy Ready' : csResult.callout,
          accentColor: game.accentColor,
          fileSlug: 'unpause-cs2-mr12',
          rows: [
            { label: 'Side / Rifle Need', value: `${csSide} ($${csSquadStats.need})` },
            { label: 'Loss Tier', value: `Tier ${csLossLevel} ($${CS2_LOSS_LADDER[csLossLevel]})` },
          ],
        };
      }
      case 'valorant':
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'Buy Matrix Spec',
          heroLabel: 'NEXT ROUND IF LOST',
          heroValue: `${valResult.nextRoundMinOnLoss.toLocaleString('en-US')} Creds`,
          heroSub: valResult.nextRoundReady ? '3,900+ Locked' : 'Short on Full Buy',
          accentColor: game.accentColor,
          fileSlug: 'unpause-valorant-eco',
          rows: [
            { label: 'Spend (Gun+Armor)', value: `${valWeaponCost + valArmorCost} Creds` },
            { label: 'RR Promotion Est.', value: valRrResult.positiveClimb ? `~${valRrResult.matchesToPromote} games` : 'Flat EV' },
          ],
        };
      case 'apex-legends':
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'Heirloom Pity Spec',
          heroLabel: 'PACKS TOWARD 500 PITY',
          heroValue: `${apexTotalOpened} / 500`,
          heroSub: `${apexRemaining} packs remaining`,
          accentColor: game.accentColor,
          fileSlug: 'unpause-apex-pity',
          rows: [
            { label: 'Free Level Packs', value: `${apexLevelPacks}` },
            { label: 'Ranked Matches', value: apexRpResult.matchesNeeded === null ? 'N/A' : `${apexRpResult.matchesNeeded} avg` },
          ],
        };
      default:
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'Cayo Perico Split',
          heroLabel: 'HOST NET PROFIT',
          heroValue: `$${(cayoResult.hostProfitAfterSetup + cayoEliteDollars).toLocaleString('en-US')}`,
          heroSub: `${cayoResult.hostPct}% Cut · ${cayoPlayers}P`,
          accentColor: game.accentColor,
          fileSlug: 'unpause-cayo-split',
          rows: [
            { label: 'Hard Mode', value: cayoHardMode ? 'ON (+10%)' : 'OFF' },
            { label: 'Net Squad Pool', value: `$${cayoResult.netPool.toLocaleString('en-US')}` },
          ],
        };
    }
  }, [
    game, weaponAObj, weaponBObj, ttkA, ttkB, codHp, codHeadshots, codOpenBolt, camoRemainingGuns,
    fortniteResult, fnCurLvl, fnTargetLvl, fnDaysLeft, mcDir, mcResult, mcCollision,
    eaTaxResult, eaSbcResult, rbxResult, rbxDesiredNet, reverseGamepassPrice,
    csResult, csSide, csSquadStats, csLossLevel, valResult, valWeaponCost, valArmorCost, valRrResult,
    apexTotalOpened, apexRemaining, apexLevelPacks, apexRpResult, cayoResult, cayoEliteDollars, cayoPlayers, cayoHardMode,
  ]);

  const IconComp = ICON_MAP[game.icon] || Sparkles;

  return (
    <div className="mg-workspace" style={{ '--game-accent': game.accentColor, '--game-accent-soft': game.accentSoft }}>
      {/* MAIN CALCULATOR + UNBLURRED SIDE META STACK */}
      <div className="mg-split-grid">
        <div className="mg-stack-cards">
          {/* ==================== COD WARZONE ==================== */}
          {game.id === 'cod-warzone' && (
            <>
              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">
                    <Crosshair size={16} color={game.accentColor} />
                    <span>Warzone Weapon A vs B TTK Comparator</span>
                  </h2>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`filter-pill ${codOpenBolt ? 'active' : ''}`}
                      onClick={() => setCodOpenBolt((v) => !v)}
                    >
                      Open-Bolt Delay: {codOpenBolt ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      className="subtle-pill-btn"
                      onClick={() =>
                        handlePinSnapshot(
                          `${weaponAObj.name} @ ${codHp}HP`,
                          `${ttkA.ttkMs} ms (${ttkA.shotsToKill} shots)`
                        )
                      }
                    >
                      <Bookmark size={13} /> Pin TTK
                    </button>
                  </div>
                </div>

                <div className="mg-hero-answer mobile-answer-first">
                  <div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {useCustomStats ? 'CUSTOM WEAPON A' : weaponAObj.name.toUpperCase()} VS {weaponBObj.name.toUpperCase()} ({codHp} HP)
                    </div>
                    <div className="mg-hero-value">
                      {ttkA.ttkMs} ms vs {ttkB.ttkMs} ms
                    </div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: '0.9rem', color: ttkA.ttkMs <= ttkB.ttkMs ? 'var(--teal-dark)' : 'var(--coral)' }}>
                    {ttkA.ttkMs <= ttkB.ttkMs
                      ? `${weaponAObj.name} wins by ${ttkB.ttkMs - ttkA.ttkMs} ms`
                      : `${weaponBObj.name} faster by ${ttkA.ttkMs - ttkB.ttkMs} ms`}
                  </div>
                </div>

                <div className="mg-field-grid two-col">
                  <div className="mg-field">
                    <label htmlFor="cod-weap-a">Weapon A</label>
                    <select
                      id="cod-weap-a"
                      className="deck-input no-icon"
                      value={weaponAId}
                      onChange={(e) => {
                        const w = COD_MW4_WEAPONS.find((x) => x.id === e.target.value);
                        setWeaponAId(e.target.value);
                        if (w) {
                          setCustomDmg(w.damage);
                          setCustomRpm(w.rpm);
                          setUseCustomStats(false);
                        }
                      }}
                    >
                      {COD_MW4_WEAPONS.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} · {w.rpm} RPM / {w.damage} DMG
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mg-field">
                    <label htmlFor="cod-weap-b">Compare vs Weapon B</label>
                    <select
                      id="cod-weap-b"
                      className="deck-input no-icon"
                      value={weaponBId}
                      onChange={(e) => setWeaponBId(e.target.value)}
                    >
                      {COD_MW4_WEAPONS.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} · {w.rpm} RPM / {w.damage} DMG
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mg-field">
                    <label htmlFor="cod-hp-select">Target Armor / HP</label>
                    <select
                      id="cod-hp-select"
                      className="deck-input no-icon"
                      value={codHp}
                      onChange={(e) => setCodHp(Number(e.target.value))}
                    >
                      <option value={300}>300 HP · 3 Plates</option>
                      <option value={250}>250 HP · 2 Plates</option>
                      <option value={200}>200 HP · 1 Plate</option>
                      <option value={100}>100 HP · Multiplayer Core</option>
                    </select>
                  </div>

                  <div className="mg-field">
                    <label htmlFor="cod-hs-select">Mixed Headshots</label>
                    <select
                      id="cod-hs-select"
                      className="deck-input no-icon"
                      value={codHeadshots}
                      onChange={(e) => setCodHeadshots(Number(e.target.value))}
                    >
                      <option value={0}>0 Headshots · Body</option>
                      <option value={1}>1 Headshot + Body</option>
                      <option value={2}>2 Headshots + Body</option>
                      <option value={3}>3 Headshots</option>
                    </select>
                  </div>
                </div>

                <div className="slider-pair-grid" style={{ marginTop: '14px' }}>
                  <div>
                    <div className="meter-labels" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                      <span>Custom Weapon A RPM</span>
                      <strong className="mono">{useCustomStats ? customRpm : weaponAObj.rpm} RPM</strong>
                    </div>
                    <input
                      type="range"
                      min={300}
                      max={1200}
                      step={1}
                      value={useCustomStats ? customRpm : weaponAObj.rpm}
                      style={{ '--pct': `${Math.round((((useCustomStats ? customRpm : weaponAObj.rpm) - 300) / 900) * 100)}%`, width: '100%' }}
                      onChange={(e) => {
                        setUseCustomStats(true);
                        setCustomRpm(Number(e.target.value));
                      }}
                    />
                  </div>
                  <div>
                    <div className="meter-labels" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                      <span>Custom Damage / Bullet</span>
                      <strong className="mono">{useCustomStats ? customDmg : weaponAObj.damage} DMG</strong>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={90}
                      step={1}
                      value={useCustomStats ? customDmg : weaponAObj.damage}
                      style={{ '--pct': `${Math.round((((useCustomStats ? customDmg : weaponAObj.damage) - 20) / 70) * 100)}%`, width: '100%' }}
                      onChange={(e) => {
                        setUseCustomStats(true);
                        setCustomDmg(Number(e.target.value));
                      }}
                    />
                  </div>
                </div>

                <div className="mg-stat-mini-grid">
                  <div className="mg-stat-mini">
                    <span>Shots to Kill (A / B)</span>
                    <strong>{ttkA.shotsToKill} / {ttkB.shotsToKill}</strong>
                  </div>
                  <div className="mg-stat-mini">
                    <span>Raw DPS (A / B)</span>
                    <strong>{ttkA.dps} / {ttkB.dps}</strong>
                  </div>
                  <div className="mg-stat-mini">
                    <span>Shot Interval</span>
                    <strong>{ttkA.fireIntervalMs} ms</strong>
                  </div>
                </div>
              </div>

              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">Mastery Camo 33-Weapon Grind Estimator</h2>
                  <span className="district-pill">{camoRemainingGuns} Weapons Remaining</span>
                </div>
                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="camo-done">Weapons Finished (0–33)</label>
                    <input
                      id="camo-done"
                      type="number"
                      min={0}
                      max={33}
                      className="deck-input no-icon mono"
                      value={camoClassCount}
                      onChange={(e) => setCamoClassCount(Math.max(0, Math.min(33, Number(e.target.value) || 0)))}
                    />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="camo-pace">Avg Matches / Weapon</label>
                    <input
                      id="camo-pace"
                      type="number"
                      min={1}
                      max={30}
                      className="deck-input no-icon mono"
                      value={camoMatchesPerGun}
                      onChange={(e) => setCamoMatchesPerGun(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                    />
                  </div>
                  <div className="mg-field">
                    <label>Remaining Matches</label>
                    <div className="hud-readout" style={{ width: '100%', justifyContent: 'center' }}>
                      {camoMatchesLeft} Matches Left
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================== FORTNITE ==================== */}
          {game.id === 'fortnite' && (
            <div className="mg-subcard">
              <div className="mg-subcard-head">
                <h2 className="mg-subcard-title">
                  <Zap size={16} color={game.accentColor} />
                  <span>Multi-Mode Battle Pass XP Pace (80,000 XP / Level)</span>
                </h2>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `Level ${fnCurLvl} -> ${fnTargetLvl}`,
                      fortniteResult.alreadyDone
                        ? 'Target Reached'
                        : `${fortniteResult.xpPerDay.toLocaleString('en-US')} XP/day (~${fortniteResult.estMatchesPerDay} BR matches)`
                    )
                  }
                >
                  <Bookmark size={13} /> Pin XP Plan
                </button>
              </div>

              <div className="mg-hero-answer mobile-answer-first">
                <div>
                  <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                    {fortniteResult.alreadyDone ? 'TARGET ALREADY REACHED' : `DAILY XP NEEDED OVER ${fnDaysLeft} DAYS`}
                  </div>
                  <div className="mg-hero-value">
                    {fortniteResult.alreadyDone
                      ? 'Goal Complete (0 XP Needed)'
                      : `${fortniteResult.xpPerDay.toLocaleString('en-US')} XP / day`}
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>
                  {fortniteResult.alreadyDone
                    ? `Lv ${fnCurLvl} >= ${fnTargetLvl}`
                    : `${fortniteResult.levelsPerDay} lvls/day · ~${fortniteResult.estMatchesPerDay} BR matches`}
                </div>
              </div>

              <div className="filter-row">
                {[100, 140, 200].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`filter-pill ${fnTargetLvl === lvl ? 'active' : ''}`}
                    onClick={() => setFnTargetLvl(lvl)}
                  >
                    Target Lv {lvl} {lvl === 140 ? '(+500 V-Bucks)' : lvl === 200 ? '(Super Styles)' : '(Main Pass)'}
                  </button>
                ))}
              </div>

              <div className="mg-field-grid">
                <div className="mg-field">
                  <label htmlFor="fn-cur">Current Level</label>
                  <input
                    id="fn-cur"
                    type="number"
                    min={1}
                    max={200}
                    className="deck-input no-icon mono"
                    value={fnCurLvl}
                    onChange={(e) => setFnCurLvl(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                  />
                </div>
                <div className="mg-field">
                  <label htmlFor="fn-days">Days Left in Season</label>
                  <input
                    id="fn-days"
                    type="number"
                    min={1}
                    max={120}
                    className="deck-input no-icon mono"
                    value={fnDaysLeft}
                    onChange={(e) => setFnDaysLeft(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                  />
                </div>
              </div>

              <div className="filter-row" style={{ marginTop: '14px', marginBottom: 0 }}>
                <button
                  type="button"
                  className={`filter-pill ${fnIncludeDailies ? 'active' : ''}`}
                  onClick={() => setFnIncludeDailies((v) => !v)}
                >
                  BR 3x Daily Bonus (+60K/day)
                </button>
                <button
                  type="button"
                  className={`filter-pill ${fnIncludeCreative ? 'active' : ''}`}
                  onClick={() => setFnIncludeCreative((v) => !v)}
                >
                  UEFN Creative (+300K/day)
                </button>
                <button
                  type="button"
                  className={`filter-pill ${fnIncludeLego ? 'active' : ''}`}
                  onClick={() => setFnIncludeLego((v) => !v)}
                >
                  LEGO / Festival (+120K/day)
                </button>
              </div>

              <div className="mg-stat-mini-grid">
                <div className="mg-stat-mini">
                  <span>Levels Remaining</span>
                  <strong>{fortniteResult.levelsLeft}</strong>
                </div>
                <div className="mg-stat-mini">
                  <span>Daily Quests + Passive</span>
                  <strong>{fortniteResult.passiveXpPerDay.toLocaleString('en-US')} XP</strong>
                </div>
                <div className="mg-stat-mini">
                  <span>Active BR Grind Left</span>
                  <strong>{fortniteResult.activeBrXpNeededPerDay.toLocaleString('en-US')} XP/day</strong>
                </div>
              </div>
            </div>
          )}

          {/* ==================== MINECRAFT ==================== */}
          {game.id === 'minecraft' && (
            <>
              <div
                className="hardware-slim-bar"
                role="note"
                style={{ marginTop: 0, marginBottom: '12px', fontSize: '0.76rem', color: 'var(--ink-secondary)' }}
              >
                <span>
                  <strong>Unofficial Fan Utility:</strong> NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG AB OR MICROSOFT.
                </span>
              </div>
              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">
                    <Box size={16} color={game.accentColor} />
                    <span>8:1 Nether Portal Linker (Exact Block Rounding + Chunk / .mca)</span>
                  </h2>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() =>
                      handlePinSnapshot(
                        `${mcDir === 'toNether' ? 'OW->Nether' : 'Nether->OW'}`,
                        `X:${mcResult.output.x} Y:${mcResult.output.y} Z:${mcResult.output.z}`
                      )
                    }
                  >
                    <Bookmark size={13} /> Pin Portal
                  </button>
                </div>

                <div className="mg-hero-answer mobile-answer-first">
                  <div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {mcDir === 'toNether' ? 'BUILD PAIRED NETHER PORTAL AT' : 'OVERWORLD EXIT TARGET'}
                    </div>
                    <div className="mg-hero-value">
                      X: {mcResult.output.x} · Y: {mcResult.output.y} · Z: {mcResult.output.z}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-key-btn"
                    onClick={() =>
                      copyText(
                        `${mcResult.output.x} ${mcResult.output.y} ${mcResult.output.z}`,
                        'mc-coords'
                      )
                    }
                  >
                    {copiedKey === 'mc-coords' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'mc-coords' ? 'Copied' : 'Copy XYZ'}</span>
                  </button>
                </div>

                <div className="filter-row">
                  <button
                    type="button"
                    className={`filter-pill ${mcDir === 'toNether' ? 'active' : ''}`}
                    onClick={() => setMcDir('toNether')}
                  >
                    Overworld → Nether (÷ 8 floor)
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${mcDir === 'toOverworld' ? 'active' : ''}`}
                    onClick={() => setMcDir('toOverworld')}
                  >
                    Nether → Overworld (× 8)
                  </button>
                </div>

                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="mc-x">X Coordinate</label>
                    <input
                      id="mc-x"
                      type="number"
                      className="deck-input no-icon mono"
                      value={mcX}
                      onChange={(e) => setMcX(e.target.value)}
                    />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="mc-y">Y Altitude (-64..320)</label>
                    <input
                      id="mc-y"
                      type="number"
                      className="deck-input no-icon mono"
                      value={mcY}
                      onChange={(e) => setMcY(e.target.value)}
                    />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="mc-z">Z Coordinate</label>
                    <input
                      id="mc-z"
                      type="number"
                      className="deck-input no-icon mono"
                      value={mcZ}
                      onChange={(e) => setMcZ(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mg-stat-mini-grid">
                  <div className="mg-stat-mini">
                    <span>Chunk Index</span>
                    <strong>{mcResult.chunk.cx}, {mcResult.chunk.cz}</strong>
                  </div>
                  <div className="mg-stat-mini">
                    <span>Region File</span>
                    <strong>r.{mcResult.chunk.rx}.{mcResult.chunk.rz}.mca</strong>
                  </div>
                  <div className="mg-stat-mini">
                    <span>Y-Altitude Advisory</span>
                    <strong style={{ fontSize: '0.82rem' }}>{mcResult.netherYWarning}</strong>
                  </div>
                </div>
              </div>

              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">2nd-Portal 3D Collision &amp; 2-Throw Stronghold Locator</h2>
                  <span
                    className="district-pill"
                    style={{ color: mcCollision.conflictRisk ? 'var(--coral)' : 'var(--teal-dark)' }}
                  >
                    {mcCollision.conflictRisk ? 'Link Conflict Risk' : 'Clear Separation'}
                  </span>
                </div>

                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="mc-b-x">2nd Portal Overworld X</label>
                    <input id="mc-b-x" type="number" className="deck-input no-icon mono" value={portalBX} onChange={(e) => setPortalBX(e.target.value)} />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="mc-b-y">2nd Portal Y</label>
                    <input id="mc-b-y" type="number" className="deck-input no-icon mono" value={portalBY} onChange={(e) => setPortalBY(e.target.value)} />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="mc-b-z">2nd Portal Overworld Z</label>
                    <input id="mc-b-z" type="number" className="deck-input no-icon mono" value={portalBZ} onChange={(e) => setPortalBZ(e.target.value)} />
                  </div>
                </div>
                <p style={{ margin: '10px 0 14px', fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                  Nether 3D dist: <strong className="mono">{mcCollision.nether3dDist}</strong> blocks · {mcCollision.verdict}
                </p>

                <hr className="receipt-dash" />

                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="sh-x1">Throw #1 X / Z / Yaw</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5px' }}>
                      <input id="sh-x1" type="number" aria-label="Throw 1 X" className="deck-input no-icon mono" value={throw1X} onChange={(e) => setThrow1X(e.target.value)} />
                      <input type="number" aria-label="Throw 1 Z" className="deck-input no-icon mono" value={throw1Z} onChange={(e) => setThrow1Z(e.target.value)} />
                      <input type="number" aria-label="Throw 1 Deg" className="deck-input no-icon mono" value={throw1Deg} onChange={(e) => setThrow1Deg(e.target.value)} />
                    </div>
                  </div>
                  <div className="mg-field">
                    <label htmlFor="sh-x2">Throw #2 X / Z / Yaw</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5px' }}>
                      <input id="sh-x2" type="number" aria-label="Throw 2 X" className="deck-input no-icon mono" value={throw2X} onChange={(e) => setThrow2X(e.target.value)} />
                      <input type="number" aria-label="Throw 2 Z" className="deck-input no-icon mono" value={throw2Z} onChange={(e) => setThrow2Z(e.target.value)} />
                      <input type="number" aria-label="Throw 2 Deg" className="deck-input no-icon mono" value={throw2Deg} onChange={(e) => setThrow2Deg(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="hud-readout" style={{ marginTop: '10px', width: '100%', justifyContent: 'space-between' }}>
                  <span>Stronghold Triangulation</span>
                  <strong>
                    {strongholdResult.valid
                      ? `OW X:${strongholdResult.x} Z:${strongholdResult.z} (Nether ${strongholdResult.netherX}, ${strongholdResult.netherZ})`
                      : strongholdResult.reason}
                  </strong>
                </div>
              </div>
            </>
          )}

          {/* ==================== EA SPORTS FC 27 ==================== */}
          {(game.id === 'ea-fc-27' || game.id === 'ea-fc-25') && (
            <>
              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">
                    <Trophy size={16} color={game.accentColor} />
                    <span>5% EA Tax Flipper &amp; Legal Price-Step Sniping Target</span>
                  </h2>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() =>
                      handlePinSnapshot(
                        `Buy ${Number(eaBuyCoins).toLocaleString('en-US')}`,
                        `Min Sell ${eaTaxResult.minBreakEvenSnapped.toLocaleString('en-US')} | Batch Profit ${eaTaxResult.totalProfit.toLocaleString('en-US')}`
                      )
                    }
                  >
                    <Bookmark size={13} /> Pin Flip
                  </button>
                </div>

                <div className="mg-hero-answer mobile-answer-first">
                  <div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      NET PROFIT ({eaQty}x CARDS AFTER 5% TAX)
                    </div>
                    <div
                      className="mg-hero-value"
                      style={{ color: eaTaxResult.totalProfit >= 0 ? 'var(--teal-dark)' : 'var(--coral)' }}
                    >
                      {eaTaxResult.totalProfit >= 0 ? '+' : ''}
                      {eaTaxResult.totalProfit.toLocaleString('en-US')} Coins ({eaTaxResult.roiPct}%)
                    </div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--ocean)' }}>
                    Min Legal Sell: {eaTaxResult.minBreakEvenSnapped.toLocaleString('en-US')}
                  </div>
                </div>

                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="ea-buy">Buy Price (Coins)</label>
                    <input
                      id="ea-buy"
                      type="number"
                      min={200}
                      step={500}
                      className="deck-input no-icon mono"
                      value={eaBuyCoins}
                      onChange={(e) => setEaBuyCoins(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="ea-sell">Planned List Price</label>
                    <input
                      id="ea-sell"
                      type="number"
                      min={200}
                      step={500}
                      className="deck-input no-icon mono"
                      value={eaSellCoins}
                      onChange={(e) => setEaSellCoins(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="ea-qty">Batch Qty</label>
                    <div className="stepper-input-row">
                      <button type="button" className="calc-stepper-btn" onClick={() => setEaQty((q) => Math.max(1, q - 1))}>−</button>
                      <input
                        id="ea-qty"
                        type="number"
                        min={1}
                        max={100}
                        className="deck-input no-icon mono"
                        value={eaQty}
                        onChange={(e) => setEaQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                      />
                      <button type="button" className="calc-stepper-btn" onClick={() => setEaQty((q) => Math.min(100, q + 1))}>+</button>
                    </div>
                  </div>
                </div>

                <div className="mg-stat-mini-grid">
                  <div className="mg-stat-mini">
                    <span>EA 5% Tax / Card</span>
                    <strong>-{eaTaxResult.taxPerCard.toLocaleString('en-US')}</strong>
                  </div>
                  <div className="mg-stat-mini">
                    <span>Profit Per Card</span>
                    <strong>{eaTaxResult.profitPerCard.toLocaleString('en-US')}</strong>
                  </div>
                  <div className="mg-stat-mini">
                    <span>Max Safe Snipe Bid</span>
                    <strong>{eaTaxResult.maxSafeBuyGivenSell.toLocaleString('en-US')}</strong>
                  </div>
                </div>
              </div>

              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">Exact 11-Player SBC Rating Solver (Excess Rule)</h2>
                  <span className="district-pill" style={{ color: 'var(--teal-dark)' }}>
                    Squad OVR: {eaSbcResult.rating} ({eaSbcResult.exactFloat})
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: '6px' }}>
                  {sbcRatings.map((val, idx) => (
                    <div key={idx} className="mg-field">
                      <label htmlFor={`sbc-slot-${idx}`}>#{idx + 1}</label>
                      <input
                        id={`sbc-slot-${idx}`}
                        type="number"
                        min={45}
                        max={99}
                        className="deck-input no-icon mono"
                        style={{ padding: '6px 8px', textAlign: 'center' }}
                        value={val}
                        onChange={(e) => {
                          const v = Math.max(45, Math.min(99, Number(e.target.value) || 45));
                          setSbcRatings((prev) => prev.map((r, i) => (i === idx ? v : r)));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ==================== ROBLOX ==================== */}
          {game.id === 'roblox' && (
            <div className="mg-subcard">
              <div className="mg-subcard-head">
                <h2 className="mg-subcard-title">
                  <Sparkles size={16} color={game.accentColor} />
                  <span>DevEx Cashout (30,000 R$ Floor) &amp; Reverse Gamepass Price</span>
                </h2>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `${Number(rbxGross).toLocaleString('en-US')} R$ Gross`,
                      rbxResult.eligible
                        ? `$${rbxResult.usdPayout.toFixed(2)} USD (${rbxResult.creatorNetRobux.toLocaleString('en-US')} Net R$)`
                        : `Locked (${rbxResult.shortfallForMin.toLocaleString('en-US')} R$ short of 30K)`
                    )
                  }
                >
                  <Bookmark size={13} /> Pin Target
                </button>
              </div>

              <div className="mg-hero-answer mobile-answer-first">
                <div>
                  <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                    {rbxResult.eligible ? 'ELIGIBLE DEVEX USD CASHOUT' : 'DEVEX MINIMUM 30,000 EARNED R$ BLOCKER'}
                  </div>
                  <div
                    className="mg-hero-value"
                    style={{ color: rbxResult.eligible ? 'var(--teal-dark)' : 'var(--gold)' }}
                  >
                    {rbxResult.eligible
                      ? `$${rbxResult.usdPayout.toFixed(2)} USD`
                      : `Need +${rbxResult.shortfallForMin.toLocaleString('en-US')} Net R$`}
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink-secondary)' }}>
                  Net Earned: {rbxResult.creatorNetRobux.toLocaleString('en-US')} R$
                </div>
              </div>

              {!rbxResult.eligible && (
                <div className="hardware-slim-bar" style={{ marginTop: 0, marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={15} color="var(--gold)" />
                    <span>
                      Roblox DevEx requires at least <strong>30,000 net earned R$</strong> (currently at{' '}
                      <strong>{Math.min(100, Math.round((rbxResult.creatorNetRobux / 30000) * 100))}%</strong> —
                      projected value ~${rbxResult.usdPayout.toFixed(2)} once eligible).
                    </span>
                  </div>
                </div>
              )}

              <div className="mg-field-grid">
                <div className="mg-field">
                  <label htmlFor="rbx-gross">Gross Gamepass / Item Sales (R$)</label>
                  <input
                    id="rbx-gross"
                    type="number"
                    min={0}
                    step={5000}
                    className="deck-input no-icon mono"
                    value={rbxGross}
                    onChange={(e) => setRbxGross(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div className="mg-field">
                  <label htmlFor="rbx-rate">DevEx Tier Rate</label>
                  <select
                    id="rbx-rate"
                    className="deck-input no-icon"
                    value={rbxRateId}
                    onChange={(e) => setRbxRateId(e.target.value)}
                  >
                    {ROBLOX_RATES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mg-field">
                  <label htmlFor="rbx-split">Your Group Share (%)</label>
                  <input
                    id="rbx-split"
                    type="number"
                    min={1}
                    max={100}
                    className="deck-input no-icon mono"
                    value={rbxGroupSplit}
                    onChange={(e) => setRbxGroupSplit(Math.max(1, Math.min(100, Number(e.target.value) || 100)))}
                  />
                </div>
                <div className="mg-field">
                  <label htmlFor="rbx-target">Reverse Goal (Net R$ Wanted)</label>
                  <input
                    id="rbx-target"
                    type="number"
                    min={1}
                    step={1000}
                    className="deck-input no-icon mono"
                    value={rbxDesiredNet}
                    onChange={(e) => setRbxDesiredNet(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div className="mg-stat-mini-grid">
                <div className="mg-stat-mini">
                  <span>After 30% Market Fee</span>
                  <strong>{rbxResult.afterMarketFee.toLocaleString('en-US')} R$</strong>
                </div>
                <div className="mg-stat-mini">
                  <span>List Gamepass At</span>
                  <strong>{reverseGamepassPrice.toLocaleString('en-US')} R$</strong>
                </div>
                <div className="mg-stat-mini">
                  <span>Min Sales for 30K Net</span>
                  <strong>42,858 R$</strong>
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '0.76rem', color: 'var(--ink-muted)', lineHeight: 1.45 }}>
                Informational estimate only — not financial advice or a payout guarantee. Actual DevEx rates, tax withholding, and 13+ eligibility are governed solely by Roblox Corp. Zero data is collected on minors.
              </p>
            </div>
          )}

          {/* ==================== COUNTER-STRIKE 2 ==================== */}
          {game.id === 'cs2' && (
            <>
              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">
                    <Shield size={16} color={game.accentColor} />
                    <span>CS2 MR12 Loss-Bonus Ladder (-1 Step on Round Win)</span>
                  </h2>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() =>
                      handlePinSnapshot(
                        `${csSide} $${csCash} (Loss Lv ${csLossLevel})`,
                        `${csResult.callout} | Next Loss $${csResult.nextBonusOnLoss}`
                      )
                    }
                  >
                    <Bookmark size={13} /> Pin Round
                  </button>
                </div>

                <div className="mg-hero-answer mobile-answer-first">
                  <div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {csSide}-SIDE CALLOUT (FULL NEED: ${csResult.fullBuyNeed.toLocaleString('en-US')})
                    </div>
                    <div className="mg-hero-value">{csResult.callout}</div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>
                    Max Safe Eco Spend: ${csResult.maxSafeSpendForNextFullBuy.toLocaleString('en-US')}
                  </div>
                </div>

                <div className="filter-row">
                  <button
                    type="button"
                    className={`filter-pill ${csSide === 'CT' ? 'active' : ''}`}
                    onClick={() => setCsSide('CT')}
                  >
                    CT Side ($5,100 Full / $4,300 Core)
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${csSide === 'T' ? 'active' : ''}`}
                    onClick={() => setCsSide('T')}
                  >
                    T Side ($4,700 Full / $3,700 Core)
                  </button>
                  {csSide === 'T' && (
                    <button
                      type="button"
                      className={`filter-pill ${csBombPlanted ? 'active' : ''}`}
                      onClick={() => setCsBombPlanted((v) => !v)}
                    >
                      Bomb Plant (+$800)
                    </button>
                  )}
                </div>

                <div className="filter-row">
                  {CS2_LOSS_LADDER.map((bonus, lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={`filter-pill ${csLossLevel === lvl ? 'active' : ''}`}
                      onClick={() => setCsLossLevel(lvl)}
                    >
                      Lv {lvl}: ${bonus.toLocaleString('en-US')}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() => setCsLossLevel((l) => Math.max(0, l - 1))}
                  >
                    Round Won (-1 Step)
                  </button>
                </div>

                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="cs-cash">Your Current Bank ($0–$16,000)</label>
                    <input
                      id="cs-cash"
                      type="number"
                      min={0}
                      max={16000}
                      step={100}
                      className="deck-input no-icon mono"
                      value={csCash}
                      onChange={(e) => setCsCash(Math.max(0, Math.min(16000, Number(e.target.value) || 0)))}
                    />
                  </div>
                  <div className="mg-stat-mini">
                    <span>Next Loss Bonus Guarantee</span>
                    <strong>+${csResult.nextBonusOnLoss.toLocaleString('en-US')}</strong>
                  </div>
                  <div className="mg-stat-mini">
                    <span>Bank If Full Save</span>
                    <strong>${csResult.cashIfSaveAll.toLocaleString('en-US')}</strong>
                  </div>
                </div>
              </div>

              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">5-Player Squad Bank Drop Matrix</h2>
                  <span className="district-pill">
                    {csSquadStats.canBuyCount}/5 Can Core Buy · {csSquadStats.dropsAvailable} Rifle Drops
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
                  {csTeamCash.map((val, i) => (
                    <div key={i} className="mg-field">
                      <label htmlFor={`cs-p-${i}`}>P{i + 1} $</label>
                      <input
                        id={`cs-p-${i}`}
                        type="number"
                        step={100}
                        min={0}
                        max={16000}
                        className="deck-input no-icon mono"
                        style={{ padding: '7px 8px', textAlign: 'center' }}
                        value={val}
                        onChange={(e) => {
                          const num = Math.max(0, Math.min(16000, Number(e.target.value) || 0));
                          setCsTeamCash((prev) => prev.map((c, idx) => (idx === i ? num : c)));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ==================== VALORANT ==================== */}
          {game.id === 'valorant' && (
            <>
              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">
                    <Target size={16} color={game.accentColor} />
                    <span>Valorant Round Buy Matrix (3,900 Next-Round Guarantee)</span>
                  </h2>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() =>
                      handlePinSnapshot(
                        `${valCreds} Credits Buy`,
                        `Spend ${valResult.totalBuy} | Left ${valResult.leftover} | Next Min ${valResult.nextRoundMinOnLoss}`
                      )
                    }
                  >
                    <Bookmark size={13} /> Pin Buy
                  </button>
                </div>

                <div className="mg-hero-answer mobile-answer-first">
                  <div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      NEXT ROUND FLOOR IF LOST
                    </div>
                    <div
                      className="mg-hero-value"
                      style={{ color: valResult.nextRoundReady ? 'var(--teal-dark)' : 'var(--gold)' }}
                    >
                      {valResult.nextRoundMinOnLoss.toLocaleString('en-US')} Creds
                    </div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, color: valResult.nextRoundReady ? 'var(--teal-dark)' : 'var(--coral)' }}>
                    {valResult.nextRoundReady ? '3,900+ Full Buy Locked' : 'Short for Rifle + Heavy Next'}
                  </div>
                </div>

                <div className="mg-field-grid two-col">
                  <div className="mg-field">
                    <label htmlFor="val-creds">Current Credits</label>
                    <input
                      id="val-creds"
                      type="number"
                      min={0}
                      max={9000}
                      step={50}
                      className="deck-input no-icon mono"
                      value={valCreds}
                      onChange={(e) => setValCreds(Math.max(0, Math.min(9000, Number(e.target.value) || 0)))}
                    />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="val-weap">Primary Weapon</label>
                    <select id="val-weap" className="deck-input no-icon" value={valWeaponCost} onChange={(e) => setValWeaponCost(Number(e.target.value))}>
                      {VAL_WEAPONS.map((w) => (
                        <option key={w.id} value={w.cost}>{w.name} ({w.cost})</option>
                      ))}
                    </select>
                  </div>
                  <div className="mg-field">
                    <label htmlFor="val-armor">Armor Tier</label>
                    <select id="val-armor" className="deck-input no-icon" value={valArmorCost} onChange={(e) => setValArmorCost(Number(e.target.value))}>
                      {VAL_ARMOR.map((a) => (
                        <option key={a.id} value={a.cost}>{a.name} ({a.cost})</option>
                      ))}
                    </select>
                  </div>
                  <div className="mg-field">
                    <label htmlFor="val-util">Ability / Util Spend</label>
                    <input id="val-util" type="number" min={0} max={1200} step={50} className="deck-input no-icon mono" value={valUtilCost} onChange={(e) => setValUtilCost(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                </div>

                <div className="filter-row" style={{ marginTop: '12px', marginBottom: 0 }}>
                  {[
                    { streak: 0, label: '0 Losses (1,900 next)' },
                    { streak: 1, label: '1 Loss (2,400 next)' },
                    { streak: 2, label: '2+ Losses (2,900 max)' },
                  ].map((opt) => (
                    <button
                      key={opt.streak}
                      type="button"
                      className={`filter-pill ${valLossStreak === opt.streak ? 'active' : ''}`}
                      onClick={() => setValLossStreak(opt.streak)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">Ranked RR Climb EV Simulator</h2>
                  <span className="district-pill">
                    {valRrResult.positiveClimb
                      ? `~${valRrResult.matchesToPromote} Matches to Rank Up`
                      : 'Negative / Flat RR EV'}
                  </span>
                </div>
                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="val-cur-rr">Current RR (0–99)</label>
                    <input id="val-cur-rr" type="number" min={0} max={99} className="deck-input no-icon mono" value={valCurRr} onChange={(e) => setValCurRr(Number(e.target.value) || 0)} />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="val-wr">Win Rate %</label>
                    <input id="val-wr" type="number" min={1} max={99} className="deck-input no-icon mono" value={valWr} onChange={(e) => setValWr(Number(e.target.value) || 50)} />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="val-wrr">Avg +RR Win / -RR Loss</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <input type="number" aria-label="Avg win RR" className="deck-input no-icon mono" value={valWinRr} onChange={(e) => setValWinRr(Number(e.target.value) || 18)} />
                      <input type="number" aria-label="Avg loss RR" className="deck-input no-icon mono" value={valLossRr} onChange={(e) => setValLossRr(Number(e.target.value) || 16)} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================== APEX LEGENDS ==================== */}
          {game.id === 'apex-legends' && (
            <>
              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">
                    <Flame size={16} color={game.accentColor} />
                    <span>500-Pack Heirloom Pity Breakdown (Prestige Tiers 0–3)</span>
                  </h2>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() =>
                      handlePinSnapshot(
                        `Prestige ${apexPrestige} · Lv ${apexLevel}`,
                        `${apexTotalOpened}/500 Opened (${apexRemaining} to Shards)`
                      )
                    }
                  >
                    <Bookmark size={13} /> Pin Pity
                  </button>
                </div>

                <div className="mg-hero-answer mobile-answer-first">
                  <div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      GUARANTEED 150 SHARDS PROGRESS
                    </div>
                    <div className="mg-hero-value">
                      {apexTotalOpened} / 500 Packs ({Math.round((apexTotalOpened / 500) * 100)}%)
                    </div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>
                    {apexRemaining === 0 ? 'HEIRLOOM GUARANTEED!' : `${apexRemaining} Packs Remaining`}
                  </div>
                </div>

                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="apx-pres">Prestige Tier (0–3)</label>
                    <select id="apx-pres" className="deck-input no-icon" value={apexPrestige} onChange={(e) => setApexPrestige(Number(e.target.value))}>
                      <option value={0}>Tier 0 (Lv 1–500 · max 199 free)</option>
                      <option value={1}>Prestige 1 (Lv 501–1000)</option>
                      <option value={2}>Prestige 2 (Lv 1001–1500)</option>
                      <option value={3}>Prestige 3 (Lv 1501–2000)</option>
                    </select>
                  </div>
                  <div className="mg-field">
                    <label htmlFor="apx-lvl">Level Within Tier (1–500)</label>
                    <input id="apx-lvl" type="number" min={1} max={500} className="deck-input no-icon mono" value={apexLevel} onChange={(e) => setApexLevel(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="apx-bp">Battle Pass + Quest Packs</label>
                    <input id="apx-bp" type="number" min={0} max={300} className="deck-input no-icon mono" value={apexBpPacks} onChange={(e) => setApexBpPacks(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="apx-buy">Purchased Packs</label>
                    <input id="apx-buy" type="number" min={0} max={500} className="deck-input no-icon mono" value={apexPurchasedPacks} onChange={(e) => setApexPurchasedPacks(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                </div>
              </div>

              <div className="mg-subcard">
                <div className="mg-subcard-head">
                  <h2 className="mg-subcard-title">Ranked RP Match Estimator</h2>
                  <span className="district-pill">
                    {apexRpResult.alreadyReached
                      ? 'Tier Already Reached'
                      : apexRpResult.matchesNeeded !== null
                        ? `~${apexRpResult.matchesNeeded} Matches (${apexRpResult.rpGap.toLocaleString('en-US')} RP Gap)`
                        : 'Positive Net RP Needed'}
                  </span>
                </div>
                <div className="mg-field-grid">
                  <div className="mg-field">
                    <label htmlFor="apx-rp">Current Ranked RP</label>
                    <input id="apx-rp" type="number" min={0} step={200} className="deck-input no-icon mono" value={apexCurRp} onChange={(e) => setApexCurRp(Number(e.target.value) || 0)} />
                  </div>
                  <div className="mg-field">
                    <label htmlFor="apx-tier">Target Rank</label>
                    <select id="apx-tier" className="deck-input no-icon" value={apexTargetTier} onChange={(e) => setApexTargetTier(e.target.value)}>
                      {APEX_RANK_TIERS.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.thresholdRp.toLocaleString('en-US')} RP · -{t.entryCost} Entry)</option>
                      ))}
                    </select>
                  </div>
                  <div className="mg-field">
                    <label htmlFor="apx-avg">Avg Net RP / Match</label>
                    <input id="apx-avg" type="number" min={-100} max={350} step={5} className="deck-input no-icon mono" value={apexAvgRp} onChange={(e) => setApexAvgRp(Number(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================== GTA ONLINE ==================== */}
          {game.id === 'gta-v' && (
            <div className="mg-subcard">
              <div className="mg-subcard-head">
                <h2 className="mg-subcard-title">
                  <DollarSign size={16} color={game.accentColor} />
                  <span>Cayo Perico Payout Splitter (15% Crew Floor + Bag Optimizer)</span>
                </h2>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `${cayoPlayers}P Cayo (${cayoResult.hostPct}% Host)`,
                      `Host Net: $${(cayoResult.hostProfitAfterSetup + cayoEliteDollars).toLocaleString('en-US')}`
                    )
                  }
                >
                  <Bookmark size={13} /> Pin Payout
                </button>
              </div>

              <div className="mg-hero-answer mobile-answer-first">
                <div>
                  <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                    HOST NET PROFIT (AFTER $100K SETUP + PAVEL 2% + FENCE 10%)
                  </div>
                  <div className="mg-hero-value" style={{ color: 'var(--teal-dark)' }}>
                    ${(cayoResult.hostProfitAfterSetup + cayoEliteDollars).toLocaleString('en-US')}
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  Host Share: {cayoResult.hostPct}% (Cap {cayoResult.maxHostPct}%)
                </div>
              </div>

              <div className="filter-row">
                <button type="button" className={`filter-pill ${cayoHardMode ? 'active' : ''}`} onClick={() => setCayoHardMode((v) => !v)}>
                  Hard Mode (+10% Primary)
                </button>
                <button type="button" className={`filter-pill ${cayoEliteBonus ? 'active' : ''}`} onClick={() => setCayoEliteBonus((v) => !v)}>
                  Elite Challenge (+${(cayoHardMode ? 100000 : 50000).toLocaleString('en-US')})
                </button>
              </div>

              <div className="mg-field-grid">
                <div className="mg-field">
                  <label htmlFor="cayo-primary">Primary Target</label>
                  <select id="cayo-primary" className="deck-input no-icon" value={cayoPrimaryVal} onChange={(e) => setCayoPrimaryVal(Number(e.target.value))}>
                    {CAYO_TARGETS.map((t) => (
                      <option key={t.id} value={t.val}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mg-field">
                  <label htmlFor="cayo-bag">Secondary Bag Fill</label>
                  <select id="cayo-bag" className="deck-input no-icon" value={cayoSecondaryVal} onChange={(e) => setCayoSecondaryVal(Number(e.target.value))}>
                    {CAYO_BAGS.map((b) => (
                      <option key={b.id} value={b.val}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mg-field">
                  <label htmlFor="cayo-players">Squad Size</label>
                  <select
                    id="cayo-players"
                    className="deck-input no-icon"
                    value={cayoPlayers}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setCayoPlayers(p);
                      setCayoHostPct(p === 1 ? 100 : 100 - 15 * (p - 1));
                    }}
                  >
                    <option value={1}>Solo (100% Host)</option>
                    <option value={2}>Duo (Max 85% Host)</option>
                    <option value={3}>Trio (Max 70% Host)</option>
                    <option value={4}>Quad (Max 55% Host)</option>
                  </select>
                </div>
              </div>

              {cayoPlayers > 1 && (
                <div style={{ marginTop: '14px' }}>
                  <div className="meter-labels" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span>Host Cut (Min 15% per crew enforced)</span>
                    <strong className="mono">{cayoResult.hostPct}%</strong>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={cayoResult.maxHostPct}
                    step={5}
                    value={cayoResult.hostPct}
                    style={{
                      width: '100%',
                      '--pct': `${Math.round(((cayoResult.hostPct - 15) / Math.max(1, cayoResult.maxHostPct - 15)) * 100)}%`,
                    }}
                    onChange={(e) => setCayoHostPct(Number(e.target.value))}
                  />
                </div>
              )}

              <div className="mg-stat-mini-grid">
                <div className="mg-stat-mini">
                  <span>Pavel (2%) + Fence (10%)</span>
                  <strong>-${(cayoResult.pavelCut + cayoResult.fenceCut).toLocaleString('en-US')}</strong>
                </div>
                {cayoResult.crewPayouts.map((cp) => (
                  <div key={cp.label} className="mg-stat-mini">
                    <span>{cp.label} ({cp.pct}%)</span>
                    <strong>${(cp.payout + cayoEliteDollars).toLocaleString('en-US')}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT META REFERENCE + PER-GAME LOCAL PINS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="mg-meta-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
              <TrendingUp size={15} color={game.accentColor} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '0.96rem', fontWeight: 700 }}>
                {game.proMetaTitle}
              </h3>
            </div>

            {(game.proMetaRows || []).map((row) => (
              <div key={row.label} className="mg-meta-row">
                <strong>{row.label}</strong>
                <span>{row.val}</span>
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
              <button
                type="button"
                className="subtle-pill-btn"
                style={{ justifyContent: 'center' }}
                onClick={() =>
                  copyText(
                    formatDiscordSummary({
                      gameTitle: currentShareSpec.gameTitle,
                      headline: currentShareSpec.toolTitle,
                      heroLabel: currentShareSpec.heroLabel,
                      heroValue: currentShareSpec.heroValue,
                      rows: currentShareSpec.rows,
                    }),
                    'discord-spec'
                  )
                }
              >
                {copiedKey === 'discord-spec' ? <Check size={14} /> : <Copy size={14} />}
                <span>
                  {copiedKey === 'discord-spec'
                    ? 'Copied'
                    : copiedKey === 'blocked:discord-spec'
                      ? 'Copy Blocked'
                      : 'Copy Discord'}
                </span>
              </button>
              <button
                type="button"
                className="stage-dark-btn"
                style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                onClick={() => {
                  playSwitchTick(soundEnabled, 840);
                  downloadStudioSpecPng(currentShareSpec);
                }}
              >
                <Share2 size={14} />
                <span>Save PNG</span>
              </button>
              <button
                type="button"
                className="subtle-pill-btn share-link-wide-btn"
                data-share-url={currentShareUrl}
                onClick={() => copyText(currentShareUrl, 'share-url')}
              >
                {copiedKey === 'share-url' ? <Check size={14} /> : <Link2 size={14} />}
                <span>
                  {copiedKey === 'share-url'
                    ? 'Share Link Copied'
                    : copiedKey === 'blocked:share-url'
                      ? 'Copy Blocked — Use Address Bar'
                      : 'Copy Shareable Link'}
                </span>
              </button>
            </div>
          </div>

          <div className="mg-pin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '0.9rem' }}>
                <Compass size={15} color="var(--ocean)" />
                <span>Saved {game.shortTitle} Pins ({gamePins.length}{isPro ? '' : ' / 5 Free'})</span>
              </div>
              {!isPro && (
                <button type="button" className="subtle-pill-btn" onClick={onOpenProModal}>
                  Sync Cloud
                </button>
              )}
            </div>

            {pinNotice && (
              <div className="mono" style={{ fontSize: '0.76rem', color: 'var(--teal-dark)', marginBottom: '8px' }}>
                {pinNotice}
              </div>
            )}

            {gamePins.length === 0 ? (
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                {EMPTY_PIN_HINTS[game.id] || 'Pin any calculated target above for instant second-screen access.'}
              </p>
            ) : (
              gamePins.map((pin) => (
                <div key={pin.id} className="mg-pin-item">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                      {pin.label}
                    </div>
                    <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                      {pin.value}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="subtle-pill-btn"
                      aria-label={`Copy pinned ${pin.label}`}
                      onClick={() => copyText(pin.value, pin.id)}
                    >
                      {copiedKey === pin.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <button
                      type="button"
                      className="subtle-pill-btn"
                      aria-label={`Remove pinned ${pin.label}`}
                      onClick={() => onRemovePin(pin.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

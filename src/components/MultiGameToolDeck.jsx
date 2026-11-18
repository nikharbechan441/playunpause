import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Zap,
  Crosshair,
  Shield,
  DollarSign,
  Sparkles,
  Box,
  Trophy,
  Target,
  Flame,
} from 'lucide-react';
import { COD_MW4_WEAPONS } from '../data/games/allGames.js';
import { buildMultiGameShareUrl } from '../utils/shareUrlHelpers.js';
import { normalizeStudioTab } from '../utils/shareUrlHelpers.js';
import {
  clampNum,
  parseSafeNum,
  calcNetherCoords,
  checkPortalCollision,
  triangulateStronghold,
  calcCodTtk,
  CS2_LOSS_LADDER,
  calcCs2Economy,
  calcValorantEconomy,
  calcValorantRrClimb,
  calcFc27Tax,
  calcSbcSquadRating,
  ROBLOX_RATES,
  calcRobloxDevEx,
  calcFortniteXp,
  getFreeApexLevelPacks,
  calcApexRankedLadder,
  calcGtaOnlineHeist,
} from '../utils/gameMath.js';
import { playSwitchTick } from '../utils/soundHaptics.js';
import { copyTextReliably } from '../utils/clipboard.js';
import { GameStudioHeaderEmbed, GameStudioSideDock } from './games/GameStudioDock.jsx';

const CodWarzoneStudio = lazy(() => import('./games/CodWarzoneStudio.jsx'));
const FortniteStudio = lazy(() => import('./games/FortniteStudio.jsx'));
const MinecraftStudio = lazy(() => import('./games/MinecraftStudio.jsx'));
const EaFc27Studio = lazy(() => import('./games/EaFc27Studio.jsx'));
const RobloxStudio = lazy(() => import('./games/RobloxStudio.jsx'));
const Cs2EconomyStudio = lazy(() => import('./games/Cs2EconomyStudio.jsx'));
const ValorantStudio = lazy(() => import('./games/ValorantStudio.jsx'));
const ApexLegendsStudio = lazy(() => import('./games/ApexLegendsStudio.jsx'));
const GtaOnlineStudio = lazy(() => import('./games/GtaOnlineStudio.jsx'));

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

export default function MultiGameToolDeck({
  game,
  isPro,
  isEmbed = false,
  onOpenProModal,
  onOpenEmbedModal = null,
  runtimeConfig = null,
  clanTag = '',
  soundEnabled,
  savedPins = [],
  onSavePin,
  onRemovePin,
  initialPreset = null,
  presetKey = '',
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [pinNotice, setPinNotice] = useState('');
  const [pinLimitAlert, setPinLimitAlert] = useState(false);
  const [shareFallbackUrl, setShareFallbackUrl] = useState('');
  const [studioTab, setStudioTab] = useState(() =>
    normalizeStudioTab(game.id, initialPreset?.studioTab)
  );
  const copyTimerRef = useRef(null);
  const pinTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    },
    []
  );

  const gamePins = useMemo(
    () =>
      Array.isArray(savedPins)
        ? savedPins.filter(
            (p) =>
              p &&
              typeof p === 'object' &&
              typeof p.id === 'string' &&
              typeof p.gameId === 'string' &&
              p.gameId === game.id
          )
        : [],
    [savedPins, game.id]
  );

  useEffect(() => {
    if (gamePins.length < 120) {
      setPinLimitAlert(false);
    }
  }, [gamePins.length]);

  const flashCopied = (key) => {
    playSwitchTick(soundEnabled, 840);
    setCopiedKey(key);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyText = async (text, key, fallbackUrlOnFail = '') => {
    const ok = await copyTextReliably(text);
    if (ok) {
      setShareFallbackUrl('');
      flashCopied(key);
    } else {
      if (fallbackUrlOnFail) setShareFallbackUrl(fallbackUrlOnFail);
      flashCopied(`blocked:${key}`);
    }
  };

  const handlePinSnapshot = (label, value) => {
    if (!onSavePin) return;
    if (gamePins.length >= 120) {
      playSwitchTick(soundEnabled, 660);
      setPinLimitAlert(true);
      setPinNotice('Reached 120 saved pins — remove an older pin first.');
      return;
    }
    playSwitchTick(soundEnabled, 820);
    onSavePin({
      id: `${game.id}-${Date.now().toString(36)}`,
      gameId: game.id,
      label,
      value,
    });
    setPinLimitAlert(false);
    setPinNotice('Pinned locally.');
    if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    pinTimerRef.current = setTimeout(() => setPinNotice(''), 2000);
  };

  // ==================== 1. COD: WARZONE & MULTIPLAYER ====================
  const [weaponAId, setWeaponAId] = useState(() => initialPreset?.weaponAId ?? 'raal-mg');
  const [weaponBId, setWeaponBId] = useState(() => initialPreset?.weaponBId ?? 'c9-smg');
  const [customDmg, setCustomDmg] = useState(() => initialPreset?.codCustomDmg ?? 36);
  const [customRpm, setCustomRpm] = useState(() => initialPreset?.codCustomRpm ?? 882);
  const [useCustomStats, setUseCustomStats] = useState(() => Boolean(initialPreset?.codUseCustom));
  const [codOpenBolt, setCodOpenBolt] = useState(() => initialPreset?.codOpenBolt ?? true);
  const [codHp, setCodHp] = useState(() => initialPreset?.codHp ?? 300);
  const [codHeadshots, setCodHeadshots] = useState(() => initialPreset?.codHeadshots ?? 1);
  const [camoClassCount, setCamoClassCount] = useState(() => initialPreset?.camoClassCount ?? 21);
  const [camoMatchesPerGun, setCamoMatchesPerGun] = useState(
    () => initialPreset?.camoMatchesPerGun ?? 6
  );

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
        openBoltMs: codOpenBolt && !useCustomStats ? weaponAObj.openBoltMs : 0,
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
  const [fnCurLvl, setFnCurLvl] = useState(() => initialPreset?.fnLevel ?? 44);
  const [fnTargetLvl, setFnTargetLvl] = useState(() => initialPreset?.fnTarget ?? 200);
  const [fnDaysLeft, setFnDaysLeft] = useState(() => initialPreset?.fnDays ?? 28);
  const [fnIncludeDailies, setFnIncludeDailies] = useState(() => initialPreset?.fnDailies ?? true);
  const [fnIncludeCreative, setFnIncludeCreative] = useState(
    () => initialPreset?.fnCreative ?? true
  );
  const [fnIncludeLego, setFnIncludeLego] = useState(() => Boolean(initialPreset?.fnLego));

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
  const [mcDir, setMcDir] = useState(() => initialPreset?.mcDir ?? 'toNether');
  const [mcX, setMcX] = useState(() => String(initialPreset?.netherX ?? -20));
  const [mcY, setMcY] = useState(() => String(initialPreset?.netherY ?? 64));
  const [mcZ, setMcZ] = useState(() => String(initialPreset?.netherZ ?? 1023));
  const [portalBX, setPortalBX] = useState(() => String(initialPreset?.portalBX ?? 45));
  const [portalBY, setPortalBY] = useState(() => String(initialPreset?.portalBY ?? 64));
  const [portalBZ, setPortalBZ] = useState(() => String(initialPreset?.portalBZ ?? 980));
  const [throw1X, setThrow1X] = useState(() => String(initialPreset?.throw1X ?? 0));
  const [throw1Z, setThrow1Z] = useState(() => String(initialPreset?.throw1Z ?? 0));
  const [throw1Deg, setThrow1Deg] = useState(() => String(initialPreset?.throw1Deg ?? -45));
  const [throw2X, setThrow2X] = useState(() => String(initialPreset?.throw2X ?? 200));
  const [throw2Z, setThrow2Z] = useState(() => String(initialPreset?.throw2Z ?? 0));
  const [throw2Deg, setThrow2Deg] = useState(() => String(initialPreset?.throw2Deg ?? 45));

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
  const [eaBuyCoins, setEaBuyCoins] = useState(() => initialPreset?.buyPrice ?? 185000);
  const [eaSellCoins, setEaSellCoins] = useState(() => initialPreset?.sellPrice ?? 215000);
  const [eaQty, setEaQty] = useState(() => initialPreset?.quantity ?? 1);
  const [sbcRatings, setSbcRatings] = useState(() =>
    Array.isArray(initialPreset?.sbcRatings) && initialPreset.sbcRatings.length === 11
      ? initialPreset.sbcRatings
      : [86, 86, 85, 85, 85, 84, 84, 84, 84, 84, 84]
  );

  const eaTaxResult = useMemo(
    () => calcFc27Tax({ buyCoins: eaBuyCoins, sellCoins: eaSellCoins, quantity: eaQty }),
    [eaBuyCoins, eaSellCoins, eaQty]
  );
  const eaSbcResult = useMemo(() => calcSbcSquadRating(sbcRatings), [sbcRatings]);

  // ==================== 5. ROBLOX ====================
  const [rbxGross, setRbxGross] = useState(() => initialPreset?.robux ?? 50000);
  const [rbxRateId, setRbxRateId] = useState(() => initialPreset?.devexRate ?? 'std-2025');
  const [rbxGroupSplit, setRbxGroupSplit] = useState(() => initialPreset?.groupSplit ?? 100);
  const [rbxDesiredNet, setRbxDesiredNet] = useState(() => initialPreset?.desiredNet ?? 30000);
  const [rbxMode, setRbxMode] = useState(() => (initialPreset?.rbxMode === 'net' ? 'net' : 'gross'));

  useEffect(() => {
    if (!initialPreset) return;
    if (initialPreset.robux !== undefined) setRbxGross(initialPreset.robux);
    if (initialPreset.devexRate) setRbxRateId(initialPreset.devexRate);
    if (initialPreset.groupSplit !== undefined) setRbxGroupSplit(initialPreset.groupSplit);
    if (initialPreset.desiredNet !== undefined) setRbxDesiredNet(initialPreset.desiredNet);
    if (initialPreset.rbxMode !== undefined) {
      setRbxMode(initialPreset.rbxMode === 'net' ? 'net' : 'gross');
    }
  }, [presetKey]);

  const safeDesiredNet = clampNum(Math.round(parseSafeNum(rbxDesiredNet, 30000)), 1, 15000000);
  const safeGroupSplit = clampNum(Math.round(parseSafeNum(rbxGroupSplit, 100)), 1, 100);
  const activeRbxRate = ROBLOX_RATES.find((r) => r.id === rbxRateId) || ROBLOX_RATES[0];
  const desiredTargetUsd = Number((safeDesiredNet * activeRbxRate.usdPerRobux).toFixed(2));

  const rbxResult = useMemo(
    () =>
      calcRobloxDevEx({
        grossRobux: rbxGross,
        rateId: rbxRateId,
        groupSplitPct: safeGroupSplit,
        targetUsd: desiredTargetUsd,
        isNetEarned: rbxMode === 'net',
      }),
    [rbxGross, rbxRateId, safeGroupSplit, desiredTargetUsd, rbxMode]
  );
  const reverseGamepassPrice = Math.ceil(safeDesiredNet / (0.7 * (safeGroupSplit / 100)));

  // ==================== 6. COUNTER-STRIKE 2 ====================
  const [csCash, setCsCash] = useState(() => initialPreset?.cs2Cash ?? 3200);
  const [csLossLevel, setCsLossLevel] = useState(() => initialPreset?.cs2Loss ?? 1);
  const [csSide, setCsSide] = useState(() => initialPreset?.cs2Side ?? 'CT');
  const [csBombPlanted, setCsBombPlanted] = useState(() => Boolean(initialPreset?.cs2Plant));
  const [csTeamCash, setCsTeamCash] = useState(() =>
    Array.isArray(initialPreset?.csTeamCash) && initialPreset.csTeamCash.length === 5
      ? initialPreset.csTeamCash
      : [4900, 3200, 2100, 5600, 3800]
  );

  const csResult = useMemo(
    () =>
      calcCs2Economy({
        cash: csCash,
        lossLevel: csLossLevel,
        side: csSide,
        bombPlanted: csBombPlanted,
      }),
    [csCash, csLossLevel, csSide, csBombPlanted]
  );
  const csSquadStats = useMemo(() => {
    const need = csSide === 'CT' ? 4300 : 3700;
    const dropCost = csSide === 'CT' ? 3100 : 2700;
    const clampedTeam = csTeamCash.map((c) => clampNum(Math.round(parseSafeNum(c, 0)), 0, 16000));
    const total = clampedTeam.reduce((s, c) => s + c, 0);
    const canBuyCount = clampedTeam.filter((c) => c >= need).length;
    const dropsAvailable = clampedTeam.reduce(
      (d, c) => d + Math.max(0, Math.floor((c - need) / dropCost)),
      0
    );
    return { need, avg: Math.round(total / 5), canBuyCount, dropsAvailable };
  }, [csTeamCash, csSide]);

  // ==================== 7. VALORANT ====================
  const [valCreds, setValCreds] = useState(() => initialPreset?.valCreds ?? 3900);
  const [valWeaponCost, setValWeaponCost] = useState(() => initialPreset?.valWeapon ?? 2900);
  const [valArmorCost, setValArmorCost] = useState(() => initialPreset?.valArmor ?? 650);
  const [valUtilCost, setValUtilCost] = useState(() => initialPreset?.valUtil ?? 350);
  const [valLossStreak, setValLossStreak] = useState(() => initialPreset?.valLoss ?? 1);
  const [valCurRr, setValCurRr] = useState(() => initialPreset?.valRr ?? 44);
  const [valWr, setValWr] = useState(() => initialPreset?.valWr ?? 55);
  const [valWinRr, setValWinRr] = useState(() => initialPreset?.valWinRr ?? 21);
  const [valLossRr, setValLossRr] = useState(() => initialPreset?.valLossRr ?? 16);

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
    () =>
      calcValorantRrClimb({
        currentRr: valCurRr,
        winRatePct: valWr,
        avgWinRr: valWinRr,
        avgLossRr: valLossRr,
      }),
    [valCurRr, valWr, valWinRr, valLossRr]
  );

  // ==================== 8. APEX LEGENDS ====================
  const [apexLevel, setApexLevel] = useState(() => initialPreset?.apexLevel ?? 420);
  const [apexPrestige, setApexPrestige] = useState(() => initialPreset?.apexPrestige ?? 0);
  const [apexBpPacks, setApexBpPacks] = useState(() => initialPreset?.apexBp ?? 28);
  const [apexPurchasedPacks, setApexPurchasedPacks] = useState(
    () => initialPreset?.apexBought ?? 20
  );
  const [apexCurRp, setApexCurRp] = useState(() => initialPreset?.apexRp ?? 8400);
  const [apexTargetTier, setApexTargetTier] = useState(() => initialPreset?.apexTier ?? 'diamond');
  const [apexAvgRp, setApexAvgRp] = useState(() => initialPreset?.apexAvgRp ?? 95);

  const apexLevelPacks = useMemo(
    () => getFreeApexLevelPacks(apexLevel, apexPrestige),
    [apexLevel, apexPrestige]
  );
  const safeApexBp = clampNum(Math.round(parseSafeNum(apexBpPacks, 0)), 0, 300);
  const safeApexBought = clampNum(Math.round(parseSafeNum(apexPurchasedPacks, 0)), 0, 500);
  const apexLifetimePacks = apexLevelPacks + safeApexBp + safeApexBought;
  const apexTotalOpened = Math.min(500, apexLifetimePacks);
  const apexRemaining = Math.max(0, 500 - apexTotalOpened);
  const apexRpResult = useMemo(
    () =>
      calcApexRankedLadder({
        currentRp: apexCurRp,
        targetTierId: apexTargetTier,
        avgNetRpPerMatch: apexAvgRp,
      }),
    [apexCurRp, apexTargetTier, apexAvgRp]
  );

  // ==================== 9. GTA ONLINE (CAYO PERICO) ====================
  const [cayoPrimaryVal, setCayoPrimaryVal] = useState(
    () => initialPreset?.cayoPrimary ?? 1300000
  );
  const [cayoSecondaryVal, setCayoSecondaryVal] = useState(
    () => initialPreset?.cayoSecondary ?? 495000
  );
  const [cayoPlayers, setCayoPlayers] = useState(() => initialPreset?.cayoPlayers ?? 2);
  const [cayoHostPct, setCayoHostPct] = useState(() => initialPreset?.cayoHostPct ?? 85);
  const [cayoHardMode, setCayoHardMode] = useState(() => initialPreset?.cayoHard ?? true);
  const [cayoEliteBonus, setCayoEliteBonus] = useState(() => initialPreset?.cayoElite ?? true);

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
    setShareFallbackUrl('');
    setPinLimitAlert(false);
    const p = initialPreset;
    setStudioTab(normalizeStudioTab(game.id, p?.studioTab));
    if (!p || typeof p !== 'object') return;
    if (p.weaponAId) setWeaponAId(p.weaponAId);
    if (p.weaponBId) setWeaponBId(p.weaponBId);
    if (p.codHp !== undefined) setCodHp(p.codHp);
    if (p.codHeadshots !== undefined) setCodHeadshots(p.codHeadshots);
    if (p.codOpenBolt !== undefined) setCodOpenBolt(Boolean(p.codOpenBolt));
    if (p.codUseCustom !== undefined) setUseCustomStats(Boolean(p.codUseCustom));
    if (p.codCustomDmg !== undefined) setCustomDmg(p.codCustomDmg);
    if (p.codCustomRpm !== undefined) setCustomRpm(p.codCustomRpm);
    if (p.camoClassCount !== undefined) setCamoClassCount(p.camoClassCount);
    if (p.camoMatchesPerGun !== undefined) setCamoMatchesPerGun(p.camoMatchesPerGun);

    if (p.fnLevel !== undefined) setFnCurLvl(p.fnLevel);
    if (p.fnTarget !== undefined) setFnTargetLvl(p.fnTarget);
    if (p.fnDays !== undefined) setFnDaysLeft(p.fnDays);
    if (p.fnDailies !== undefined) setFnIncludeDailies(Boolean(p.fnDailies));
    if (p.fnCreative !== undefined) setFnIncludeCreative(Boolean(p.fnCreative));
    if (p.fnLego !== undefined) setFnIncludeLego(Boolean(p.fnLego));

    if (p.mcDir) setMcDir(p.mcDir);
    if (p.netherX !== undefined) setMcX(String(p.netherX));
    if (p.netherY !== undefined) setMcY(String(p.netherY));
    if (p.netherZ !== undefined) setMcZ(String(p.netherZ));
    if (p.portalBX !== undefined) setPortalBX(String(p.portalBX));
    if (p.portalBY !== undefined) setPortalBY(String(p.portalBY));
    if (p.portalBZ !== undefined) setPortalBZ(String(p.portalBZ));
    if (p.throw1X !== undefined) setThrow1X(String(p.throw1X));
    if (p.throw1Z !== undefined) setThrow1Z(String(p.throw1Z));
    if (p.throw1Deg !== undefined) setThrow1Deg(String(p.throw1Deg));
    if (p.throw2X !== undefined) setThrow2X(String(p.throw2X));
    if (p.throw2Z !== undefined) setThrow2Z(String(p.throw2Z));
    if (p.throw2Deg !== undefined) setThrow2Deg(String(p.throw2Deg));

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
    if (Array.isArray(p.csTeamCash) && p.csTeamCash.length === 5) setCsTeamCash(p.csTeamCash);

    if (p.valCreds !== undefined) setValCreds(p.valCreds);
    if (p.valWeapon !== undefined) setValWeaponCost(p.valWeapon);
    if (p.valArmor !== undefined) setValArmorCost(p.valArmor);
    if (p.valUtil !== undefined) setValUtilCost(p.valUtil);
    if (p.valLoss !== undefined) setValLossStreak(p.valLoss);
    if (p.valRr !== undefined) setValCurRr(p.valRr);
    if (p.valWr !== undefined) setValWr(p.valWr);
    if (p.valWinRr !== undefined) setValWinRr(p.valWinRr);
    if (p.valLossRr !== undefined) setValLossRr(p.valLossRr);

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
    if (p.cayoElite !== undefined) setCayoEliteBonus(Boolean(p.cayoElite));
  }, [presetKey, game.id]);

  const currentShareUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://playunpause.com';
    const rawPathname =
      typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : undefined;
    return buildMultiGameShareUrl(
      game.id,
      {
        studioTab,
        weaponAId,
        weaponBId,
        codHp,
        codHeadshots,
        codOpenBolt,
        codUseCustom: useCustomStats,
        codCustomDmg: customDmg,
        codCustomRpm: customRpm,
        camoClassCount,
        camoMatchesPerGun,
        fnLevel: fnCurLvl,
        fnTarget: fnTargetLvl,
        fnDays: fnDaysLeft,
        fnDailies: fnIncludeDailies,
        fnCreative: fnIncludeCreative,
        fnLego: fnIncludeLego,
        mcDir,
        netherX: mcX,
        netherY: mcY,
        netherZ: mcZ,
        portalBX,
        portalBY,
        portalBZ,
        throw1X,
        throw1Z,
        throw1Deg,
        throw2X,
        throw2Z,
        throw2Deg,
        buyPrice: eaBuyCoins,
        sellPrice: eaSellCoins,
        quantity: eaQty,
        sbcRatings,
        robux: rbxGross,
        devexRate: rbxRateId,
        groupSplit: rbxGroupSplit,
        desiredNet: rbxDesiredNet,
        cs2Side: csSide,
        cs2Cash: csCash,
        cs2Loss: csLossLevel,
        cs2Plant: csBombPlanted,
        csTeamCash,
        valCreds,
        valWeapon: valWeaponCost,
        valArmor: valArmorCost,
        valUtil: valUtilCost,
        valLoss: valLossStreak,
        valRr: valCurRr,
        valWr,
        valWinRr,
        valLossRr,
        apexLevel,
        apexPrestige,
        apexBp: apexBpPacks,
        apexBought: apexPurchasedPacks,
        apexTier: apexTargetTier,
        apexRp: apexCurRp,
        apexAvgRp,
        cayoPrimary: cayoPrimaryVal,
        cayoSecondary: cayoSecondaryVal,
        cayoPlayers,
        cayoHostPct,
        cayoHard: cayoHardMode,
        cayoElite: cayoEliteBonus,
      },
      origin,
      rawPathname
    );
  }, [
    game.id,
    studioTab,
    weaponAId,
    weaponBId,
    codHp,
    codHeadshots,
    codOpenBolt,
    useCustomStats,
    customDmg,
    customRpm,
    camoClassCount,
    camoMatchesPerGun,
    fnCurLvl,
    fnTargetLvl,
    fnDaysLeft,
    fnIncludeDailies,
    fnIncludeCreative,
    fnIncludeLego,
    mcDir,
    mcX,
    mcY,
    mcZ,
    portalBX,
    portalBY,
    portalBZ,
    throw1X,
    throw1Z,
    throw1Deg,
    throw2X,
    throw2Z,
    throw2Deg,
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
    csTeamCash,
    valCreds,
    valWeaponCost,
    valArmorCost,
    valUtilCost,
    valLossStreak,
    valCurRr,
    valWr,
    valWinRr,
    valLossRr,
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
    cayoEliteBonus,
  ]);

  const currentShareSpec = useMemo(() => {
    switch (game.id) {
      case 'cod-warzone':
        if (studioTab === 'camo') {
          return {
            gameTitle: game.shortTitle,
            toolTitle: '33-Weapon Camo Tracker',
            heroLabel: 'MASTERY CAMO REMAINING',
            heroValue: `${camoRemainingGuns} / 33 Guns`,
            heroSub: `~${camoMatchesLeft} Matches Left (${camoMatchesPerGun}/gun)`,
            accentColor: game.accentColor,
            fileSlug: 'unpause-mw4-camo',
            rows: [
              { label: 'Weapons Finished', value: `${camoClassCount} / 33` },
              { label: 'Avg Matches / Gun', value: `${camoMatchesPerGun}` },
              {
                label: 'Active Weapon A',
                value: `${useCustomStats ? `Custom (${customDmg} DMG)` : weaponAObj.name} (${ttkA.ttkMs} ms)`,
              },
            ],
          };
        }
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'MW4 / WZ TTK Spec',
          heroLabel: `${useCustomStats ? `Custom (${customDmg} DMG)` : weaponAObj.name} vs ${weaponBObj.name}`,
          heroValue: `${ttkA.ttkMs} vs ${ttkB.ttkMs} ms`,
          heroSub: `${codHp} HP · ${codHeadshots} HS`,
          accentColor: game.accentColor,
          fileSlug: `unpause-mw4-${useCustomStats ? 'custom' : weaponAObj.id}`,
          rows: [
            { label: 'Shots to Kill (A/B)', value: `${ttkA.shotsToKill} / ${ttkB.shotsToKill}` },
            {
              label: 'Open-Bolt Delay',
              value: codOpenBolt
                ? useCustomStats
                  ? 'Custom A: 0ms / B: ON'
                  : 'ON (+trigger delay)'
                : 'OFF',
            },
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
            {
              label: 'Passive XP/Day',
              value: `${fortniteResult.passiveXpPerDay.toLocaleString('en-US')}`,
            },
          ],
        };
      case 'minecraft':
        if (studioTab === 'stronghold') {
          return {
            gameTitle: game.shortTitle,
            toolTitle: 'Stronghold 2-Throw Finder',
            heroLabel: 'END PORTAL COORDS',
            heroValue: strongholdResult.valid
              ? `X:${strongholdResult.x} Z:${strongholdResult.z}`
              : 'Rays Parallel / Diverge',
            heroSub: strongholdResult.valid
              ? `Nether ${strongholdResult.netherX}, ${strongholdResult.netherZ}`
              : 'Walk 150+ blocks sideways & re-throw',
            accentColor: game.accentColor,
            fileSlug: 'unpause-minecraft-stronghold',
            rows: [
              {
                label: 'Walk from Throw #2',
                value: strongholdResult.valid ? `~${strongholdResult.distFromThrow2} blks` : 'N/A',
              },
              {
                label: 'Throw #1',
                value: `(${parseSafeNum(throw1X, 0)}, ${parseSafeNum(throw1Z, 0)}) @ ${parseSafeNum(throw1Deg, -45)}°`,
              },
              {
                label: 'Throw #2',
                value: `(${parseSafeNum(throw2X, 200)}, ${parseSafeNum(throw2Z, 0)}) @ ${parseSafeNum(throw2Deg, 45)}°`,
              },
            ],
          };
        }
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
            {
              label: '2nd Portal Check',
              value: mcCollision.conflictRisk ? 'LINK RISK' : 'ISOLATED',
            },
          ],
        };
      case 'ea-fc-27':
      case 'ea-fc-25':
        if (studioTab === 'sbc') {
          return {
            gameTitle: game.shortTitle,
            toolTitle: '4-3-3 SBC Squad Solver',
            heroLabel: 'EXACT SBC RATING',
            heroValue: `${eaSbcResult.rating} OVR`,
            heroSub: `Float ${eaSbcResult.exactFloat} · Mean ${eaSbcResult.avgFloat}`,
            accentColor: game.accentColor,
            fileSlug: 'unpause-fc27-sbc',
            rows: [
              { label: '11-Slot Squad', value: sbcRatings.join(',') },
              {
                label: `Tax Flip (${eaQty}x)`,
                value: `${eaTaxResult.totalProfit >= 0 ? '+' : ''}${eaTaxResult.totalProfit.toLocaleString('en-US')} (${eaTaxResult.roiPct}%)`,
              },
            ],
          };
        }
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'FUT Tax & SBC Spec',
          heroLabel: eaQty > 1 ? `NET PROFIT (${eaQty}x CARDS)` : 'NET PROFIT PER CARD',
          heroValue: `${eaTaxResult.totalProfit >= 0 ? '+' : ''}${eaTaxResult.totalProfit.toLocaleString('en-US')} (${eaTaxResult.roiPct}%)`,
          heroSub: `Min Sell ${eaTaxResult.minBreakEvenSnapped.toLocaleString('en-US')}`,
          accentColor: game.accentColor,
          fileSlug: 'unpause-fc27-tax',
          rows: [
            { label: '5% EA Tax / Card', value: `-${eaTaxResult.taxPerCard.toLocaleString('en-US')}` },
            {
              label: 'Net / Card & ROI',
              value: `${eaTaxResult.profitPerCard >= 0 ? '+' : ''}${eaTaxResult.profitPerCard.toLocaleString('en-US')} (${eaTaxResult.roiPct}%)`,
            },
            { label: '11-Player SBC', value: `${eaSbcResult.rating} OVR` },
          ],
        };
      case 'roblox':
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'DevEx Cashout Spec',
          heroLabel: 'DEVEX USD PAYOUT',
          heroValue: `$${rbxResult.usdPayout.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          heroSub: rbxResult.eligible ? 'DevEx Eligible (30K+)' : 'Below 30K Threshold',
          accentColor: game.accentColor,
          fileSlug: 'unpause-roblox-devex',
          rows: [
            {
              label: 'After 30% Cut',
              value: `${rbxResult.afterMarketFee.toLocaleString('en-US')} R$`,
            },
            {
              label: `Pass for ${safeDesiredNet.toLocaleString('en-US')} Net`,
              value: `${reverseGamepassPrice.toLocaleString('en-US')} R$`,
            },
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
        if (studioTab === 'rr') {
          return {
            gameTitle: game.shortTitle,
            toolTitle: 'Ranked RR Climb Spec',
            heroLabel: 'EXPECTED RR PER MATCH',
            heroValue: `${valRrResult.evPerMatch >= 0 ? '+' : ''}${valRrResult.evPerMatch} RR`,
            heroSub: valRrResult.positiveClimb
              ? `~${valRrResult.matchesToPromote} games to 100 RR`
              : 'Flat / Negative EV',
            accentColor: game.accentColor,
            fileSlug: 'unpause-valorant-rr',
            rows: [
              { label: 'RR Progress', value: `${valCurRr} / 100 (${valRrResult.rrNeeded} left)` },
              { label: 'WR / Avg Δ', value: `${valWr}% · +${valWinRr} / -${valLossRr}` },
              {
                label: 'Next Round Min',
                value: `${valResult.nextRoundMinOnLoss.toLocaleString('en-US')} Creds`,
              },
            ],
          };
        }
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'Buy Matrix Spec',
          heroLabel: 'NEXT ROUND IF LOST',
          heroValue: `${valResult.nextRoundMinOnLoss.toLocaleString('en-US')} Creds`,
          heroSub: valResult.nextRoundReady ? '3,900+ Locked' : 'Short on Full Buy',
          accentColor: game.accentColor,
          fileSlug: 'unpause-valorant-eco',
          rows: [
            {
              label: 'Spend (Gun+Armor+Util)',
              value: `${valResult.totalBuy.toLocaleString('en-US')} Creds`,
            },
            {
              label: 'RR Promotion Est.',
              value: valRrResult.positiveClimb ? `~${valRrResult.matchesToPromote} games` : 'Flat EV',
            },
          ],
        };
      case 'apex-legends':
        if (studioTab === 'ranked') {
          return {
            gameTitle: game.shortTitle,
            toolTitle: 'Ranked RP Climb Spec',
            heroLabel: `TARGET ${apexRpResult.tier.name.toUpperCase()} (${apexRpResult.tier.thresholdRp.toLocaleString('en-US')} RP)`,
            heroValue: apexRpResult.alreadyReached
              ? 'Target Reached'
              : apexRpResult.matchesNeeded !== null
                ? `~${apexRpResult.matchesNeeded} Matches`
                : 'Need +RP/Match',
            heroSub: `${Number(apexCurRp).toLocaleString('en-US')} RP · ${apexRpResult.rpGap.toLocaleString('en-US')} RP gap`,
            accentColor: game.accentColor,
            fileSlug: 'unpause-apex-ranked',
            rows: [
              { label: 'Avg Net RP / Match', value: `${apexAvgRp >= 0 ? '+' : ''}${apexAvgRp} RP` },
              { label: 'Entry Cost', value: `-${apexRpResult.tier.entryCost} RP` },
              { label: '500-Pack Pity', value: `${apexTotalOpened} / 500` },
            ],
          };
        }
        return {
          gameTitle: game.shortTitle,
          toolTitle: 'Heirloom Pity Spec',
          heroLabel: 'PACKS TOWARD 500 PITY',
          heroValue: `${apexTotalOpened} / 500`,
          heroSub:
            apexLifetimePacks > 500
              ? `500/500 pity cap (${apexLifetimePacks} lifetime)`
              : `${apexRemaining} packs remaining`,
          accentColor: game.accentColor,
          fileSlug: 'unpause-apex-pity',
          rows: [
            { label: 'Free Level Packs', value: `${apexLevelPacks}` },
            {
              label: 'Ranked Matches',
              value: apexRpResult.matchesNeeded === null ? 'N/A' : `${apexRpResult.matchesNeeded} avg`,
            },
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
            {
              label: 'Elite Bonus',
              value: cayoEliteBonus ? `ON (+$${cayoEliteDollars.toLocaleString('en-US')})` : 'OFF',
            },
            { label: 'Net Squad Pool', value: `$${cayoResult.netPool.toLocaleString('en-US')}` },
          ],
        };
    }
  }, [
    game,
    studioTab,
    weaponAObj,
    weaponBObj,
    ttkA,
    ttkB,
    codHp,
    codHeadshots,
    codOpenBolt,
    useCustomStats,
    customDmg,
    camoClassCount,
    camoMatchesPerGun,
    camoRemainingGuns,
    camoMatchesLeft,
    fortniteResult,
    fnCurLvl,
    fnTargetLvl,
    fnDaysLeft,
    mcDir,
    mcResult,
    mcCollision,
    strongholdResult,
    throw1X,
    throw1Z,
    throw1Deg,
    throw2X,
    throw2Z,
    throw2Deg,
    eaQty,
    eaTaxResult,
    eaSbcResult,
    sbcRatings,
    rbxResult,
    safeDesiredNet,
    reverseGamepassPrice,
    csResult,
    csSide,
    csSquadStats,
    csLossLevel,
    valResult,
    valCurRr,
    valWr,
    valWinRr,
    valLossRr,
    valRrResult,
    apexTotalOpened,
    apexLifetimePacks,
    apexRemaining,
    apexLevelPacks,
    apexCurRp,
    apexAvgRp,
    apexRpResult,
    cayoResult,
    cayoEliteBonus,
    cayoEliteDollars,
    cayoPlayers,
    cayoHardMode,
  ]);

  const IconComp = ICON_MAP[game.icon] || Sparkles;

  return (
    <div className="mg-workspace gs-workspace" data-game={game.id}>
      {isEmbed && <GameStudioHeaderEmbed game={game} icon={IconComp} />}

      <div className="mg-split-grid gs-split-grid">
        <div className="mg-stack-cards">
          <Suspense
            fallback={
              <div className="deck-panel gs-studio-skeleton" aria-busy="true">
                Loading {game.shortTitle} studio…
              </div>
            }
          >
            {game.id === 'cod-warzone' && (
              <CodWarzoneStudio
                game={game}
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                weaponAId={weaponAId}
                setWeaponAId={setWeaponAId}
                weaponBId={weaponBId}
                setWeaponBId={setWeaponBId}
                customDmg={customDmg}
                setCustomDmg={setCustomDmg}
                customRpm={customRpm}
                setCustomRpm={setCustomRpm}
                useCustomStats={useCustomStats}
                setUseCustomStats={setUseCustomStats}
                codOpenBolt={codOpenBolt}
                setCodOpenBolt={setCodOpenBolt}
                codHp={codHp}
                setCodHp={setCodHp}
                codHeadshots={codHeadshots}
                setCodHeadshots={setCodHeadshots}
                camoClassCount={camoClassCount}
                setCamoClassCount={setCamoClassCount}
                camoMatchesPerGun={camoMatchesPerGun}
                setCamoMatchesPerGun={setCamoMatchesPerGun}
                weaponAObj={weaponAObj}
                weaponBObj={weaponBObj}
                ttkA={ttkA}
                ttkB={ttkB}
                camoRemainingGuns={camoRemainingGuns}
                camoMatchesLeft={camoMatchesLeft}
                studioMode={studioTab}
                setStudioMode={setStudioTab}
              />
            )}

            {game.id === 'fortnite' && (
              <FortniteStudio
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                fnCurLvl={fnCurLvl}
                setFnCurLvl={setFnCurLvl}
                fnTargetLvl={fnTargetLvl}
                setFnTargetLvl={setFnTargetLvl}
                fnDaysLeft={fnDaysLeft}
                setFnDaysLeft={setFnDaysLeft}
                fnIncludeDailies={fnIncludeDailies}
                setFnIncludeDailies={setFnIncludeDailies}
                fnIncludeCreative={fnIncludeCreative}
                setFnIncludeCreative={setFnIncludeCreative}
                fnIncludeLego={fnIncludeLego}
                setFnIncludeLego={setFnIncludeLego}
                fortniteResult={fortniteResult}
              />
            )}

            {game.id === 'minecraft' && (
              <MinecraftStudio
                game={game}
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                copyText={copyText}
                copiedKey={copiedKey}
                mcDir={mcDir}
                setMcDir={setMcDir}
                mcX={mcX}
                setMcX={setMcX}
                mcY={mcY}
                setMcY={setMcY}
                mcZ={mcZ}
                setMcZ={setMcZ}
                portalBX={portalBX}
                setPortalBX={setPortalBX}
                portalBY={portalBY}
                setPortalBY={setPortalBY}
                portalBZ={portalBZ}
                setPortalBZ={setPortalBZ}
                throw1X={throw1X}
                setThrow1X={setThrow1X}
                throw1Z={throw1Z}
                setThrow1Z={setThrow1Z}
                throw1Deg={throw1Deg}
                setThrow1Deg={setThrow1Deg}
                throw2X={throw2X}
                setThrow2X={setThrow2X}
                throw2Z={throw2Z}
                setThrow2Z={setThrow2Z}
                throw2Deg={throw2Deg}
                setThrow2Deg={setThrow2Deg}
                mcResult={mcResult}
                mcCollision={mcCollision}
                strongholdResult={strongholdResult}
                mcTab={studioTab}
                setMcTab={setStudioTab}
              />
            )}

            {(game.id === 'ea-fc-27' || game.id === 'ea-fc-25') && (
              <EaFc27Studio
                game={game}
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                eaBuyCoins={eaBuyCoins}
                setEaBuyCoins={setEaBuyCoins}
                eaSellCoins={eaSellCoins}
                setEaSellCoins={setEaSellCoins}
                eaQty={eaQty}
                setEaQty={setEaQty}
                sbcRatings={sbcRatings}
                setSbcRatings={setSbcRatings}
                eaTaxResult={eaTaxResult}
                eaSbcResult={eaSbcResult}
                fcTab={studioTab}
                setFcTab={setStudioTab}
              />
            )}

            {game.id === 'roblox' && (
              <RobloxStudio
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                rbxGross={rbxGross}
                setRbxGross={setRbxGross}
                rbxRateId={rbxRateId}
                setRbxRateId={setRbxRateId}
                rbxGroupSplit={rbxGroupSplit}
                setRbxGroupSplit={setRbxGroupSplit}
                rbxDesiredNet={rbxDesiredNet}
                setRbxDesiredNet={setRbxDesiredNet}
                rbxMode={rbxMode}
                setRbxMode={setRbxMode}
                rbxResult={rbxResult}
                reverseGamepassPrice={reverseGamepassPrice}
              />
            )}

            {game.id === 'cs2' && (
              <Cs2EconomyStudio
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                csCash={csCash}
                setCsCash={setCsCash}
                csLossLevel={csLossLevel}
                setCsLossLevel={setCsLossLevel}
                csSide={csSide}
                setCsSide={setCsSide}
                csBombPlanted={csBombPlanted}
                setCsBombPlanted={setCsBombPlanted}
                csTeamCash={csTeamCash}
                setCsTeamCash={setCsTeamCash}
                csResult={csResult}
                csSquadStats={csSquadStats}
              />
            )}

            {game.id === 'valorant' && (
              <ValorantStudio
                game={game}
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                valCreds={valCreds}
                setValCreds={setValCreds}
                valWeaponCost={valWeaponCost}
                setValWeaponCost={setValWeaponCost}
                valArmorCost={valArmorCost}
                setValArmorCost={setValArmorCost}
                valUtilCost={valUtilCost}
                setValUtilCost={setValUtilCost}
                valLossStreak={valLossStreak}
                setValLossStreak={setValLossStreak}
                valCurRr={valCurRr}
                setValCurRr={setValCurRr}
                valWr={valWr}
                setValWr={setValWr}
                valWinRr={valWinRr}
                setValWinRr={setValWinRr}
                valLossRr={valLossRr}
                setValLossRr={setValLossRr}
                valResult={valResult}
                valRrResult={valRrResult}
                valMode={studioTab}
                setValMode={setStudioTab}
              />
            )}

            {game.id === 'apex-legends' && (
              <ApexLegendsStudio
                game={game}
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                apexLevel={apexLevel}
                setApexLevel={setApexLevel}
                apexPrestige={apexPrestige}
                setApexPrestige={setApexPrestige}
                apexBpPacks={apexBpPacks}
                setApexBpPacks={setApexBpPacks}
                apexPurchasedPacks={apexPurchasedPacks}
                setApexPurchasedPacks={setApexPurchasedPacks}
                apexCurRp={apexCurRp}
                setApexCurRp={setApexCurRp}
                apexTargetTier={apexTargetTier}
                setApexTargetTier={setApexTargetTier}
                apexAvgRp={apexAvgRp}
                setApexAvgRp={setApexAvgRp}
                apexLevelPacks={apexLevelPacks}
                apexTotalOpened={apexTotalOpened}
                apexRemaining={apexRemaining}
                apexLifetimePacks={apexLifetimePacks}
                apexRpResult={apexRpResult}
                apexMode={studioTab}
                setApexMode={setStudioTab}
              />
            )}

            {game.id === 'gta-v' && (
              <GtaOnlineStudio
                soundEnabled={soundEnabled}
                playTick={playSwitchTick}
                onPinSnapshot={handlePinSnapshot}
                cayoPrimaryVal={cayoPrimaryVal}
                setCayoPrimaryVal={setCayoPrimaryVal}
                cayoSecondaryVal={cayoSecondaryVal}
                setCayoSecondaryVal={setCayoSecondaryVal}
                cayoPlayers={cayoPlayers}
                setCayoPlayers={setCayoPlayers}
                cayoHostPct={cayoHostPct}
                setCayoHostPct={setCayoHostPct}
                cayoHardMode={cayoHardMode}
                setCayoHardMode={setCayoHardMode}
                cayoEliteBonus={cayoEliteBonus}
                setCayoEliteBonus={setCayoEliteBonus}
                cayoResult={cayoResult}
                cayoEliteDollars={cayoEliteDollars}
              />
            )}
          </Suspense>
        </div>

        <GameStudioSideDock
          game={game}
          isPro={isPro}
          isEmbed={isEmbed}
          onOpenProModal={onOpenProModal}
          onOpenEmbedModal={onOpenEmbedModal}
          runtimeConfig={runtimeConfig}
          clanTag={clanTag}
          soundEnabled={soundEnabled}
          gamePins={gamePins}
          pinNotice={pinNotice}
          pinLimitAlert={pinLimitAlert}
          EMPTY_PIN_HINTS={EMPTY_PIN_HINTS}
          onRemovePin={onRemovePin}
          currentShareSpec={currentShareSpec}
          currentShareUrl={currentShareUrl}
          copiedKey={copiedKey}
          shareFallbackUrl={shareFallbackUrl}
          copyText={copyText}
        />
      </div>
    </div>
  );
}

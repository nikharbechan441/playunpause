/**
 * Canonical stateful Share URL builders, countdown formatters, and Heist crew slicing helpers.
 * Shared across CSR components and SSR/unit tests so every control round-trips cleanly.
 */
import { CANONICAL_ORIGIN, GAME_TO_CANONICAL_PATH } from '../data/seoRoutes.js';
import { parseSafeNum } from './gameMath.js';

export function formatDurationMinutes(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours === 0) return `${rem}m`;
  return `${hours}h ${rem}m`;
}

export function formatCountdownMs(diffMs) {
  if (diffMs <= 0) return 'Live Now (NZ Unlocked)';
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

export const DEFAULT_HEIST_CREW = [
  { id: 'p1', name: 'Host / Lead', role: 'HOST', pct: 40, locked: false },
  { id: 'p2', name: 'Co-Lead', role: 'CREW #2', pct: 30, locked: false },
  { id: 'p3', name: 'Wheelman', role: 'DRIVER', pct: 15, locked: false },
  { id: 'p4', name: 'Tech', role: 'HACKER', pct: 15, locked: false },
];

export function normalizeHeistSubTab(raw) {
  return raw === 'market' || raw === 'stocks' ? 'market' : 'heist';
}

/**
 * Builds the exact active crew array (2, 3, or 4 members) from a validated cuts array.
 * Prevents 2-player Duo / 3-player Trio presets or deep links from rendering 0% ghost rows.
 */
export function buildCrewFromCuts(cutsArr, templateCrew = DEFAULT_HEIST_CREW) {
  const source = Array.isArray(templateCrew) && templateCrew.length >= 4 ? templateCrew : DEFAULT_HEIST_CREW;
  const cloneDefault = () => source.map((m) => ({ ...m, locked: false }));

  if (!Array.isArray(cutsArr) || cutsArr.length < 2 || cutsArr.length > 4) {
    return cloneDefault();
  }
  const normalized = cutsArr.map((v) => Math.round(Number(v)));
  if (normalized.some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
    return cloneDefault();
  }
  if (normalized.reduce((a, b) => a + b, 0) !== 100) {
    return cloneDefault();
  }
  return source.slice(0, normalized.length).map((m, idx) => ({
    ...m,
    pct: normalized[idx],
    locked: false,
  }));
}

function resolveOrigin(originOverride) {
  if (originOverride && typeof originOverride === 'string') return originOverride.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return CANONICAL_ORIGIN;
}

function resolveScopedPath(defaultBase, pathnameOverride) {
  const raw =
    typeof pathnameOverride === 'string' && pathnameOverride
      ? pathnameOverride
      : typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : defaultBase;
  if (defaultBase !== '/' && (raw === defaultBase || raw.startsWith(`${defaultBase}/`))) {
    return raw;
  }
  return defaultBase;
}

function formatQueryString(entries) {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function buildStorageSharePath(
  { consoleId = 'xss-512', freeGb = 140, includePatch = false, mbps = 120, customOffsetGb = 0, sacrificedIds = [] } = {},
  pathnameOverride
) {
  const base = resolveScopedPath('/gta-6/storage', pathnameOverride);
  const offset = Math.round(parseSafeNum(customOffsetGb, 0));
  const cleanIds = Array.isArray(sacrificedIds) ? sacrificedIds.filter(Boolean) : [];
  const entries = [
    ['c', consoleId],
    ['free', Math.round(parseSafeNum(freeGb, 140))],
    ['patch', includePatch ? 1 : 0],
    ['mbps', Math.round(parseSafeNum(mbps, 120))],
  ];
  if (offset !== 0) entries.push(['offset', offset]);
  if (cleanIds.length > 0) entries.push(['uninstalled', cleanIds.join(',')]);
  return `${base}${formatQueryString(entries)}`;
}

export function buildStorageShareUrl(state, originOverride, pathnameOverride) {
  return `${resolveOrigin(originOverride)}${buildStorageSharePath(state, pathnameOverride)}`;
}

export function buildSafeCodesSharePath(
  { district = 'All', safeId = '', query = '' } = {},
  pathnameOverride
) {
  const base = resolveScopedPath('/gta-6/safe-codes', pathnameOverride);
  const cleanQuery = String(query || '').trim();
  const entries = [['dist', district || 'All']];
  if (safeId) entries.push(['safe', safeId]);
  if (cleanQuery) entries.push(['q', cleanQuery]);
  return `${base}${formatQueryString(entries)}`;
}

export function buildSafeCodesShareUrl(state, originOverride, pathnameOverride) {
  return `${resolveOrigin(originOverride)}${buildSafeCodesSharePath(state, pathnameOverride)}`;
}

export function buildHeistMarketSharePath(
  { subTab = 'heist', gross = 2450000, fee = 12, cuts = [40, 30, 15, 15], seedCash = 1600000 } = {},
  pathnameOverride
) {
  const base = resolveScopedPath('/gta-6/heist-split', pathnameOverride);
  const normalizedSub = normalizeHeistSubTab(subTab);
  const cleanCuts = Array.isArray(cuts) && cuts.length >= 2 ? cuts : [40, 30, 15, 15];
  const cleanSeed = Math.round(parseSafeNum(seedCash, 1600000));
  const entries = [
    ['sub', normalizedSub],
    ['gross', Math.round(parseSafeNum(gross, 2450000))],
    ['fee', Math.round(parseSafeNum(fee, 12))],
    ['cuts', cleanCuts.join(',')],
  ];
  if (normalizedSub === 'market' || cleanSeed !== 1600000) {
    entries.push(['seed', cleanSeed]);
  }
  return `${base}${formatQueryString(entries)}`;
}

export function buildHeistMarketShareUrl(state, originOverride, pathnameOverride) {
  return `${resolveOrigin(originOverride)}${buildHeistMarketSharePath(state, pathnameOverride)}`;
}

export function buildNightRunSharePath({ mins = 45, waypointId = '' } = {}, pathnameOverride) {
  const base = resolveScopedPath('/gta-6/night-run', pathnameOverride);
  const entries = [['mins', Math.round(parseSafeNum(mins, 45))]];
  if (waypointId) entries.push(['wp', waypointId]);
  return `${base}${formatQueryString(entries)}`;
}

export function buildNightRunShareUrl(state, originOverride, pathnameOverride) {
  return `${resolveOrigin(originOverride)}${buildNightRunSharePath(state, pathnameOverride)}`;
}

export function buildMultiGameSharePath(gameId, state = {}, pathnameOverride) {
  const canonicalKey = gameId === 'ea-fc-25' ? 'ea-fc-27' : gameId;
  const defaultBase = GAME_TO_CANONICAL_PATH[canonicalKey] || '/';
  const base = resolveScopedPath(defaultBase, pathnameOverride);
  let entries = [];

  switch (canonicalKey) {
    case 'cod-warzone':
      entries = [
        ['a', state.weaponAId ?? 'raal-mg'],
        ['b', state.weaponBId ?? 'c9-smg'],
        ['hp', Math.round(parseSafeNum(state.codHp, 300))],
        ['hs', Math.round(parseSafeNum(state.codHeadshots, 1))],
        ['bolt', state.codOpenBolt ? 1 : 0],
        ['custom', state.codUseCustom ? 1 : 0],
        ['dmg', Math.round(parseSafeNum(state.codCustomDmg, 36))],
        ['rpm', Math.round(parseSafeNum(state.codCustomRpm, 882))],
        ['classes', Math.round(parseSafeNum(state.camoClassCount, 21))],
        ['mpgun', Math.round(parseSafeNum(state.camoMatchesPerGun, 6))],
      ];
      break;
    case 'fortnite':
      entries = [
        ['lvl', Math.round(parseSafeNum(state.fnLevel, 44))],
        ['target', Math.round(parseSafeNum(state.fnTarget, 200))],
        ['days', Math.round(parseSafeNum(state.fnDays, 28))],
        ['dailies', (state.fnDailies ?? true) ? 1 : 0],
        ['creative', (state.fnCreative ?? true) ? 1 : 0],
        ['lego', state.fnLego ? 1 : 0],
      ];
      break;
    case 'minecraft':
      entries = [
        ['dir', state.mcDir ?? 'toNether'],
        ['x', Math.round(parseSafeNum(state.netherX, -20))],
        ['y', Math.round(parseSafeNum(state.netherY, 64))],
        ['z', Math.round(parseSafeNum(state.netherZ, 1023))],
        ['bx', Math.round(parseSafeNum(state.portalBX, 45))],
        ['by', Math.round(parseSafeNum(state.portalBY, 64))],
        ['bz', Math.round(parseSafeNum(state.portalBZ, 980))],
        ['t1x', parseSafeNum(state.throw1X, 0)],
        ['t1z', parseSafeNum(state.throw1Z, 0)],
        ['t1d', parseSafeNum(state.throw1Deg, -45)],
        ['t2x', parseSafeNum(state.throw2X, 200)],
        ['t2z', parseSafeNum(state.throw2Z, 0)],
        ['t2d', parseSafeNum(state.throw2Deg, 45)],
      ];
      break;
    case 'ea-fc-27':
      entries = [
        ['buy', Math.round(parseSafeNum(state.buyPrice, 185000))],
        ['sell', Math.round(parseSafeNum(state.sellPrice, 215000))],
        ['qty', Math.round(parseSafeNum(state.quantity, 1))],
        ['sbc', Array.isArray(state.sbcRatings) ? state.sbcRatings.join(',') : '86,86,85,85,85,84,84,84,84,84,84'],
      ];
      break;
    case 'roblox':
      entries = [
        ['robux', Math.round(parseSafeNum(state.robux, 50000))],
        ['rate', state.devexRate ?? 'std-2025'],
        ['split', Math.round(parseSafeNum(state.groupSplit, 100))],
        ['net', Math.round(parseSafeNum(state.desiredNet, 30000))],
      ];
      break;
    case 'cs2':
      entries = [
        ['side', state.cs2Side ?? 'CT'],
        ['cash', Math.round(parseSafeNum(state.cs2Cash, 3200))],
        ['loss', Math.round(parseSafeNum(state.cs2Loss, 1))],
        ['plant', state.cs2Plant ? 1 : 0],
        ['team', Array.isArray(state.csTeamCash) ? state.csTeamCash.join(',') : '4900,3200,2100,5600,3800'],
      ];
      break;
    case 'valorant':
      entries = [
        ['cred', Math.round(parseSafeNum(state.valCreds, 3900))],
        ['vw', Math.round(parseSafeNum(state.valWeapon, 2900))],
        ['va', Math.round(parseSafeNum(state.valArmor, 650))],
        ['vu', Math.round(parseSafeNum(state.valUtil, 350))],
        ['vl', Math.round(parseSafeNum(state.valLoss, 1))],
        ['rr', Math.round(parseSafeNum(state.valRr, 44))],
        ['wr', Math.round(parseSafeNum(state.valWr, 55))],
        ['winRr', Math.round(parseSafeNum(state.valWinRr, 21))],
        ['lossRr', Math.round(parseSafeNum(state.valLossRr, 16))],
      ];
      break;
    case 'apex-legends':
      entries = [
        ['apexLvl', Math.round(parseSafeNum(state.apexLevel, 420))],
        ['prestige', Math.round(parseSafeNum(state.apexPrestige, 0))],
        ['bp', Math.round(parseSafeNum(state.apexBp, 28))],
        ['bought', Math.round(parseSafeNum(state.apexBought, 20))],
        ['tier', state.apexTier ?? 'diamond'],
        ['apexRp', Math.round(parseSafeNum(state.apexRp, 8400))],
        ['avgRp', Math.round(parseSafeNum(state.apexAvgRp, 95))],
      ];
      break;
    case 'gta-v':
      entries = [
        ['cayo', Math.round(parseSafeNum(state.cayoPrimary, 1300000))],
        ['csec', Math.round(parseSafeNum(state.cayoSecondary, 495000))],
        ['players', Math.round(parseSafeNum(state.cayoPlayers, 2))],
        ['hostPct', Math.round(parseSafeNum(state.cayoHostPct, 85))],
        ['hard', (state.cayoHard ?? true) ? 1 : 0],
        ['elite', (state.cayoElite ?? true) ? 1 : 0],
      ];
      break;
    default:
      entries = [];
  }

  return `${base}${formatQueryString(entries)}`;
}

export function buildMultiGameShareUrl(gameId, state, originOverride, pathnameOverride) {
  return `${resolveOrigin(originOverride)}${buildMultiGameSharePath(gameId, state, pathnameOverride)}`;
}

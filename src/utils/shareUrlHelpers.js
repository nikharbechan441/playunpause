/**
 * Canonical stateful Share URL builders, countdown formatters, and Heist crew slicing helpers.
 * Shared across CSR components and SSR/unit tests so every control round-trips cleanly.
 */
import { CANONICAL_ORIGIN, GAME_TO_CANONICAL_PATH } from '../data/seoRoutes.js';
import { clampNum, parseSafeNum } from './gameMath.js';

function safeIntBound(raw, fallback, min, max) {
  const n = clampNum(Math.round(parseSafeNum(raw, fallback)), min, max);
  return n === 0 ? 0 : n;
}

function safeFloatBound(raw, fallback, min, max, decimals = 2) {
  const factor = 10 ** decimals;
  const clamped = clampNum(parseSafeNum(raw, fallback), min, max);
  const rounded = Math.round(clamped * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

const BLOCKED_SHARE_STRINGS = new Set([
  'NaN',
  'Infinity',
  '-Infinity',
  'undefined',
  'null',
  '__proto__',
  'constructor',
  'prototype',
  'toString',
]);

function sanitizeStr(raw, maxLen = 64, fallback = '') {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (m) => (m.length === 2 ? m : ''))
    .replace(/[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();
  if (!cleaned || BLOCKED_SHARE_STRINGS.has(cleaned) || /^\[object\s+[^\]]+\]$/i.test(cleaned)) {
    return fallback;
  }
  let out = '';
  for (const ch of cleaned) {
    if (out.length + ch.length > maxLen) break;
    out += ch;
  }
  if (!out || BLOCKED_SHARE_STRINGS.has(out) || /^\[object\s+[^\]]+\]$/i.test(out)) {
    return fallback;
  }
  return out;
}

export function formatDurationMinutes(totalMinutes) {
  const safe = parseSafeNum(totalMinutes, 0);
  const mins = clampNum(Math.round(safe), 0, 100000000);
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours === 0) return `${rem}m`;
  return `${hours}h ${rem}m`;
}

export function formatCountdownMs(diffMs) {
  const safe = parseSafeNum(diffMs, 0);
  if (safe <= 0) return 'Live Now (NZ Unlocked)';
  const totalSec = Math.floor(Math.min(safe, 1e15) / 1000);
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
  const normalized = cutsArr.map((v) => {
    const r = Math.round(parseSafeNum(v, -1));
    return r === 0 ? 0 : r;
  });
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
  if (originOverride && typeof originOverride === 'string') {
    const candidate = sanitizeStr(originOverride, 256, '').replace(/\/+$/, '');
    try {
      const parsed = new URL(candidate);
      if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.origin !== 'null') {
        return parsed.origin;
      }
    } catch {
      // fall through to window.location.origin or CANONICAL_ORIGIN
    }
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const winOrigin = String(window.location.origin);
    if (/^https?:\/\//i.test(winOrigin)) return winOrigin.replace(/\/+$/, '');
  }
  return CANONICAL_ORIGIN;
}

function resolveScopedPath(defaultBase, pathnameOverride) {
  const raw =
    typeof pathnameOverride === 'string' && pathnameOverride
      ? pathnameOverride
      : typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : defaultBase;
  const clean = sanitizeStr(raw, 256, '');
  if (
    clean &&
    !clean.includes('//') &&
    !clean.includes('\\') &&
    !clean.includes('?') &&
    !clean.includes('#') &&
    defaultBase !== '/' &&
    (clean === defaultBase || clean.startsWith(`${defaultBase}/`))
  ) {
    return clean;
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

export function buildStorageSharePath(rawState, pathnameOverride) {
  const s = rawState && typeof rawState === 'object' ? rawState : {};
  const base = resolveScopedPath('/gta-6/storage', pathnameOverride);
  const offset = safeIntBound(s.customOffsetGb, 0, -60, 120);
  const cleanIds = Array.isArray(s.sacrificedIds)
    ? s.sacrificedIds.map((id) => sanitizeStr(id, 48, '')).filter(Boolean).slice(0, 15)
    : [];
  const entries = [
    ['c', sanitizeStr(s.consoleId ?? 'xss-512', 32, 'xss-512')],
    ['free', safeIntBound(s.freeGb, 140, 0, 2000)],
    ['patch', s.includePatch ? 1 : 0],
    ['mbps', safeIntBound(s.mbps, 120, 10, 2500)],
  ];
  if (offset !== 0) entries.push(['offset', offset]);
  if (cleanIds.length > 0) entries.push(['uninstalled', cleanIds.join(',')]);
  return `${base}${formatQueryString(entries)}`;
}

export function buildStorageShareUrl(state, originOverride, pathnameOverride) {
  return `${resolveOrigin(originOverride)}${buildStorageSharePath(state, pathnameOverride)}`;
}

export function buildSafeCodesSharePath(rawState, pathnameOverride) {
  const s = rawState && typeof rawState === 'object' ? rawState : {};
  const base = resolveScopedPath('/gta-6/safe-codes', pathnameOverride);
  const cleanQuery = sanitizeStr(s.query ?? '', 60, '');
  const cleanSafeId = sanitizeStr(s.safeId ?? '', 48, '');
  const entries = [['dist', sanitizeStr(s.district ?? 'All', 48, 'All')]];
  if (cleanSafeId) entries.push(['safe', cleanSafeId]);
  if (cleanQuery) entries.push(['q', cleanQuery]);
  return `${base}${formatQueryString(entries)}`;
}

export function buildSafeCodesShareUrl(state, originOverride, pathnameOverride) {
  return `${resolveOrigin(originOverride)}${buildSafeCodesSharePath(state, pathnameOverride)}`;
}

export function buildHeistMarketSharePath(rawState, pathnameOverride) {
  const s = rawState && typeof rawState === 'object' ? rawState : {};
  const base = resolveScopedPath('/gta-6/heist-split', pathnameOverride);
  const normalizedSub = normalizeHeistSubTab(s.subTab);
  const cleanCuts = buildCrewFromCuts(s.cuts).map((m) => m.pct);
  const cleanSeed = safeIntBound(s.seedCash, 1600000, 0, 50000000);
  const entries = [
    ['sub', normalizedSub],
    ['gross', safeIntBound(s.gross, 2450000, 10000, 25000000)],
    ['fee', safeIntBound(s.fee, 12, 0, 35)],
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

export function buildNightRunSharePath(rawState, pathnameOverride) {
  const s = rawState && typeof rawState === 'object' ? rawState : {};
  const base = resolveScopedPath('/gta-6/night-run', pathnameOverride);
  const cleanWaypoint = sanitizeStr(s.waypointId ?? '', 48, '');
  const entries = [['mins', safeIntBound(s.mins, 45, 45, 120)]];
  if (cleanWaypoint) entries.push(['wp', cleanWaypoint]);
  return `${base}${formatQueryString(entries)}`;
}

export function buildNightRunShareUrl(state, originOverride, pathnameOverride) {
  return `${resolveOrigin(originOverride)}${buildNightRunSharePath(state, pathnameOverride)}`;
}

export function buildMultiGameSharePath(gameId, rawState, pathnameOverride) {
  const state = rawState && typeof rawState === 'object' ? rawState : {};
  const canonicalKey = gameId === 'ea-fc-25' ? 'ea-fc-27' : typeof gameId === 'string' ? gameId : '';
  const defaultBase = Object.hasOwn(GAME_TO_CANONICAL_PATH, canonicalKey)
    ? GAME_TO_CANONICAL_PATH[canonicalKey]
    : '/';
  const base = resolveScopedPath(defaultBase, pathnameOverride);
  let entries = [];

  switch (canonicalKey) {
    case 'cod-warzone':
      entries = [
        ['a', sanitizeStr(state.weaponAId ?? 'raal-mg', 40, 'raal-mg')],
        ['b', sanitizeStr(state.weaponBId ?? 'c9-smg', 40, 'c9-smg')],
        ['hp', safeIntBound(state.codHp, 300, 100, 300)],
        ['hs', safeIntBound(state.codHeadshots, 1, 0, 8)],
        ['bolt', state.codOpenBolt ? 1 : 0],
        ['custom', state.codUseCustom ? 1 : 0],
        ['dmg', safeIntBound(state.codCustomDmg, 36, 1, 500)],
        ['rpm', safeIntBound(state.codCustomRpm, 882, 60, 2000)],
        ['classes', safeIntBound(state.camoClassCount, 21, 0, 33)],
        ['mpgun', safeIntBound(state.camoMatchesPerGun, 6, 1, 30)],
      ];
      break;
    case 'fortnite':
      entries = [
        ['lvl', safeIntBound(state.fnLevel, 44, 1, 200)],
        ['target', safeIntBound(state.fnTarget, 200, 1, 200)],
        ['days', safeIntBound(state.fnDays, 28, 1, 120)],
        ['dailies', (state.fnDailies ?? true) ? 1 : 0],
        ['creative', (state.fnCreative ?? true) ? 1 : 0],
        ['lego', state.fnLego ? 1 : 0],
      ];
      break;
    case 'minecraft':
      entries = [
        ['dir', state.mcDir === 'toOverworld' ? 'toOverworld' : 'toNether'],
        ['x', safeIntBound(state.netherX, -20, -30000000, 30000000)],
        ['y', safeIntBound(state.netherY, 64, -64, 320)],
        ['z', safeIntBound(state.netherZ, 1023, -30000000, 30000000)],
        ['bx', safeIntBound(state.portalBX, 45, -30000000, 30000000)],
        ['by', safeIntBound(state.portalBY, 64, -64, 320)],
        ['bz', safeIntBound(state.portalBZ, 980, -30000000, 30000000)],
        ['t1x', safeFloatBound(state.throw1X, 0, -30000000, 30000000, 2)],
        ['t1z', safeFloatBound(state.throw1Z, 0, -30000000, 30000000, 2)],
        ['t1d', safeFloatBound(state.throw1Deg, -45, -360, 360, 2)],
        ['t2x', safeFloatBound(state.throw2X, 200, -30000000, 30000000, 2)],
        ['t2z', safeFloatBound(state.throw2Z, 0, -30000000, 30000000, 2)],
        ['t2d', safeFloatBound(state.throw2Deg, 45, -360, 360, 2)],
      ];
      break;
    case 'ea-fc-27': {
      const sbcArr = Array.isArray(state.sbcRatings)
        ? state.sbcRatings.slice(0, 11).map((n) => safeIntBound(n, 84, 45, 99))
        : null;
      const sbcStr =
        sbcArr && sbcArr.length === 11 ? sbcArr.join(',') : '86,86,85,85,85,84,84,84,84,84,84';
      entries = [
        ['buy', safeIntBound(state.buyPrice, 185000, 150, 15000000)],
        ['sell', safeIntBound(state.sellPrice, 215000, 200, 15000000)],
        ['qty', safeIntBound(state.quantity, 1, 1, 100)],
        ['sbc', sbcStr],
      ];
      break;
    }
    case 'roblox':
      entries = [
        ['robux', safeIntBound(state.robux, 50000, 0, 50000000)],
        ['rate', sanitizeStr(state.devexRate ?? 'std-2025', 32, 'std-2025')],
        ['split', safeIntBound(state.groupSplit, 100, 1, 100)],
        ['net', safeIntBound(state.desiredNet, 30000, 0, 15000000)],
      ];
      break;
    case 'cs2': {
      const teamArr = Array.isArray(state.csTeamCash)
        ? state.csTeamCash.slice(0, 5).map((n) => safeIntBound(n, 3200, 0, 16000))
        : null;
      const teamStr = teamArr && teamArr.length === 5 ? teamArr.join(',') : '4900,3200,2100,5600,3800';
      entries = [
        ['side', state.cs2Side === 'T' ? 'T' : 'CT'],
        ['cash', safeIntBound(state.cs2Cash, 3200, 0, 16000)],
        ['loss', safeIntBound(state.cs2Loss, 1, 0, 4)],
        ['plant', state.cs2Plant ? 1 : 0],
        ['team', teamStr],
      ];
      break;
    }
    case 'valorant':
      entries = [
        ['cred', safeIntBound(state.valCreds, 3900, 0, 9000)],
        ['vw', safeIntBound(state.valWeapon, 2900, 0, 4700)],
        ['va', safeIntBound(state.valArmor, 650, 0, 1000)],
        ['vu', safeIntBound(state.valUtil, 350, 0, 1200)],
        ['vl', safeIntBound(state.valLoss, 1, 0, 2)],
        ['rr', safeIntBound(state.valRr, 44, 0, 99)],
        ['wr', safeIntBound(state.valWr, 55, 1, 99)],
        ['winRr', safeIntBound(state.valWinRr, 21, 5, 50)],
        ['lossRr', safeIntBound(state.valLossRr, 16, 5, 50)],
      ];
      break;
    case 'apex-legends':
      entries = [
        ['apexLvl', safeIntBound(state.apexLevel, 420, 1, 500)],
        ['prestige', safeIntBound(state.apexPrestige, 0, 0, 3)],
        ['bp', safeIntBound(state.apexBp, 28, 0, 300)],
        ['bought', safeIntBound(state.apexBought, 20, 0, 500)],
        ['tier', sanitizeStr(state.apexTier ?? 'diamond', 24, 'diamond')],
        ['apexRp', safeIntBound(state.apexRp, 8400, 0, 40000)],
        ['avgRp', safeIntBound(state.apexAvgRp, 95, -100, 400)],
      ];
      break;
    case 'gta-v':
      entries = [
        ['cayo', safeIntBound(state.cayoPrimary, 1300000, 630000, 2500000)],
        ['csec', safeIntBound(state.cayoSecondary, 495000, 0, 2500000)],
        ['players', safeIntBound(state.cayoPlayers, 2, 1, 4)],
        ['hostPct', safeIntBound(state.cayoHostPct, 85, 15, 100)],
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

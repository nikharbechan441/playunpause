/**
 * Pure state, storage surgery math, Finish-Date estimator, and #s=... URL sharing
 * for GTA VI Leonida Command Center (V2.2).
 * Runs cleanly in both Node (verify / tests) and Browser environments.
 */

import {
  LEONIDA_BASE_GB,
  LEONIDA_CONSOLES,
  LEONIDA_DEFAULT_SAVES,
  LEONIDA_INSTALLED_GAMES,
  LEONIDA_PACE_MODES,
  LEONIDA_SETTINGS_ITEMS,
  LEONIDA_TRACKER_ITEMS,
  LEONIDA_VERIFIED_CHEATS,
} from '../data/games/leonidaV2Data.js';
import { computeDownloadEtaSeconds, formatDownloadEta } from './downloadEta.js';

export const LEONIDA_STORAGE_KEY = 'playunpause_gta6_leonida_v2';
export const DEFAULT_HOURS_PER_DAY = 2.5;

const VALID_TABS = new Set(['session', 'storage', 'settings', 'money', 'fixes']);
const VALID_CONSOLES = new Map(LEONIDA_CONSOLES.map((c) => [c.id, c]));
const VALID_GAMES = new Map(LEONIDA_INSTALLED_GAMES.map((g) => [g.id, g]));
const VALID_PACE_IDS = new Set(['rush', 'normal', 'plat']);
const VALID_SET_CONSOLES = new Set(['ps5_pro', 'ps5', 'xsx', 'xss']);
const VALID_SET_TVS = new Set(['oled', 'led']);
const VALID_SET_STYLES = new Set(['standard', 'motion', 'streamer']);
const VALID_FIX_IDS = new Set(['patch_01002002', 'ps5_boot', 'psn_error', 'crash_save', 'pc_scam', 'fast_travel']);
const VALID_STAR_STATES = new Set(['grey', 'w_out', 'white', 'flash', 'red', 'r_out']);
const VALID_HEAT_FACTORS = new Set(['car', 'outfit', 'weapon', 'appearance', 'cctv', 'partner']);
const VALID_PROFILE_TIERS = new Set(['pro', 'hard', 'viol', 'psycho', 'irred']);
const VALID_SETTING_IDS = new Set(LEONIDA_SETTINGS_ITEMS.map((s) => s.id));
const VALID_CHEAT_IDS = new Set(LEONIDA_VERIFIED_CHEATS.map((c) => c.id));
const TRACKER_MAX_MAP = Object.fromEntries(LEONIDA_TRACKER_ITEMS.map((t) => [t.key, t.target]));

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function stripDangerousKeysDeep(val) {
  if (Array.isArray(val)) return val.map(stripDangerousKeysDeep);
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (!DANGEROUS_KEYS.has(k)) {
        out[k] = stripDangerousKeysDeep(v);
      }
    }
    return out;
  }
  return val;
}

function clampInt(val, fallback, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampHalfStep(val, fallback, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.max(min, Math.min(max, n));
  return Math.round(clamped * 2) / 2;
}

export function createDefaultLeonidaState() {
  return {
    v: 2,
    tab: 'session',
    chapter: 1,
    consoleId: 'xss',
    includePatch: true,
    installedGames: ['cod'],
    otherUsedGb: 77,
    mbps: 100,
    counts: { waink: 0, wildlife: 0, flamingos: 0, stunts: 0, cards: 0 },
    balconyDone: false,
    saves: LEONIDA_DEFAULT_SAVES.map((s) => ({ ...s })),
    setConsole: 'ps5_pro',
    setTv: 'oled',
    setStyle: 'standard',
    checkedSettings: [],
    checkedCheats: [],
    activeFix: 'patch_01002002',
    radioQuery: '',
    pace: 'normal',
    hoursPerDay: DEFAULT_HOURS_PER_DAY,
    starState: 'red',
    activeHeat: ['car', 'weapon'],
    profileTier: 'pro',
  };
}

export function sanitizeLeonidaState(raw, fallback = createDefaultLeonidaState()) {
  const base = fallback || createDefaultLeonidaState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return base;
  }
  const clean = stripDangerousKeysDeep(raw);

  const rawCounts = clean.counts && typeof clean.counts === 'object' ? clean.counts : {};
  const counts = {
    waink: clampInt(rawCounts.waink, base.counts.waink, 0, TRACKER_MAX_MAP.waink),
    wildlife: clampInt(rawCounts.wildlife, base.counts.wildlife, 0, TRACKER_MAX_MAP.wildlife),
    flamingos: clampInt(rawCounts.flamingos, base.counts.flamingos, 0, TRACKER_MAX_MAP.flamingos),
    stunts: clampInt(rawCounts.stunts, base.counts.stunts, 0, TRACKER_MAX_MAP.stunts),
    cards: clampInt(rawCounts.cards, base.counts.cards, 0, TRACKER_MAX_MAP.cards),
  };

  const savesBySlot = new Map();
  if (Array.isArray(clean.saves)) {
    for (const entry of clean.saves) {
      if (entry && typeof entry === 'object' && Number.isInteger(entry.slot) && entry.slot >= 1 && entry.slot <= 15) {
        savesBySlot.set(entry.slot, {
          slot: entry.slot,
          label:
            typeof entry.label === 'string' && entry.label.trim()
              ? entry.label.trim().slice(0, 32)
              : LEONIDA_DEFAULT_SAVES[entry.slot - 1].label,
          saved: Boolean(entry.saved),
        });
      }
    }
  }
  const saves = base.saves.map((def, idx) => savesBySlot.get(idx + 1) || { ...def });

  const installedGames = Array.isArray(clean.installedGames)
    ? Array.from(new Set(clean.installedGames.filter((id) => VALID_GAMES.has(id))))
    : [...base.installedGames];

  const checkedSettings = Array.isArray(clean.checkedSettings)
    ? Array.from(new Set(clean.checkedSettings.filter((id) => VALID_SETTING_IDS.has(id))))
    : [...base.checkedSettings];

  const checkedCheats = Array.isArray(clean.checkedCheats)
    ? Array.from(new Set(clean.checkedCheats.filter((id) => VALID_CHEAT_IDS.has(id))))
    : [...(base.checkedCheats || [])];

  const activeHeat = Array.isArray(clean.activeHeat)
    ? Array.from(new Set(clean.activeHeat.filter((id) => VALID_HEAT_FACTORS.has(id))))
    : [...base.activeHeat];

  return {
    v: 2,
    tab: VALID_TABS.has(clean.tab) ? clean.tab : base.tab,
    chapter: clampInt(clean.chapter, base.chapter, 1, 5),
    consoleId: VALID_CONSOLES.has(clean.consoleId) ? clean.consoleId : base.consoleId,
    includePatch: typeof clean.includePatch === 'boolean' ? clean.includePatch : base.includePatch,
    installedGames,
    otherUsedGb: clampInt(clean.otherUsedGb, base.otherUsedGb, 0, 600),
    mbps: clampInt(clean.mbps, base.mbps, 5, 2500),
    counts,
    balconyDone: typeof clean.balconyDone === 'boolean' ? clean.balconyDone : base.balconyDone,
    saves,
    setConsole: VALID_SET_CONSOLES.has(clean.setConsole) ? clean.setConsole : base.setConsole,
    setTv: VALID_SET_TVS.has(clean.setTv) ? clean.setTv : base.setTv,
    setStyle: VALID_SET_STYLES.has(clean.setStyle) ? clean.setStyle : base.setStyle,
    checkedSettings,
    checkedCheats,
    activeFix: VALID_FIX_IDS.has(clean.activeFix) ? clean.activeFix : base.activeFix,
    radioQuery: typeof clean.radioQuery === 'string' ? clean.radioQuery.slice(0, 60) : base.radioQuery,
    pace: VALID_PACE_IDS.has(clean.pace) ? clean.pace : base.pace,
    hoursPerDay: clampHalfStep(clean.hoursPerDay, base.hoursPerDay, 0.5, 16),
    starState: VALID_STAR_STATES.has(clean.starState) ? clean.starState : base.starState,
    activeHeat,
    profileTier: VALID_PROFILE_TIERS.has(clean.profileTier) ? clean.profileTier : base.profileTier,
  };
}

export function hasSavedLeonidaState() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(LEONIDA_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
  } catch {
    return false;
  }
}

export function loadLeonidaState() {
  if (typeof window === 'undefined') return createDefaultLeonidaState();
  try {
    const raw = window.localStorage.getItem(LEONIDA_STORAGE_KEY);
    if (!raw) return createDefaultLeonidaState();
    const parsed = JSON.parse(raw);
    return sanitizeLeonidaState(parsed);
  } catch {
    return createDefaultLeonidaState();
  }
}

export function saveLeonidaState(state) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(LEONIDA_STORAGE_KEY, JSON.stringify(sanitizeLeonidaState(state)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Exact V2.2 Console Storage Surgery math & non-clipped proportional segmented bar.
 */
export function computeLeonidaStorage({
  consoleId = 'xss',
  includePatch = true,
  installedGames = ['cod'],
  otherUsedGb = 77,
  mbps = 100,
} = {}) {
  const con = VALID_CONSOLES.get(consoleId) || VALID_CONSOLES.get('xss');
  const patchGb = includePatch ? con.patchGb : 0;
  const gtaGb = Number((LEONIDA_BASE_GB + patchGb).toFixed(1));
  const cleanOtherGb = clampInt(otherUsedGb, 77, 0, 600);
  const cleanGames = Array.isArray(installedGames)
    ? Array.from(new Set(installedGames.filter((id) => VALID_GAMES.has(id))))
    : [];
  const installedGamesGb = cleanGames.reduce((sum, id) => sum + VALID_GAMES.get(id).gb, 0);
  const effectiveGamesGb = cleanOtherGb + installedGamesGb;
  const totalNeeded = Number((effectiveGamesGb + gtaGb).toFixed(1));
  const diff = Number((con.usableGb - totalNeeded).toFixed(1));
  const isShort = diff < 0;
  const shortByGb = isShort ? Number(Math.abs(diff).toFixed(1)) : 0;
  const freeAfterGb = isShort ? 0 : Number(diff.toFixed(1));

  // CRITICAL: denom = isShort ? totalNeeded : con.usableGb so all 3 segments stay proportional
  const denom = Math.max(1, isShort ? totalNeeded : con.usableGb);
  const gtaFitWithinCap = isShort ? Math.max(0, Math.min(gtaGb, con.usableGb - effectiveGamesGb)) : gtaGb;
  const overCapGb = isShort ? Number((totalNeeded - effectiveGamesGb - gtaFitWithinCap).toFixed(1)) : 0;

  const gamesPct = Number(((effectiveGamesGb / denom) * 100).toFixed(2));
  const gtaFitPct = Number(((gtaFitWithinCap / denom) * 100).toFixed(2));
  const overPct = Number(((overCapGb / denom) * 100).toFixed(2));

  const safeMbps = clampInt(mbps, 100, 5, 2500);
  const totalSeconds = computeDownloadEtaSeconds(gtaGb, safeMbps);
  const etaLabel = formatDownloadEta(gtaGb, safeMbps);

  return {
    console: con,
    patchGb,
    gtaGb,
    installedGamesGb,
    effectiveGamesGb,
    totalNeeded,
    usableGb: con.usableGb,
    diff,
    isShort,
    shortByGb,
    freeAfterGb,
    denom,
    gamesPct,
    gtaFitPct,
    overPct,
    mbps: safeMbps,
    totalSeconds,
    etaLabel,
  };
}

/**
 * Equal-weighted average of the 5 category completion ratios rounded to integer %.
 */
export function computeTrackerStats(counts = {}) {
  const safeCounts = counts && typeof counts === 'object' ? counts : {};
  const circumference = 314.16;
  const rows = LEONIDA_TRACKER_ITEMS.map((item) => {
    const val = clampInt(safeCounts[item.key], 0, 0, item.target);
    const ratio = val / item.target;
    return {
      ...item,
      value: val,
      ratio,
      pct: Math.round(ratio * 100),
    };
  });
  const avgRatio = rows.reduce((sum, r) => sum + r.ratio, 0) / rows.length;
  const totalPct = Math.round(avgRatio * 100);
  const dashOffset = Number((circumference * (1 - Math.max(0, Math.min(1, totalPct / 100)))).toFixed(2));
  return {
    rows,
    totalPct,
    circumference,
    dashOffset,
  };
}

/**
 * Exact V2.2 Chapter Pacer & Finish-Date Estimator.
 */
export function computeFinishDate({
  pace = 'normal',
  chapter = 1,
  hoursPerDay = DEFAULT_HOURS_PER_DAY,
  nowDate = new Date(),
} = {}) {
  const paceObj = LEONIDA_PACE_MODES.find((p) => p.id === pace) || LEONIDA_PACE_MODES[1];
  const ch = clampInt(chapter, 1, 1, 5);
  const hpd = clampHalfStep(hoursPerDay, DEFAULT_HOURS_PER_DAY, 0.5, 16);
  const remHrs = Math.max(2, paceObj.hours * (1 - Math.min(0.95, (ch - 1) * 0.2)));
  const daysNeeded = Math.ceil(remHrs / hpd);
  const finish = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate() + daysNeeded
  );
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${months[finish.getMonth()]} ${finish.getDate()}`;
  return {
    pace: paceObj,
    remHrs: Math.round(remHrs),
    daysNeeded,
    formattedDate,
  };
}

function bytesToBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(bin)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64Url) {
  if (!b64Url || typeof b64Url !== 'string' || !/^[A-Za-z0-9_-]+$/.test(b64Url)) {
    return null;
  }
  const padLen = (4 - (b64Url.length % 4)) % 4;
  const b64 = `${b64Url.replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat(padLen)}`;
  const bin =
    typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

/**
 * Encode compact V2 #s=... hash:
 * { v:2, c, con, p, o, u, m, k:[5 counts], b, sv:15-char 0/1 string }
 */
export function encodeLeonidaShareHash(state) {
  const s = sanitizeLeonidaState(state);
  const payload = {
    v: 2,
    c: s.chapter,
    con: s.consoleId,
    p: s.includePatch ? 1 : 0,
    o: s.otherUsedGb,
    u: s.installedGames,
    m: s.mbps,
    k: LEONIDA_TRACKER_ITEMS.map((item) => s.counts[item.key] || 0),
    b: s.balconyDone ? 1 : 0,
    sv: s.saves.map((slot) => (slot.saved ? '1' : '0')).join(''),
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return `#s=${bytesToBase64Url(bytes)}`;
}

/**
 * Strict, non-throwing #s=... decoder with strict type & range validation.
 * Clamps counts to 0..target and chapter to 1..5; returns null on malformed payloads.
 */
export function decodeLeonidaShareHash(rawHash) {
  if (!rawHash || typeof rawHash !== 'string') return null;
  const trimmed = rawHash.trim();
  if (!trimmed.startsWith('#s=')) return null;
  const token = trimmed.slice(3);
  if (!token || token.length > 512) return null;

  try {
    const bytes = base64UrlToBytes(token);
    if (!bytes || bytes.length === 0) return null;
    const text = new TextDecoder().decode(bytes);
    const rawParsed = JSON.parse(text);
    if (!rawParsed || typeof rawParsed !== 'object' || Array.isArray(rawParsed)) return null;
    if (
      Object.hasOwn(rawParsed, '__proto__') ||
      Object.hasOwn(rawParsed, 'constructor') ||
      Object.hasOwn(rawParsed, 'prototype')
    ) {
      return null;
    }
    const parsed = stripDangerousKeysDeep(rawParsed);
    if (parsed.v !== 2) return null;
    if (!VALID_CONSOLES.has(parsed.con)) return null;
    if (typeof parsed.c !== 'number' || !Number.isFinite(parsed.c)) return null;
    if (!Array.isArray(parsed.k) || parsed.k.length !== 5) return null;
    for (const n of parsed.k) {
      if (typeof n !== 'number' || !Number.isFinite(n)) return null;
    }
    if (typeof parsed.sv !== 'string' || !/^[01]{15}$/.test(parsed.sv)) return null;

    const counts = {
      waink: clampInt(parsed.k[0], 0, 0, TRACKER_MAX_MAP.waink),
      wildlife: clampInt(parsed.k[1], 0, 0, TRACKER_MAX_MAP.wildlife),
      flamingos: clampInt(parsed.k[2], 0, 0, TRACKER_MAX_MAP.flamingos),
      stunts: clampInt(parsed.k[3], 0, 0, TRACKER_MAX_MAP.stunts),
      cards: clampInt(parsed.k[4], 0, 0, TRACKER_MAX_MAP.cards),
    };

    const installedGames = Array.isArray(parsed.u)
      ? Array.from(new Set(parsed.u.filter((id) => VALID_GAMES.has(id))))
      : ['cod'];

    const saves = LEONIDA_DEFAULT_SAVES.map((def, idx) => ({
      ...def,
      saved: parsed.sv[idx] === '1',
    }));

    return {
      v: 2,
      chapter: clampInt(parsed.c, 1, 1, 5),
      consoleId: parsed.con,
      includePatch: Boolean(parsed.p),
      otherUsedGb: clampInt(parsed.o, 77, 0, 600),
      installedGames,
      mbps: clampInt(parsed.m, 100, 5, 2500),
      counts,
      balconyDone: Boolean(parsed.b),
      saves,
    };
  } catch {
    return null;
  }
}

const ROUTE_CONSOLE_MAP = {
  'xss-512': 'xss',
  'xss-1tb': 'xss_1tb',
  'xsx-1tb': 'xsx',
  'xsx-2tb': 'xsx',
  'ps5-base': 'ps5_825',
  'ps5-slim': 'ps5_slim',
  'ps5-pro': 'ps5_pro',
};

const ROUTE_TAB_MAP = {
  session: 'session',
  platinum: 'session',
  storage: 'storage',
  settings: 'settings',
  money: 'money',
  cheats: 'money',
  fixes: 'fixes',
  radio: 'fixes',
};

const ROUTE_FIX_MAP = {
  'patch-01002002': 'patch_01002002',
  'ps5-wont-launch': 'ps5_boot',
  'psn-error': 'psn_error',
  'crash-save': 'crash_save',
  'pc-scam': 'pc_scam',
  'fast-travel': 'fast_travel',
};

export function normalizePathname(rawPath = '/') {
  const clean = String(rawPath || '/').split('?')[0].split('#')[0].trim() || '/';
  const withLead = clean.startsWith('/') ? clean : `/${clean}`;
  if (withLead.length > 1) {
    return withLead.replace(/\/+$/, '') || '/';
  }
  return withLead;
}

export function mapRoutePresetToLeonida(route, preset = {}) {
  const rawTab = route?.tab || 'session';
  const path = normalizePathname(route?.path || '/');
  const isUltimate = path === '/gta-6/ultimate' || preset?.subTab === 'ultimate';
  const tab = isUltimate ? 'money' : ROUTE_TAB_MAP[rawTab] || 'session';
  const mappedConsole = preset?.consoleId && ROUTE_CONSOLE_MAP[preset.consoleId]
    ? ROUTE_CONSOLE_MAP[preset.consoleId]
    : null;
  const mappedMbps = typeof preset?.mbps === 'number' && Number.isFinite(preset.mbps)
    ? clampInt(preset.mbps, 100, 5, 2500)
    : null;
  const rawSymptom = preset?.symptomId;
  const mappedActiveFix = rawSymptom
    ? ROUTE_FIX_MAP[rawSymptom] || (VALID_FIX_IDS.has(rawSymptom) ? rawSymptom : null)
    : path === '/gta-6/fixes'
      ? 'patch_01002002'
      : null;
  const routeFocus =
    path === '/gta-6/robberies' || preset?.subTab === 'robberies'
      ? 'robberies'
      : path === '/gta-6/cheats' || rawTab === 'cheats'
        ? 'cheats'
        : isUltimate
          ? 'ultimate'
          : path === '/gta-6/money' || rawTab === 'money'
            ? 'money'
            : path === '/gta-6/radio' || rawTab === 'radio'
              ? 'radio'
              : path === '/gta-6/fixes' || rawTab === 'fixes'
                ? 'fixes'
                : path === '/gta-6/platinum' || rawTab === 'platinum'
                  ? 'platinum'
                  : null;

  return {
    tab,
    rawTab,
    consoleId: mappedConsole,
    mbps: mappedMbps,
    includePatch: typeof preset?.includePatch === 'boolean' ? preset.includePatch : null,
    activeFix: mappedActiveFix,
    routeFocus,
  };
}

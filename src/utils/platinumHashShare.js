export const PLATINUM_COUNTER_LIMITS = {
  waink: 200,
  wildlife: 100,
  flamingos: 100,
  stunts: 300,
  cards: 15,
};

function utf8ToBase64Url(str) {
  let base64 = '';
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(str, 'utf8').toString('base64');
  } else if (typeof btoa === 'function' && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUtf8(b64url) {
  const padded = `${b64url.replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat((4 - (b64url.length % 4)) % 4)}`;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }
  if (typeof atob === 'function' && typeof TextDecoder !== 'undefined') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  throw new Error('Base64 decoding unavailable');
}

function clampCount(val, maxVal) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(maxVal, Math.round(n)));
}

export function extractCountsFromPlatinumState(state = {}) {
  const s = state && typeof state === 'object' ? state : {};
  return {
    waink: clampCount(s.wainkCount ?? s.waink, PLATINUM_COUNTER_LIMITS.waink),
    wildlife: clampCount(s.animalCount ?? s.wildlife, PLATINUM_COUNTER_LIMITS.wildlife),
    flamingos: clampCount(s.flamingosCount ?? s.flamingos, PLATINUM_COUNTER_LIMITS.flamingos),
    stunts: clampCount(s.stuntsCount ?? s.stunts, PLATINUM_COUNTER_LIMITS.stunts),
    cards: clampCount(s.cardsCount ?? s.cards, PLATINUM_COUNTER_LIMITS.cards),
  };
}

export function encodePlatinumShareHash(rawCounts = {}) {
  const clean = extractCountsFromPlatinumState(rawCounts);
  const payload = {
    v: 1,
    waink: clean.waink,
    wildlife: clean.wildlife,
    flamingos: clean.flamingos,
    stunts: clean.stunts,
    cards: clean.cards,
  };
  return `#s=${utf8ToBase64Url(JSON.stringify(payload))}`;
}

function isStrictBoundedInt(val, maxVal) {
  return (
    typeof val === 'number' &&
    Number.isInteger(val) &&
    Number.isFinite(val) &&
    val >= 0 &&
    val <= maxVal
  );
}

export function decodePlatinumShareHash(rawHash) {
  try {
    if (typeof rawHash !== 'string') return null;
    const trimmed = rawHash.trim();
    if (!trimmed || trimmed.length > 512) return null;
    const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    if (!normalized.startsWith('s=')) return null;
    const token = normalized.slice(2);
    if (!token || !/^[A-Za-z0-9_-]{4,400}$/.test(token)) return null;

    const jsonStr = base64UrlToUtf8(token);
    if (!jsonStr || jsonStr.length > 512) return null;
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (Object.hasOwn(parsed, '__proto__') || Object.hasOwn(parsed, 'constructor') || Object.hasOwn(parsed, 'prototype')) {
      return null;
    }
    if (parsed.v !== 1) return null;

    const out = { v: 1 };
    for (const [key, maxVal] of Object.entries(PLATINUM_COUNTER_LIMITS)) {
      if (!Object.hasOwn(parsed, key) || !isStrictBoundedInt(parsed[key], maxVal)) {
        return null;
      }
      out[key] = parsed[key];
    }
    return out;
  } catch {
    return null;
  }
}

export function hasLocalPlatinumProgress(state = {}) {
  if (!state || typeof state !== 'object') return false;
  const counts = extractCountsFromPlatinumState(state);
  if (Object.values(counts).some((n) => n > 0)) return true;
  if (state.balconyDone) return true;
  if (Array.isArray(state.slots) && state.slots.some((slot) => Boolean(slot?.saved))) return true;
  return false;
}

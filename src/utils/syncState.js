export const MAX_FREE_PINS_PER_GAME = 120;
export const MAX_SYNC_PINS_TOTAL = 120;
export const MAX_FREE_PROFILES = 16;
export const MAX_SYNC_PROFILES = 16;

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function stripDangerousKeys(input, depth = 0) {
  if (depth > 8 || input === null || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => stripDangerousKeys(item, depth + 1));
  }
  const clean = {};
  for (const key of Object.keys(input)) {
    if (DANGEROUS_OBJECT_KEYS.has(key)) continue;
    clean[key] = stripDangerousKeys(input[key], depth + 1);
  }
  return clean;
}

export const VALID_CONSOLE_IDS = new Set([
  'ps5-base',
  'ps5-slim',
  'ps5-pro',
  'xsx-1tb',
  'xss-512',
  'xss-1tb',
]);

export function createEmptySyncState() {
  return {
    crackedSafeIds: [],
    checkedRouteIds: [],
    savedPins: [],
    storageProfiles: [],
    crewPresets: [],
  };
}

function isPlainObject(val) {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

export function sanitizeStringIdArray(arr, maxItems = 500, maxScan = 1000, maxStrLen = 64) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  const scanLimit = Math.min(arr.length, maxScan);
  for (let i = 0; i < scanLimit; i += 1) {
    const item = arr[i];
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().slice(0, maxStrLen);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function sanitizeSavedPins(arr, maxItems = MAX_SYNC_PINS_TOTAL) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  const scanLimit = Math.min(arr.length, 400);
  for (let i = 0; i < scanLimit; i += 1) {
    const item = arr[i];
    if (!isPlainObject(item)) continue;
    const id = typeof item.id === 'string' ? item.id.trim().slice(0, 48) : '';
    const gameId = typeof item.gameId === 'string' ? item.gameId.trim().slice(0, 32) : '';
    const label = typeof item.label === 'string' ? item.label.trim().slice(0, 80) : '';
    let value = '';
    if (typeof item.value === 'string') {
      value = item.value.trim().slice(0, 140);
    } else if (typeof item.value === 'number' && Number.isFinite(item.value)) {
      value = String(item.value === 0 ? 0 : item.value).slice(0, 140);
    }
    if (!id || !gameId || !label || !value || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, gameId, label, value });
    if (out.length >= maxItems) break;
  }
  return out;
}

export function sanitizeStorageProfiles(arr, maxItems = MAX_SYNC_PROFILES) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  const scanLimit = Math.min(arr.length, 64);
  for (let i = 0; i < scanLimit; i += 1) {
    const item = arr[i];
    if (!isPlainObject(item)) continue;
    const id = typeof item.id === 'string' ? item.id.trim().slice(0, 48) : '';
    const label =
      typeof item.label === 'string'
        ? item.label.replace(/[<>]/g, '').trim().slice(0, 80)
        : '';
    const consoleId = typeof item.consoleId === 'string' ? item.consoleId.trim() : '';
    if (!id || !label || !VALID_CONSOLE_IDS.has(consoleId) || seen.has(id)) continue;

    const freeGb =
      typeof item.freeGb === 'number' && Number.isFinite(item.freeGb)
        ? Math.max(0, Math.min(2000, Math.round(item.freeGb))) || 0
        : 0;
    const includePatch = Boolean(item.includePatch);
    const mbps =
      typeof item.mbps === 'number' && Number.isFinite(item.mbps)
        ? Math.max(10, Math.min(2500, Math.round(item.mbps)))
        : 120;
    const customOffsetGb =
      typeof item.customOffsetGb === 'number' && Number.isFinite(item.customOffsetGb)
        ? Math.max(-60, Math.min(120, Math.round(item.customOffsetGb))) || 0
        : 0;
    const sacrificedIds = sanitizeStringIdArray(item.sacrificedIds, 12, 32, 40);

    seen.add(id);
    out.push({
      id,
      label,
      consoleId,
      freeGb,
      includePatch,
      mbps,
      customOffsetGb,
      sacrificedIds,
    });
    if (out.length >= maxItems) break;
  }
  return out;
}

export function sanitizeCrewPresets(arr, maxItems = MAX_SYNC_PROFILES) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  const scanLimit = Math.min(arr.length, 64);
  for (let i = 0; i < scanLimit; i += 1) {
    const item = arr[i];
    if (!isPlainObject(item)) continue;
    const id = typeof item.id === 'string' ? item.id.trim().slice(0, 48) : '';
    const label =
      typeof item.label === 'string'
        ? item.label.replace(/[<>]/g, '').trim().slice(0, 80)
        : '';
    if (!id || !label || seen.has(id)) continue;

    if (!Array.isArray(item.crew) || item.crew.length < 2 || item.crew.length > 4) continue;
    const cleanCrew = [];
    let crewValid = true;
    let pctSum = 0;
    for (const member of item.crew) {
      if (!isPlainObject(member)) {
        crewValid = false;
        break;
      }
      const mId = typeof member.id === 'string' ? member.id.trim().slice(0, 16) : '';
      const mName =
        typeof member.name === 'string'
          ? member.name.replace(/[<>]/g, '').trim().slice(0, 24)
          : '';
      const mRole =
        typeof member.role === 'string'
          ? member.role.replace(/[<>]/g, '').trim().slice(0, 24)
          : '';
      if (
        !mId ||
        !mName ||
        !mRole ||
        typeof member.pct !== 'number' ||
        !Number.isInteger(member.pct) ||
        member.pct < 0 ||
        member.pct > 100
      ) {
        crewValid = false;
        break;
      }
      pctSum += member.pct;
      cleanCrew.push({
        id: mId,
        name: mName,
        role: mRole,
        pct: member.pct || 0,
        locked: Boolean(member.locked),
      });
    }
    if (!crewValid || pctSum !== 100) continue;

    const presetId =
      typeof item.presetId === 'string' && item.presetId.trim()
        ? item.presetId.trim().slice(0, 40)
        : 'ocean-vault';
    const grossDollars =
      typeof item.grossDollars === 'number' && Number.isFinite(item.grossDollars)
        ? Math.max(0, Math.min(100_000_000, Math.round(item.grossDollars))) || 0
        : 0;
    const supportFeePct =
      typeof item.supportFeePct === 'number' && Number.isFinite(item.supportFeePct)
        ? Math.max(0, Math.min(30, Math.round(item.supportFeePct))) || 0
        : 0;

    seen.add(id);
    out.push({
      id,
      label,
      presetId,
      grossDollars,
      supportFeePct,
      crew: cleanCrew,
    });
    if (out.length >= maxItems) break;
  }
  return out;
}

export function sanitizeSyncState(rawInput) {
  if (!isPlainObject(rawInput)) {
    return null;
  }
  const rawState = stripDangerousKeys(rawInput);

  const rawSafes = Array.isArray(rawState.crackedSafeIds)
    ? rawState.crackedSafeIds
    : Array.isArray(rawState.crackedSafes)
      ? rawState.crackedSafes
      : [];

  return {
    crackedSafeIds: sanitizeStringIdArray(rawSafes),
    checkedRouteIds: sanitizeStringIdArray(rawState.checkedRouteIds),
    savedPins: sanitizeSavedPins(rawState.savedPins, MAX_SYNC_PINS_TOTAL),
    storageProfiles: sanitizeStorageProfiles(rawState.storageProfiles, MAX_SYNC_PROFILES),
    crewPresets: sanitizeCrewPresets(rawState.crewPresets, MAX_SYNC_PROFILES),
  };
}

function unionObjectArrays(incomingArr, localArr, maxItems) {
  const seen = new Set();
  const out = [];
  for (const list of [incomingArr, localArr]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= maxItems) return out;
    }
  }
  return out;
}

export function mergeSyncStates(localState, incomingState) {
  const cleanLocal = sanitizeSyncState(localState) || createEmptySyncState();
  const cleanIncoming = sanitizeSyncState(incomingState) || createEmptySyncState();

  return {
    crackedSafeIds: sanitizeStringIdArray([
      ...cleanIncoming.crackedSafeIds,
      ...cleanLocal.crackedSafeIds,
    ]),
    checkedRouteIds: sanitizeStringIdArray([
      ...cleanIncoming.checkedRouteIds,
      ...cleanLocal.checkedRouteIds,
    ]),
    savedPins: unionObjectArrays(cleanIncoming.savedPins, cleanLocal.savedPins, MAX_SYNC_PINS_TOTAL),
    storageProfiles: unionObjectArrays(
      cleanIncoming.storageProfiles,
      cleanLocal.storageProfiles,
      MAX_SYNC_PROFILES
    ),
    crewPresets: unionObjectArrays(
      cleanIncoming.crewPresets,
      cleanLocal.crewPresets,
      MAX_SYNC_PROFILES
    ),
  };
}

export function escapeCsvCell(val) {
  let str = String(val ?? '')
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\u0000/g, '');
  if (/^[=+\-@\t\r]/.test(str) || /^[=+\-@\t\r]/.test(str.trimStart())) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildDeckSpreadsheetCsv(rawState) {
  const state = sanitizeSyncState(rawState) || createEmptySyncState();
  const rows = [['Category', 'Scope', 'Label', 'Details', 'Value']];

  for (const prof of state.storageProfiles) {
    const patchNote = prof.includePatch ? 'patch on' : 'base only';
    const uninstalls = prof.sacrificedIds.length
      ? `${prof.sacrificedIds.length} queued uninstalls (${prof.sacrificedIds.join(', ')})`
      : 'no queued uninstalls';
    rows.push([
      'Console Setup',
      prof.consoleId,
      prof.label,
      `${prof.freeGb} GB free, ${prof.mbps} Mbps, ${patchNote}, offset ${prof.customOffsetGb} GB`,
      uninstalls,
    ]);
  }

  for (const preset of state.crewPresets) {
    const feeDollars = Math.round((preset.grossDollars * preset.supportFeePct) / 100);
    const netPool = Math.max(0, preset.grossDollars - feeDollars);
    let allocated = 0;
    const splitParts = preset.crew.map((member, idx) => {
      const payout =
        idx === preset.crew.length - 1
          ? Math.max(0, netPool - allocated)
          : Math.round((netPool * member.pct) / 100);
      allocated += payout;
      return `${member.name} ${member.pct}% ($${payout.toLocaleString('en-US')})`;
    });
    rows.push([
      'Squad Roster',
      preset.presetId,
      preset.label,
      `Gross $${preset.grossDollars.toLocaleString('en-US')} · ${preset.supportFeePct}% NPC fee · Net $${netPool.toLocaleString('en-US')}`,
      splitParts.join(' | '),
    ]);
  }

  for (const pin of state.savedPins) {
    rows.push(['Pinned Calc', pin.gameId, pin.label, 'Saved bookmark', pin.value]);
  }

  for (const safeId of state.crackedSafeIds) {
    rows.push(['Cracked Safe', 'gta-6', safeId, 'Safe vault checklist', 'Cleared']);
  }

  for (const stopId of state.checkedRouteIds) {
    rows.push(['Route Stop', 'gta-6', stopId, 'Saved checklist stop', 'Completed']);
  }

  return `${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
}

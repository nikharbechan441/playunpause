const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk [\w-]+ failed/i;

export function isChunkLoadError(error) {
  const msg = String(error?.message || error || '');
  return CHUNK_ERROR_RE.test(msg);
}

export function tryAutoReloadForStaleChunk(
  storageKey = 'unpause_chunk_reload_ts',
  cooldownMs = 15000
) {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const now = Date.now();
    const lastTs = Number(window.sessionStorage?.getItem(storageKey) || 0);
    if (Number.isFinite(lastTs) && lastTs > 0 && now - lastTs < cooldownMs) {
      return false;
    }
    window.sessionStorage?.setItem(storageKey, String(now));
    if (typeof window.location?.reload === 'function') {
      window.location.reload();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

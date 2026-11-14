/**
 * Copies text to clipboard using the async Clipboard API with a read-only
 * offscreen textarea fallback for cross-origin embed iframes.
 * Returns true only when copying succeeded.
 */
export async function copyTextReliably(text) {
  const payload = String(text ?? '');
  if (!payload || typeof document === 'undefined') return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch {
      // Fall back to execCommand when Clipboard API is permission-blocked (e.g. iframe embeds)
    }
  }

  let ta = null;
  const active = document.activeElement;
  try {
    ta = document.createElement('textarea');
    ta.value = payload;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, payload.length);
    return document.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
    if (active && typeof active.focus === 'function' && document.contains(active)) {
      active.focus({ preventScroll: true });
    }
  }
}

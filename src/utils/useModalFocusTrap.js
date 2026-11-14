import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Places keyboard focus inside open dialogs, traps Tab / Shift+Tab cycling,
 * closes on Escape, and restores focus to the opener on close.
 */
export function useModalFocusTrap(isOpen, modalRef, onClose, { initialFocusRef = null } = {}) {
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    previousFocusRef.current = document.activeElement;
    const focusTimer = setTimeout(() => {
      const target = initialFocusRef?.current || modalRef.current;
      target?.focus({ preventScroll: true });
    }, 15);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusables = Array.from(modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

      if (focusables.length === 0) {
        e.preventDefault();
        modalRef.current.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === modalRef.current) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus({ preventScroll: true });
      }
    };
  }, [isOpen, modalRef, initialFocusRef]);
}

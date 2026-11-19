import React, { useEffect, useRef, useState } from 'react';
import { MonitorCheck, MoonStar } from 'lucide-react';
import { playSwitchTick, triggerHaptic } from '../../utils/soundHaptics.js';

export default function WakeLockToggle({ soundEnabled = true }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const sentinelRef = useRef(null);
  const enabledRef = useRef(false);

  enabledRef.current = enabled;

  const releaseWakeLock = async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    if (sentinel && typeof sentinel.release === 'function') {
      try {
        await sentinel.release();
      } catch {
        // Ignore already-released sentinel errors
      }
    }
  };

  const requestWakeLock = async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return false;
    try {
      await releaseWakeLock();
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      if (sentinel && typeof sentinel.addEventListener === 'function') {
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null;
          if (!enabledRef.current) {
            setStatusNote('');
          }
        });
      }
      setStatusNote('Screen Awake');
      return true;
    } catch {
      setStatusNote('Battery Saver Blocked');
      return false;
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function') {
      setSupported(true);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      releaseWakeLock();
    };
  }, []);

  if (!supported) {
    return null;
  }

  const handleToggle = async () => {
    playSwitchTick(soundEnabled, enabled ? 620 : 780);
    triggerHaptic(25);
    if (enabled) {
      setEnabled(false);
      enabledRef.current = false;
      setStatusNote('');
      await releaseWakeLock();
      return;
    }
    setEnabled(true);
    enabledRef.current = true;
    const ok = await requestWakeLock();
    if (!ok) {
      setEnabled(false);
      enabledRef.current = false;
    }
  };

  return (
    <button
      type="button"
      aria-pressed={enabled}
      className={`subtle-pill-btn wake-lock-btn tactile-press ${enabled ? 'active' : ''}`}
      onClick={handleToggle}
      title="Prevent second screen from dimming while playing"
    >
      {enabled ? (
        <MonitorCheck size={14} aria-hidden="true" />
      ) : (
        <MoonStar size={14} aria-hidden="true" />
      )}
      <span>{enabled ? statusNote || 'Screen Awake' : 'Keep Screen Awake'}</span>
    </button>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyRound,
  Search,
  Volume2,
  Copy,
  Check,
  Link2,
  CheckCircle2,
  Circle,
  Cloud,
  Info,
} from 'lucide-react';
import { playKeypadBeep, playSwitchTick, playUnlockChime, triggerHaptic } from '../utils/soundHaptics.js';
import { copyTextReliably } from '../utils/clipboard.js';
import { AnimatedValue, SpotlightPanel } from '../utils/motionPrimitives.jsx';
import { buildSafeCodesSharePath, buildSafeCodesShareUrl } from '../utils/shareUrlHelpers.js';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '#'];

export default function SafeKeypadVault({
  gamePack,
  crackedSafeIds,
  onToggleSafe,
  soundEnabled,
  isPro,
  isPreLaunch,
  isEmbed = false,
  initialQuery = '',
  initialPreset = null,
  presetKey = '',
  onOpenProModal,
}) {
  const safes = gamePack.safes || [];
  const districts = gamePack.districts || ['All Districts'];

  const [selectedDistrict, setSelectedDistrict] = useState(
    () => initialPreset?.district || 'All Districts'
  );
  const [query, setQuery] = useState(() => initialPreset?.query ?? initialQuery);
  const [selectedSafeId, setSelectedSafeId] = useState(
    () => initialPreset?.safeId || safes[0]?.id || ''
  );
  const [activeStepIdx, setActiveStepIdx] = useState(-1);
  const [litDigit, setLitDigit] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [shareFallbackUrl, setShareFallbackUrl] = useState('');
  const [isPlayingSeq, setIsPlayingSeq] = useState(false);

  const timersRef = useRef([]);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    const nextDist = initialPreset?.district || 'All Districts';
    setSelectedDistrict(nextDist);
    setQuery(initialPreset?.query ?? initialQuery ?? '');
    if (initialPreset?.safeId) {
      setSelectedSafeId(initialPreset.safeId);
    } else if (nextDist !== 'All Districts') {
      const firstMatch = safes.find((s) => s.district === nextDist);
      if (firstMatch) setSelectedSafeId(firstMatch.id);
    }
    setShareFallbackUrl('');
  }, [initialQuery, presetKey]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(
    () => () => {
      clearTimers();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  const filteredSafes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return safes.filter((safe) => {
      const matchDistrict = selectedDistrict === 'All Districts' || safe.district === selectedDistrict;
      const matchQuery =
        !q ||
        safe.title.toLowerCase().includes(q) ||
        safe.district.toLowerCase().includes(q) ||
        safe.clueLocation.toLowerCase().includes(q) ||
        safe.reward.toLowerCase().includes(q) ||
        safe.code.includes(q);
      return matchDistrict && matchQuery;
    });
  }, [safes, selectedDistrict, query]);

  const selectedSafe = useMemo(
    () => safes.find((s) => s.id === selectedSafeId) || filteredSafes[0] || safes[0],
    [safes, selectedSafeId, filteredSafes]
  );

  const codeDigits = useMemo(() => {
    const rawCode = String(selectedSafe?.code || '');
    if (!selectedSafe?.verified || !/^\d{4}$/.test(rawCode)) {
      return ['-', '-', '-', '-'];
    }
    return rawCode.split('').slice(0, 4);
  }, [selectedSafe]);

  const safeCrackedIds = useMemo(
    () => (Array.isArray(crackedSafeIds) ? crackedSafeIds.filter((id) => typeof id === 'string') : []),
    [crackedSafeIds]
  );

  const crackedCount = useMemo(
    () => safes.filter((s) => safeCrackedIds.includes(s.id)).length,
    [safes, safeCrackedIds]
  );

  const handleSelectSafe = (safe) => {
    clearTimers();
    setIsPlayingSeq(false);
    setActiveStepIdx(-1);
    setLitDigit(null);
    setSelectedSafeId(safe.id);
    playSwitchTick(soundEnabled, 660);
    triggerHaptic(8);
  };

  const setTimedCopiedState = (nextState, delay = 2200) => {
    setCopiedCode(nextState);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedCode(null), delay);
  };

  const copyCode = async (code) => {
    if (!/^\d{4}$/.test(String(code || ''))) return;
    playSwitchTick(soundEnabled, 880);
    triggerHaptic(10);
    const ok = await copyTextReliably(code);
    if (ok) setShareFallbackUrl('');
    setTimedCopiedState(ok ? code : 'blocked', 1800);
  };

  const selectedSafeVerified = Boolean(selectedSafe?.verified && /^\d{4}$/.test(String(selectedSafe?.code || '')));

  const handlePlaySequence = () => {
    if (!selectedSafe || !selectedSafeVerified) return;
    clearTimers();
    setIsPlayingSeq(true);
    triggerHaptic(12);

    codeDigits.forEach((digit, idx) => {
      const startDelay = idx * 340;
      const t1 = setTimeout(() => {
        setActiveStepIdx(idx);
        setLitDigit(digit);
        playKeypadBeep(soundEnabled, digit);
        triggerHaptic(8);
      }, startDelay);
      timersRef.current.push(t1);
    });

    const finishTimer = setTimeout(() => {
      setLitDigit(null);
      setActiveStepIdx(-1);
      setIsPlayingSeq(false);
      playUnlockChime(soundEnabled);
    }, codeDigits.length * 340 + 260);
    timersRef.current.push(finishTimer);
  };

  const handleManualKeyPress = (key) => {
    if (key === 'Clear') {
      clearTimers();
      setIsPlayingSeq(false);
      setActiveStepIdx(-1);
      setLitDigit(null);
      playSwitchTick(soundEnabled, 460);
      return;
    }
    if (key === '#') {
      handlePlaySequence();
      return;
    }
    playKeypadBeep(soundEnabled, key);
    triggerHaptic(8);
    setLitDigit(key);
    const t = setTimeout(() => setLitDigit(null), 220);
    timersRef.current.push(t);
  };

  const shareSpecState = {
    district: selectedDistrict,
    safeId: selectedSafe?.id || '',
    query,
  };
  const sharePath = buildSafeCodesSharePath(shareSpecState);
  const shareFullUrl = buildSafeCodesShareUrl(
    shareSpecState,
    typeof window !== 'undefined' ? window.location.origin : 'https://playunpause.com'
  );

  const handleDistrictTabKeyDown = (e, idx) => {
    if (!districts.length) return;
    let nextIdx = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % districts.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + districts.length) % districts.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = districts.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    const nextDist = districts[nextIdx];
    playSwitchTick(soundEnabled, 640);
    setSelectedDistrict(nextDist);
    const tabs = e.currentTarget.parentElement?.querySelectorAll('[role="tab"]');
    tabs?.[nextIdx]?.focus();
  };

  const statusAnnouncement =
    copiedCode === 'share-link'
      ? 'Shareable link copied to clipboard.'
      : copiedCode === 'share-blocked'
        ? 'Clipboard blocked — copy preset URL below.'
        : copiedCode === 'blocked'
          ? 'Clipboard blocked — tap Copy PIN or read the digits above.'
          : copiedCode && selectedSafe && copiedCode === selectedSafe.code
            ? `Copied PIN ${selectedSafe.code} for ${selectedSafe.title}.`
            : '';

  return (
    <section className="deck-panel" aria-label="Safe & Door Keypad Combination Vault">
      {isEmbed ? (
        <div className="studio-hero-band">
          <div>
            <div className="panel-eyebrow">
              <KeyRound size={13} aria-hidden="true" />
              <span>
                {isPreLaunch
                  ? 'PRE-UNLOCK TRACKER · VERIFIED KEYPAD CODES POPULATE LIVE STARTING NOV 19 AT 11:00 UTC'
                  : 'LIVE SAFE COMBINATION VAULT · INSTANT KEYPAD PLAYBACK'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 className="panel-title">GTA VI Safe &amp; Door Keypad Vault</h1>
              <span className="district-pill">Unofficial Companion</span>
            </div>
            <p className="panel-subtitle">
              {isPreLaunch
                ? 'Verified keypad codes populate live starting Nov 19 at 11:00 UTC NZ unlock. Zero fake placeholder combinations are shown before verification.'
                : 'Search any Leonida district while paused, copy the 4-digit pin in one tap, or step through the tone sequence on the tactile 10-key pad.'}
            </p>
          </div>

          <div className="hud-readout" aria-live="polite">
            <span>
              Cleared: <strong className="mono"><AnimatedValue value={crackedCount} /></strong> / {safes.length}
            </span>
          </div>
        </div>
      ) : (
        <div className="studio-compact-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <KeyRound size={15} color="var(--coral)" aria-hidden="true" />
            <h2 className="panel-title">GTA VI Safe &amp; Door Keypad Vault</h2>
            <span className="district-pill">
              {isPreLaunch ? 'Pre-Unlock · Syncs Nov 19 11:00 UTC' : 'Unofficial Companion'}
            </span>
          </div>
          <div className="hud-readout" aria-live="polite">
            <span>
              Cleared: <strong className="mono"><AnimatedValue value={crackedCount} /></strong> / {safes.length}
            </span>
          </div>
        </div>
      )}

      <div className="deck-body-pad">
        <div
          className="nz-compact-card"
          role="status"
          style={{
            marginTop: 0,
            marginBottom: '12px',
            borderColor: 'var(--gold-border)',
            background: 'var(--gold-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={15} color="var(--gold)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Verified keypad codes populate live starting Nov 19 at 11:00 UTC NZ unlock.</strong>{' '}
            GTA VI launches as single-player only on November 19, 2026 ($79.99 Standard / $99.99 Ultimate) — zero unverified combinations are published prior to retail confirmation.
          </span>
        </div>

        {selectedSafe && (
          <div className="mobile-keypad-strip" aria-label="Quick Mobile Safe Controls">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.77rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                {selectedSafe.district} · STATUS
              </div>
              <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                {selectedSafeVerified ? selectedSafe.code : 'Pending Live Unlock'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                className="secondary-key-btn"
                disabled={!selectedSafeVerified}
                onClick={() => copyCode(selectedSafe.code)}
              >
                {copiedCode === selectedSafe.code ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedCode === selectedSafe.code ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                className="primary-coral-btn"
                onClick={handlePlaySequence}
                disabled={isPlayingSeq || !selectedSafeVerified}
              >
                <Volume2 size={15} />
                <span>{isPlayingSeq ? 'Playing' : 'Play'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="vault-layout">
          {/* LEFT: DISTRICT SEARCH + SAFE LIST */}
          <div>
            <div className="search-input-wrap">
              <Search size={16} className="search-icon-pos" aria-hidden="true" />
              <input
                type="search"
                className="deck-input"
                aria-label="Search safes by district, clue, or reward"
                placeholder="Search Port Gellhorn, Vice Beach, pawn shop, motel..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="filter-row" role="tablist" aria-label="Filter safes by district">
              {districts.map((dist, idx) => (
                <button
                  key={dist}
                  type="button"
                  role="tab"
                  tabIndex={selectedDistrict === dist ? 0 : -1}
                  aria-selected={selectedDistrict === dist}
                  className={`filter-pill ${selectedDistrict === dist ? 'active' : ''}`}
                  onKeyDown={(e) => handleDistrictTabKeyDown(e, idx)}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 640);
                    setSelectedDistrict(dist);
                  }}
                >
                  {dist}
                </button>
              ))}
            </div>

            {filteredSafes.length === 0 ? (
              <div
                className="nz-compact-card"
                style={{ textAlign: 'center', padding: '24px 16px' }}
              >
                No safes match &ldquo;{query}&rdquo;. Clear the search filter or select All Districts.
              </div>
            ) : (
              <div>
                {filteredSafes.map((safe) => {
                  const isSelected = selectedSafe?.id === safe.id;
                  const isCracked = safeCrackedIds.includes(safe.id);
                  return (
                    <div
                      key={safe.id}
                      className={`safe-card ${isSelected ? 'selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="safe-select-trigger"
                        onClick={() => handleSelectSafe(safe)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span className="district-pill">{safe.district}</span>
                          {!safe.verified ? (
                            <span className="district-pill" style={{ color: 'var(--gold)' }}>
                              Pre-Unlock · Syncs Nov 19 11:00 UTC
                            </span>
                          ) : safe.verifiedStatus ? (
                            <span className="district-pill" style={{ color: 'var(--teal-dark)' }}>
                              {safe.verifiedStatus}
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: '0.96rem',
                            color: 'var(--ink-primary)',
                            marginBottom: '3px',
                          }}
                        >
                          {safe.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                          Clue: {safe.clueLocation} · <strong style={{ color: 'var(--ink-primary)' }}>{safe.reward}</strong>
                        </div>
                      </button>

                      <div className="safe-card-actions">
                        <span className="safe-code-badge">
                          {safe.verified && /^\d{4}$/.test(String(safe.code || '')) ? safe.code : 'PENDING'}
                        </span>
                        <button
                          type="button"
                          className="subtle-pill-btn"
                          disabled={!safe.verified || !/^\d{4}$/.test(String(safe.code || ''))}
                          aria-label={`Copy ${safe.title} code`}
                          onClick={() => copyCode(safe.code)}
                        >
                          {copiedCode === safe.code ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedCode === safe.code ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          className={`subtle-pill-btn ${isCracked ? 'active' : ''}`}
                          aria-pressed={isCracked}
                          aria-label={isCracked ? `Mark ${safe.title} unclear` : `Mark ${safe.title} cracked`}
                          onClick={() => onToggleSafe(safe.id)}
                        >
                          {isCracked ? (
                            <CheckCircle2 size={15} color="var(--teal-dark)" />
                          ) : (
                            <Circle size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="nz-compact-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
                <Cloud size={15} color="var(--ocean)" />
                <span>
                  {isPro
                    ? 'Free Cloud Sync Active — cracked safes mirror cleanly between Phone and Desktop.'
                    : 'Every safe code, keypad tone, and Phone ↔ PC QR backup works 100% free.'}
                </span>
              </div>
              {onOpenProModal && (
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={onOpenProModal}
                >
                  {isPro ? 'Manage QR Sync' : 'Free QR Sync'}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: HARDWARE 10-KEY PAD */}
          <div>
            <SpotlightPanel className="keypad-box" aria-label="Interactive Safe Keypad">
              <div className="keypad-box-header">
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: '0.71rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                    ACTIVE KEYPAD TARGET
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.94rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedSafe?.title || 'Select Safe'}
                  </div>
                </div>
                <span className="district-pill">{selectedSafe?.district || 'Leonida'}</span>
              </div>

              <div className="keypad-pip-row" aria-label="4-digit pin readout">
                {codeDigits.map((digit, i) => (
                  <div
                    key={`${i}-${digit}`}
                    className={`keypad-pip ${activeStepIdx === i ? 'pulsing' : ''}`}
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div className="keypad-grid" role="group" aria-label="10-key keypad buttons">
                {KEYPAD_KEYS.map((key) => {
                  const isLit = litDigit === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`keypad-digit ${isLit ? 'lit' : ''}`}
                      onClick={() => handleManualKeyPress(key)}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              <div className="stage-action-row stage-action-row-3" style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className="primary-coral-btn"
                  onClick={handlePlaySequence}
                  disabled={isPlayingSeq || !selectedSafeVerified}
                >
                  <Volume2 size={15} />
                  <span>{isPlayingSeq ? 'Playing…' : 'Play Sequence'}</span>
                </button>
                <button
                  type="button"
                  className="secondary-key-btn"
                  disabled={!selectedSafeVerified}
                  onClick={() => selectedSafe && copyCode(selectedSafe.code)}
                >
                  {copiedCode === selectedSafe?.code ? <Check size={15} /> : <Copy size={15} />}
                  <span>
                    {copiedCode === selectedSafe?.code
                      ? 'Copied PIN'
                      : copiedCode === 'blocked'
                        ? 'Copy Blocked'
                        : 'Copy PIN'}
                  </span>
                </button>
                <button
                  type="button"
                  className="stage-dark-btn"
                  data-share-url={sharePath}
                  onClick={async () => {
                    playSwitchTick(soundEnabled, 820);
                    const ok = await copyTextReliably(shareFullUrl);
                    if (ok) {
                      setShareFallbackUrl('');
                      setTimedCopiedState('share-link', 2200);
                    } else {
                      setShareFallbackUrl(shareFullUrl);
                      setTimedCopiedState('share-blocked', 2600);
                    }
                  }}
                >
                  {copiedCode === 'share-link' ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                  <span>
                    {copiedCode === 'share-link'
                      ? 'Copied Link'
                      : shareFallbackUrl
                        ? 'Copy Below'
                        : 'Share Link'}
                  </span>
                </button>
              </div>

              {shareFallbackUrl && (
                <div className="share-fallback-box">
                  <label className="share-fallback-label" htmlFor="safe-share-fallback-input">
                    Clipboard access blocked — copy your preset URL:
                  </label>
                  <input
                    id="safe-share-fallback-input"
                    type="text"
                    readOnly
                    className="deck-input mono"
                    value={shareFallbackUrl}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.target.select()}
                  />
                </div>
              )}

              <div role="status" aria-live="polite">
                {statusAnnouncement && (
                  <div
                    className={`inline-status-note mono ${copiedCode?.includes('blocked') ? 'err' : 'ok'}`}
                    style={{ textAlign: 'center' }}
                  >
                    {statusAnnouncement}
                  </div>
                )}
              </div>

              {isPreLaunch && (
                <div
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    fontSize: '0.73rem',
                    lineHeight: 1.45,
                    color: 'var(--ink-muted)',
                  }}
                >
                  <Info size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Verified keypad codes populate live starting Nov 19 at 11:00 UTC NZ unlock. Test 10-key WebAudio tones directly above.
                  </span>
                </div>
              )}
            </SpotlightPanel>
          </div>
        </div>
      </div>
    </section>
  );
}

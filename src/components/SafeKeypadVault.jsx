import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, KeyRound, RotateCcw, Copy } from 'lucide-react';
import { playKeypadBeep, playSwitchTick, playUnlockChime } from '../utils/soundHaptics.js';

export default function SafeKeypadVault({
  gamePack,
  crackedSafeIds,
  onToggleSafe,
  soundEnabled,
  isPro,
  isPreLaunch,
  initialQuery = '',
  onOpenProModal,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [district, setDistrict] = useState('All Districts');
  const [selectedSafeId, setSelectedSafeId] = useState(gamePack.safes[0]?.id || null);
  const [activeDigit, setActiveDigit] = useState(null);
  const [activeStepIdx, setActiveStepIdx] = useState(-1);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const playbackTimersRef = useRef([]);
  const copyTimerRef = useRef(null);

  const clearPlaybackTimers = () => {
    for (const id of playbackTimersRef.current) {
      clearTimeout(id);
    }
    playbackTimersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearPlaybackTimers();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  const filteredSafes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gamePack.safes.filter((s) => {
      const matchDistrict = district === 'All Districts' || s.district === district;
      if (!matchDistrict) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q) ||
        s.code.includes(q) ||
        s.reward.toLowerCase().includes(q) ||
        s.clueLocation.toLowerCase().includes(q)
      );
    });
  }, [gamePack.safes, query, district]);

  const selectedSafe = useMemo(
    () =>
      gamePack.safes.find((s) => s.id === selectedSafeId) ||
      filteredSafes[0] ||
      gamePack.safes[0],
    [gamePack.safes, selectedSafeId, filteredSafes]
  );

  const animateCodePlayback = (codeStr) => {
    clearPlaybackTimers();
    setActiveDigit(null);
    setActiveStepIdx(-1);
    const chars = String(codeStr).split('');
    const stepMs = 160;
    const litMs = 105;

    chars.forEach((digit, idx) => {
      const onTimer = setTimeout(() => {
        setActiveDigit(digit);
        setActiveStepIdx(idx);
        playKeypadBeep(soundEnabled, digit);
      }, idx * stepMs);

      const offTimer = setTimeout(() => {
        setActiveDigit(null);
        if (idx === chars.length - 1) {
          setActiveStepIdx(-1);
        }
      }, idx * stepMs + litMs);

      playbackTimersRef.current.push(onTimer, offTimer);
    });
  };

  const handleSelectSafe = (safe) => {
    setSelectedSafeId(safe.id);
    animateCodePlayback(safe.code);
  };

  const handleCopyCode = async (safe, e) => {
    if (e) e.stopPropagation();
    playSwitchTick(soundEnabled, 820);
    try {
      await navigator.clipboard.writeText(safe.code);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopiedCodeId(safe.id);
      copyTimerRef.current = setTimeout(() => setCopiedCodeId(null), 1600);
    } catch {
      // Ignore
    }
  };

  const handleToggleCracked = (safeId) => {
    const alreadyChecked = crackedSafeIds.includes(safeId);
    if (!alreadyChecked && !isPro && crackedSafeIds.length >= 35) {
      onOpenProModal();
      return;
    }
    if (!alreadyChecked) {
      playUnlockChime(soundEnabled);
    } else {
      playSwitchTick(soundEnabled, 520);
    }
    onToggleSafe(safeId);
  };

  const codeDigits = selectedSafe ? String(selectedSafe.code).split('') : [];

  return (
    <section className="deck-panel">
      <div className="coastal-hero-band" data-tone="teal">
        <div>
          <h1 className="panel-title">Safe &amp; door combinations</h1>
          <p className="panel-subtitle">
            {isPreLaunch
              ? 'UI Demo Mode: 6 fictional placeholder examples to test keypad playback. Zero leaked or NDA data—verified GTA VI codes drop Nov 18.'
              : 'Search by room, clue, or district. Tap any row to play back the keypad sequence.'}
          </p>
        </div>
        <div className="hud-readout">
          <KeyRound size={16} color="var(--teal)" />
          <span>
            {crackedSafeIds.length} / {gamePack.safes.length}{' '}
            {isPreLaunch ? 'UI Demo (Verified Nov 18)' : 'Opened'}
          </span>
        </div>
      </div>

      <div className="deck-body-pad">
        <div className="vault-layout">
          {/* Left Column: Search + District Filter Pills + Safe Cards */}
          <div>
            <div className="search-input-wrap">
              <Search size={18} className="search-icon-pos" aria-hidden="true" />
              <input
                type="search"
                className="deck-input"
                placeholder="Search pawn shop, motel, marina, clue, or loot..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search safe and keypad codes"
              />
            </div>

            <div className="filter-row" role="group" aria-label="Filter by district">
              {gamePack.districts.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={district === d}
                  className={`filter-pill ${district === d ? 'active' : ''}`}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 660);
                    setDistrict(d);
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Mobile Sticky Sequence Bar (<860px) */}
            {selectedSafe && (
              <div className="mobile-keypad-strip" aria-label="Selected safe keypad sequence">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: 'var(--ink-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedSafe.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {codeDigits.map((d, i) => (
                      <span
                        key={`${selectedSafe.id}-mpip-${i}`}
                        className={`keypad-pip ${activeStepIdx === i ? 'pulsing' : ''}`}
                        style={{ width: 34, padding: '3px 0', fontSize: '1.04rem' }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-key-btn"
                  style={{ minHeight: 38, padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => animateCodePlayback(selectedSafe.code)}
                >
                  <RotateCcw size={13} />
                  <span>Replay</span>
                </button>
              </div>
            )}

            {filteredSafes.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: 'var(--surface-tint)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--ink-secondary)',
                  fontSize: '0.92rem',
                }}
              >
                No safes match &ldquo;{query}&rdquo; in {district}. Try clearing search or choosing All Districts.
              </div>
            ) : (
              filteredSafes.map((safe) => {
                const isCracked = crackedSafeIds.includes(safe.id);
                const isSelected = selectedSafe?.id === safe.id;
                return (
                  <article
                    key={safe.id}
                    className={`safe-card ${isSelected ? 'selected' : ''}`}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      className="safe-select-trigger"
                      onClick={() => handleSelectSafe(safe)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong
                          style={{
                            fontSize: '0.98rem',
                            textDecoration: isCracked ? 'line-through' : 'none',
                            color: isCracked ? 'var(--ink-muted)' : 'var(--ink-primary)',
                          }}
                        >
                          {safe.title}
                        </strong>
                        <span className="district-pill">{safe.district}</span>
                        {!safe.verified && (
                          <span
                            className="district-pill"
                            style={{
                              background: 'var(--gold-soft)',
                              color: 'var(--gold)',
                              border: '1px solid var(--gold-border)',
                            }}
                          >
                            {safe.verifiedStatus || 'Simulated Demo'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.83rem', color: 'var(--ink-secondary)', marginTop: 4 }}>
                        Clue: {safe.clueLocation}
                      </div>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--teal-dark)', marginTop: 3 }}>
                        Reward: {safe.reward}
                      </div>
                    </button>

                    <div className="safe-card-actions">
                      <span className="safe-code-badge" onClick={() => handleSelectSafe(safe)} style={{ cursor: 'pointer' }}>
                        {safe.code}
                      </span>
                      <button
                        type="button"
                        className="tactile-icon-btn"
                        aria-label={isCracked ? `Unmark ${safe.title}` : `Mark ${safe.title} opened`}
                        onClick={() => handleToggleCracked(safe.id)}
                        style={{
                          borderColor: isCracked ? 'var(--teal)' : undefined,
                          background: isCracked ? 'var(--teal-soft)' : undefined,
                          color: isCracked ? 'var(--teal-dark)' : undefined,
                        }}
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Right Column (Desktop >=860px): Bright Sculpted Anodized Hardware Keypad */}
          {selectedSafe && (
            <aside className="keypad-box" aria-label="Safe keypad visualiser">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--ink-secondary)',
                }}
              >
                <span>Keypad Sequence</span>
                <span
                  style={{
                    color: selectedSafe.verified ? 'var(--teal-dark)' : 'var(--gold)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {selectedSafe.verified ? 'Verified In-Game' : 'Simulated Demo (Not Real Code)'}
                </span>
              </div>

              <div className="keypad-pip-row">
                {codeDigits.map((digit, idx) => (
                  <div
                    key={`${selectedSafe.id}-pip-${idx}`}
                    className={`keypad-pip ${activeStepIdx === idx ? 'pulsing' : ''}`}
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div className="keypad-grid">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'COPY', '0', 'PLAY'].map((keyLabel) => {
                  const isLit = activeDigit === keyLabel;
                  const isInCode = keyLabel.length === 1 && selectedSafe.code.includes(keyLabel);
                  const isAction = keyLabel.length > 1;
                  return (
                    <button
                      key={keyLabel}
                      type="button"
                      className={`keypad-digit ${isLit ? 'lit' : ''} ${!isLit && isInCode ? 'in-code' : ''}`}
                      style={{
                        fontSize: isAction ? '0.78rem' : undefined,
                      }}
                      onClick={() => {
                        if (keyLabel === 'PLAY') {
                          animateCodePlayback(selectedSafe.code);
                        } else if (keyLabel === 'COPY') {
                          handleCopyCode(selectedSafe);
                        } else {
                          clearPlaybackTimers();
                          setActiveDigit(keyLabel);
                          playKeypadBeep(soundEnabled, keyLabel);
                          const t = setTimeout(() => setActiveDigit(null), 130);
                          playbackTimersRef.current.push(t);
                        }
                      }}
                    >
                      {keyLabel === 'PLAY' ? (
                        <>
                          <RotateCcw size={13} /> Play
                        </>
                      ) : keyLabel === 'COPY' ? (
                        <>
                          <Copy size={12} /> {copiedCodeId === selectedSafe.id ? 'Copied' : 'Copy'}
                        </>
                      ) : (
                        keyLabel
                      )}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-strong)',
                  fontSize: '0.81rem',
                  color: 'var(--ink-secondary)',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--ink-primary)' }}>{selectedSafe.title}</div>
                <div style={{ marginTop: 3 }}>Clue: {selectedSafe.clueLocation}</div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

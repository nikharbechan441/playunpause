import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Check,
  Lock,
  Link2,
  Copy,
  Share2,
  Smartphone,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { playSwitchTick, playUnlockChime } from '../utils/soundHaptics.js';

export default function NightRunProDeck({
  gamePack,
  isPro,
  isPreLaunch,
  deckCode,
  checkedRouteIds,
  onToggleRouteStop,
  onOpenProModal,
  runtimeConfig,
  soundEnabled,
}) {
  const [sessionMinutes, setSessionMinutes] = useState(90);
  const [copiedState, setCopiedState] = useState('');
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const stops = gamePack.nightRoutes[sessionMinutes] || gamePack.nightRoutes[90];
  const isRouteLocked = !isPro && sessionMinutes !== 45;
  const freeStops = isRouteLocked ? stops.slice(0, 2) : stops;
  const lockedStops = isRouteLocked ? stops.slice(2) : [];

  const completedMins = stops
    .filter((s) => checkedRouteIds.includes(s.id))
    .reduce((acc, s) => acc + s.mins, 0);

  const flashCopied = (label) => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopiedState(label);
    copyTimerRef.current = setTimeout(() => setCopiedState(''), 2000);
  };

  const copySyncCode = async () => {
    if (!deckCode) return;
    try {
      await navigator.clipboard.writeText(deckCode);
      playSwitchTick(soundEnabled, 880);
      flashCopied('Code copied');
    } catch {
      // Ignore
    }
  };

  const shareMagicLink = async () => {
    if (!deckCode) return;
    const magicUrl = `${window.location.origin}/#sync=${encodeURIComponent(deckCode)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Unpause Sync Link',
          text: `Tap to mirror my Unpause checklist (${deckCode})`,
          url: magicUrl,
        });
        return;
      }
    } catch {
      // Fallback
    }
    try {
      await navigator.clipboard.writeText(magicUrl);
      playSwitchTick(soundEnabled, 880);
      flashCopied('Link copied');
    } catch {
      // Ignore
    }
  };

  const passPrice = runtimeConfig?.passPriceUsd ?? '6.99';
  const launchPrice = runtimeConfig?.launchPriceUsd ?? '9.99';

  const renderStopCard = (stop, idx) => {
    const done = checkedRouteIds.includes(stop.id);
    return (
      <div
        key={stop.id}
        role="button"
        tabIndex={0}
        aria-pressed={done}
        className="safe-card"
        onClick={() => {
          playUnlockChime(soundEnabled);
          onToggleRouteStop(stop.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playUnlockChime(soundEnabled);
            onToggleRouteStop(stop.id);
          }
        }}
        style={{
          cursor: 'pointer',
          borderColor: done ? 'var(--teal)' : undefined,
          background: done ? 'var(--teal-soft)' : undefined,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.73rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: 999,
                background: 'var(--ocean-soft)',
                color: 'var(--ocean)',
              }}
            >
              Stop {idx + 1} ({stop.mins}m)
            </span>
            <strong
              style={{
                fontSize: '0.96rem',
                textDecoration: done ? 'line-through' : 'none',
                color: done ? 'var(--ink-muted)' : 'var(--ink-primary)',
              }}
            >
              {stop.title}
            </strong>
          </div>
          <div style={{ fontSize: '0.83rem', color: 'var(--ink-secondary)', marginTop: 4 }}>
            {stop.detail}
          </div>
        </div>

        <div
          className="tactile-icon-btn"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            borderColor: done ? 'var(--teal)' : undefined,
            background: done ? '#ffffff' : undefined,
            color: done ? 'var(--teal-dark)' : undefined,
          }}
        >
          <Check size={16} />
        </div>
      </div>
    );
  };

  return (
    <section className="deck-panel">
      <div className="coastal-hero-band" data-tone="coral">
        <div>
          <h1 className="panel-title">Weeknight routes &amp; missables shield</h1>
          <p className="panel-subtitle">
            {isPreLaunch
              ? `Founders Pass is $${passPrice} pre-launch ($${launchPrice} Nov 18). Routes & missables below are simulated pre-launch templates—verified spoiler-free Leonida checkpoints populate live Nov 18.`
              : 'Chained 45, 90, and 120-minute loops so every weeknight session builds your bankroll without spoilers.'}
          </p>
        </div>

        {isPro ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="tactile-icon-btn sync-pill-pro" onClick={copySyncCode} title="Copy your full sync code">
              <Link2 size={14} />
              <span>{copiedState || `UP-••••${deckCode.slice(-4)}`}</span>
              <Copy size={13} />
            </button>
            <button
              type="button"
              className="tactile-icon-btn"
              onClick={shareMagicLink}
              title="Send sync link to your PC or squad"
            >
              <Share2 size={14} />
              <span>Share link</span>
            </button>
          </div>
        ) : (
          <div className="hud-readout">
            <Clock size={16} color="var(--coral)" />
            <span>
              {completedMins} / {sessionMinutes} min done
            </span>
          </div>
        )}
      </div>

      <div className="deck-body-pad">
        <div className="night-stage-grid">
          {/* LEFT COLUMN: Illustrated Coastal Route Map + Interactive Stops */}
          <div>
            {/* Handcrafted Sunlit Leonida Coastal Route Map */}
            <div className="coastal-map-card" aria-label="Leonida coastal route overview">
              <svg
                viewBox="0 0 560 165"
                width="100%"
                role="img"
                aria-label="Coastal route connecting Port Gellhorn, Grassrivers, Vice Beach, and Leonida Keys"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              >
                <defs>
                  <linearGradient id="bayWater" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#cdeeff" />
                    <stop offset="100%" stopColor="#b5e6fa" />
                  </linearGradient>
                </defs>
                <rect width="560" height="165" fill="url(#bayWater)" />
                {/* Sunlit Coastal Peninsula & Barrier Islands */}
                <path
                  d="M0,18 L195,12 L255,34 L388,26 L445,58 L430,110 L330,118 L240,98 L120,112 L0,92 Z"
                  fill="#faf4dd"
                  stroke="#d5c9a3"
                  strokeWidth="1.5"
                />
                <path
                  d="M458,42 L512,38 L525,88 L472,102 Z"
                  fill="#e6f7ec"
                  stroke="#a7d7b8"
                  strokeWidth="1.5"
                />
                {/* Southern Keys Island Chain */}
                <path
                  d="M342,136 Q385,128 420,140 Q458,148 498,144"
                  fill="none"
                  stroke="#faf4dd"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Highway US-1 Chained Route Path */}
                <path
                  d="M84,62 C158,52 214,76 286,68 C358,60 434,54 488,68 C482,110 444,136 392,140"
                  fill="none"
                  stroke="#ff5964"
                  strokeWidth="3.5"
                  strokeDasharray="7 5"
                  strokeLinecap="round"
                />
                {/* Stop Nodes */}
                {[
                  { x: 84, y: 62, label: '1. Port Gellhorn', color: '#0077b6' },
                  { x: 286, y: 68, label: '2. Grassrivers', color: '#00a896' },
                  { x: 488, y: 68, label: '3. Vice Beach', color: '#ff5964' },
                  { x: 392, y: 140, label: '4. Leonida Keys', color: '#e89b00' },
                ].map((pt) => (
                  <g key={pt.label}>
                    <circle cx={pt.x} cy={pt.y} r="9" fill={pt.color} stroke="#ffffff" strokeWidth="2.5" />
                    <rect
                      x={pt.x - 48}
                      y={pt.y - 29}
                      width="96"
                      height="17"
                      rx="8.5"
                      fill="rgba(255,255,255,0.92)"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 17}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="800"
                      fill="#0b2545"
                      fontFamily="Inter, sans-serif"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="filter-row" role="group" aria-label="Session length">
              {[
                { mins: 45, label: '45m Express (Free)' },
                { mins: 90, label: '90m Weeknight' },
                { mins: 120, label: '2h Weekend Run' },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  aria-pressed={sessionMinutes === opt.mins}
                  className={`filter-pill ${sessionMinutes === opt.mins ? 'active' : ''}`}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 700);
                    setSessionMinutes(opt.mins);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              {freeStops.map((stop, idx) => renderStopCard(stop, idx))}

              {lockedStops.length > 0 && (
                <div className="route-blurred-stack">
                  <div className="route-blurred-items" aria-hidden="true">
                    {lockedStops.map((stop, idx) => (
                      <div key={stop.id} className="safe-card">
                        <div>
                          <span className="district-pill" style={{ marginRight: 8 }}>
                            Stop {idx + 3} ({stop.mins}m)
                          </span>
                          <strong>{stop.title}</strong>
                          <div style={{ fontSize: '0.82rem', marginTop: 3 }}>{stop.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="route-unlock-overlay">
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        fontSize: '1.08rem',
                        color: 'var(--ink-primary)',
                        marginBottom: 4,
                      }}
                    >
                      Unlock Stops 3 to {stops.length} + Full Missables Shield
                    </div>
                    <div style={{ fontSize: '0.83rem', color: 'var(--ink-secondary)', marginBottom: 12, maxWidth: '42ch' }}>
                      {isPreLaunch
                        ? `One-time $${passPrice} Founders Pass unlocks all 9 live game suites & cloud sync today, plus verified GTA VI stops & checkpoints live Nov 18.`
                        : `One-time $${passPrice} USD purchase. Syncs across phone and PC with zero login or subscription.`}
                    </div>
                    <button type="button" className="primary-coral-btn" onClick={onOpenProModal}>
                      <Lock size={15} />
                      <span>Unlock Full Pass for ${passPrice}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: High-Trust Full Pass Value Card + Spoiler-Free Missables Shield */}
          <div>
            {!isPro && (
              <div className="pass-value-bento">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--ink-primary)' }}>
                    Everything in the ${passPrice} Full Pass
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: 999,
                      background: 'var(--teal-soft)',
                      color: 'var(--teal-dark)',
                    }}
                  >
                    One-time payment, no subscription
                  </span>
                </div>
                <div className="pass-feature-grid">
                  <div className="pass-feature-item">
                    <MapPin size={15} color="var(--coral)" />
                    <span>90m &amp; 2h Chained Routes</span>
                  </div>
                  <div className="pass-feature-item">
                    <ShieldCheck size={15} color="var(--teal)" />
                    <span>Acts I–III Missables Shield</span>
                  </div>
                  <div className="pass-feature-item">
                    <Smartphone size={15} color="var(--ocean)" />
                    <span>Instant Phone + PC Link Sync</span>
                  </div>
                  <div className="pass-feature-item">
                    <Sparkles size={15} color="var(--gold)" />
                    <span>Zero Ads or Subscriptions</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              {gamePack.missablesShield.map((item) => {
                const canRead = isPro || item.freePreview;
                return (
                  <div
                    key={item.id}
                    style={{
                      background: canRead ? 'var(--gold-soft)' : 'var(--surface-white)',
                      border: `1.5px solid ${canRead ? 'var(--gold-border)' : 'var(--border-subtle)'}`,
                      borderRadius: 15,
                      padding: '14px 16px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.94rem',
                          color: 'var(--ink-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <ShieldAlert size={16} color={canRead ? 'var(--gold)' : 'var(--coral)'} />
                        {item.chapter}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.71rem',
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: 'var(--coral-soft)',
                          color: 'var(--coral)',
                          fontWeight: 800,
                        }}
                      >
                        {item.itemsAtRisk} missables at risk
                      </span>
                    </div>

                    {canRead ? (
                      <>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--ink-primary)', marginBottom: 4 }}>
                          Pause before: {item.triggerWarning}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                          {item.spoilerFreeRule}
                        </p>
                      </>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          flexWrap: 'wrap',
                          marginTop: 6,
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', flex: '1 1 180px' }}>
                          Spoiler-free pause checkpoint and 7-figure contract hold rule included in Full Pass.
                        </span>
                        <button type="button" className="subtle-pill-btn" onClick={onOpenProModal}>
                          <Lock size={13} color="var(--coral)" />
                          <span>Unlock (${passPrice})</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

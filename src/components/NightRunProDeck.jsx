import React, { useMemo, useState } from 'react';
import {
  Clock,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Circle,
  MapPin,
  Copy,
  Check,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { playSwitchTick, triggerHaptic } from '../utils/soundHaptics.js';

const SESSION_DURATIONS = [
  { mins: 45, label: '45m Express (Free)', free: true },
  { mins: 90, label: '90m Standard (Pass)', free: false },
  { mins: 120, label: '120m Deep Clear (Pass)', free: false },
];

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
  const [sessionMins, setSessionMins] = useState(45);
  const [activeWaypointId, setActiveWaypointId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const waypoints = gamePack.routeWaypoints || [];
  const missables = gamePack.missablesShield || [];
  const routesMap = gamePack.nightRoutes || {};
  const activeRouteStops = routesMap[sessionMins] || routesMap[45] || [];

  const passPrice = runtimeConfig?.passPriceUsd ?? 6.99;
  const routeLocked = !isPro && sessionMins > 45;

  const completedStopsCount = useMemo(
    () => activeRouteStops.filter((stop) => checkedRouteIds.includes(stop.id)).length,
    [activeRouteStops, checkedRouteIds]
  );

  const focusedWaypoint = useMemo(
    () => waypoints.find((w) => w.id === activeWaypointId) || null,
    [waypoints, activeWaypointId]
  );

  const handleSelectWaypoint = (wpId) => {
    playSwitchTick(soundEnabled, 700);
    triggerHaptic(8);
    setActiveWaypointId((prev) => (prev === wpId ? null : wpId));
  };

  const handleCopyDeckCode = () => {
    if (!deckCode) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(deckCode).catch(() => {});
    }
    playSwitchTick(soundEnabled, 880);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  return (
    <section className="deck-panel" aria-label="Weeknight Route Planner & Missables Shield">
      <div className="studio-hero-band">
        <div>
          <div className="panel-eyebrow">
            <Clock size={13} />
            <span>
              {isPreLaunch
                ? 'PRE-LAUNCH UI PREVIEW · UPDATES LIVE NOV 18–19'
                : 'WEEKNIGHT TIME-BOXED CHECKLIST · ZERO SPOILERS'}
            </span>
          </div>
          <h1 className="panel-title">GTA VI Weeknight Route &amp; Missables Shield</h1>
          <p className="panel-subtitle">
            Finish a productive Leonida circuit inside 45 minutes on a weeknight, inspect coastal
            waypoints, and keep story missables protected before crossing Act gates.
          </p>
        </div>

        <div className="subtab-bar" role="tablist" aria-label="Session length selector">
          {SESSION_DURATIONS.map((opt) => (
            <button
              key={opt.mins}
              type="button"
              role="tab"
              aria-selected={sessionMins === opt.mins}
              className={`subtab-btn ${sessionMins === opt.mins ? 'active' : ''}`}
              onClick={() => {
                playSwitchTick(soundEnabled, 660);
                setSessionMins(opt.mins);
              }}
            >
              {!isPro && !opt.free && <Lock size={12} style={{ marginRight: '5px', verticalAlign: '-1px' }} />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="deck-body-pad">
        <div className="night-stage-grid">
          {/* LEFT: INTERACTIVE LEONIDA ROUTE MAP + TIME-BOXED STOPS */}
          <div>
            <div className="coastal-map-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-recessed)',
                  fontSize: '0.77rem',
                }}
              >
                <span className="mono" style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>
                  LEONIDA SECTOR WAYPOINTS ({waypoints.length})
                </span>
                {focusedWaypoint ? (
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    style={{ minHeight: '28px', padding: '2px 9px', fontSize: '0.72rem' }}
                    onClick={() => setActiveWaypointId(null)}
                  >
                    Filter: {focusedWaypoint.name} ×
                  </button>
                ) : (
                  <span style={{ color: 'var(--ink-muted)' }}>Tap a waypoint pin to focus stops</span>
                )}
              </div>

              <svg
                viewBox="0 0 420 205"
                width="100%"
                role="img"
                aria-label="Interactive Leonida coastal waypoint telemetry map"
                style={{ display: 'block', background: 'var(--bg-canvas)' }}
              >
                <defs>
                  <pattern id="unpauseGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path
                      d="M 24 0 L 0 0 0 24"
                      fill="none"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="420" height="205" fill="url(#unpauseGrid)" />

                {/* Coastline & wetlands subtle terrain polygon */}
                <path
                  d="M 28 148 L 64 78 L 134 52 L 245 48 L 352 60 L 382 96 L 348 136 L 306 176 L 266 184 L 222 150 L 142 142 Z"
                  fill="rgba(255,255,255,0.025)"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.5"
                />

                {/* Circuit polyline */}
                {waypoints.length > 1 && (
                  <polyline
                    points={waypoints.map((w) => `${w.x},${w.y}`).join(' ')}
                    fill="none"
                    stroke="rgba(56,189,248,0.45)"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                )}

                {waypoints.map((wp) => {
                  const active = activeWaypointId === wp.id;
                  const matchingDone = activeRouteStops
                    .filter((s) => s.waypointId === wp.id)
                    .some((s) => checkedRouteIds.includes(s.id));
                  return (
                    <g
                      key={wp.id}
                      className="map-node-btn"
                      tabIndex={0}
                      role="button"
                      aria-label={`Focus waypoint ${wp.num} ${wp.name}`}
                      aria-pressed={active}
                      onClick={() => handleSelectWaypoint(wp.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectWaypoint(wp.id);
                        }
                      }}
                    >
                      {active && (
                        <circle
                          cx={wp.x}
                          cy={wp.y}
                          r={20}
                          fill="none"
                          stroke={wp.color}
                          strokeWidth="1.5"
                          opacity="0.7"
                        />
                      )}
                      <circle
                        cx={wp.x}
                        cy={wp.y}
                        r={13}
                        fill={active ? wp.color : '#121722'}
                        stroke={wp.color}
                        strokeWidth="2"
                      />
                      <text
                        x={wp.x}
                        y={wp.y + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                        fill={active ? '#0B0E14' : '#F3F6FA'}
                      >
                        {wp.num}
                      </text>
                      <text
                        x={wp.x}
                        y={wp.y - 19}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="600"
                        fontFamily="Inter, sans-serif"
                        fill={matchingDone ? '#2CE5B5' : '#A2AEC2'}
                      >
                        {wp.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="meter-labels" style={{ marginBottom: '10px' }}>
              <span className="section-label">
                {sessionMins}-Minute Route ({completedStopsCount}/{activeRouteStops.length} Done)
              </span>
              <span className="district-pill">
                <MapPin size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                {isPro ? 'Synced to Cloud' : 'Stops Track Locally'}
              </span>
            </div>

            {routeLocked ? (
              <div className="route-blurred-stack">
                <div className="route-blurred-items" aria-hidden="true">
                  {activeRouteStops.map((stop) => (
                    <div key={stop.id} className="safe-card">
                      <div>
                        <span className="district-pill">{stop.district} · {stop.mins}m</span>
                        <div style={{ fontWeight: 700, marginTop: '4px' }}>{stop.title}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="route-unlock-overlay">
                  <Lock size={22} color="var(--game-accent)" style={{ marginBottom: '8px' }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.04rem', marginBottom: '6px' }}>
                    {sessionMins}m Extended Chains &amp; Cross-Device Sync
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--ink-secondary)', maxWidth: '34ch' }}>
                    The 45m express route stays 100% free. Grab the one-time Sync Pass (${passPrice}) for
                    extended 90m/120m routes and Phone ↔ Desktop checklist sync.
                  </p>
                  <button type="button" className="primary-coral-btn" onClick={onOpenProModal}>
                    Unlock Extended Routes · ${passPrice}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {activeRouteStops.map((stop, idx) => {
                  const isDone = checkedRouteIds.includes(stop.id);
                  const isFocused = activeWaypointId && stop.waypointId === activeWaypointId;
                  return (
                    <div
                      key={stop.id}
                      className={`safe-card ${isDone ? 'selected' : ''}`}
                      style={
                        isFocused
                          ? { borderColor: 'var(--ocean)', boxShadow: '0 0 0 2px var(--ocean-soft)' }
                          : undefined
                      }
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span className="district-pill">STOP #{idx + 1}</span>
                          <span className="district-pill">{stop.district}</span>
                          <span className="district-pill mono">{stop.mins} mins</span>
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            textDecoration: isDone ? 'line-through' : 'none',
                            color: isDone ? 'var(--ink-muted)' : 'var(--ink-primary)',
                            marginBottom: '3px',
                          }}
                        >
                          {stop.title}
                        </div>
                        <div style={{ fontSize: '0.79rem', color: 'var(--ink-secondary)', lineHeight: 1.45 }}>
                          {stop.detail}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`subtle-pill-btn ${isDone ? 'active' : ''}`}
                        aria-pressed={isDone}
                        aria-label={isDone ? `Uncheck ${stop.title}` : `Complete ${stop.title}`}
                        onClick={() => onToggleRouteStop(stop.id)}
                      >
                        {isDone ? <CheckCircle2 size={16} color="var(--teal-dark)" /> : <Circle size={16} />}
                        <span>{isDone ? 'Done' : 'Check'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: MISSABLES SHIELD & SYNC PASS CARD */}
          <div>
            <div className="meter-labels" style={{ marginBottom: '10px' }}>
              <span className="section-label">
                <ShieldAlert size={14} style={{ marginRight: '5px', verticalAlign: '-2px', color: 'var(--gold)' }} />
                Spoiler-Free Missables Shield
              </span>
              <span className="district-pill">Act I Free · II–III w/ Pass</span>
            </div>

            {missables.map((item) => {
              const unlocked = isPro || item.freePreview;
              if (!unlocked) {
                return (
                  <div key={item.id} className="mg-subcard" style={{ marginBottom: '10px' }}>
                    <div className="mg-subcard-head" style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.chapter}</span>
                      <span className="district-pill" style={{ color: 'var(--coral)' }}>
                        {isPreLaunch ? `Est. ${item.itemsAtRisk} Slots (Preview)` : `${item.itemsAtRisk} Missables Protected`}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                      {isPreLaunch
                        ? 'Pre-launch preview template — updates with verified trigger alerts at release with Unpause Sync Pass.'
                        : 'Trigger alert & pre-mission checklist rule included with Unpause Sync Pass.'}
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 600, color: 'var(--ink-secondary)' }}>
                      <Lock size={12} color="var(--game-accent)" />
                      <span>Included with Sync Pass below</span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={item.id} className="mg-subcard" style={{ marginBottom: '10px' }}>
                  <div className="mg-subcard-head" style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.chapter}</span>
                    <span className="district-pill" style={{ color: 'var(--teal-dark)' }}>
                      {isPreLaunch ? `Est. ${item.itemsAtRisk} Slots (Preview)` : `${item.itemsAtRisk} Items Shielded`}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '5px' }}>
                    Pause Trigger: {item.triggerWarning}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.81rem', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                    {item.spoilerFreeRule}
                  </p>
                </div>
              );
            })}

            <div className="pass-value-bento" style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '0.92rem' }}>
                  <Sparkles size={15} color="var(--game-accent)" />
                  <span>{isPro ? 'Unpause Sync Pass Active' : `Unpause Sync Pass · $${passPrice} Once`}</span>
                </div>
                {isPro && deckCode && (
                  <button type="button" className="subtle-pill-btn" onClick={handleCopyDeckCode}>
                    {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                    <span className="mono">{deckCode}</span>
                  </button>
                )}
              </div>

              <div className="pass-feature-grid">
                <div className="pass-feature-item">
                  <QrCode size={14} color="var(--ocean)" />
                  <span>Phone ↔ PC QR Sync</span>
                </div>
                <div className="pass-feature-item">
                  <Clock size={14} color="var(--teal-dark)" />
                  <span>90m &amp; 120m Chains</span>
                </div>
                <div className="pass-feature-item">
                  <ShieldAlert size={14} color="var(--gold)" />
                  <span>{isPreLaunch ? 'Act I–III Shield (Live Nov 18)' : 'Full Act I–III Shield'}</span>
                </div>
                <div className="pass-feature-item">
                  <CheckCircle2 size={14} color="var(--game-accent)" />
                  <span>Unlimited Cross-Game Pins</span>
                </div>
              </div>

              {!isPro && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    className="primary-coral-btn"
                    style={{ width: '100%' }}
                    onClick={onOpenProModal}
                  >
                    Unlock Sync Pass · ${passPrice} (One-Time)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

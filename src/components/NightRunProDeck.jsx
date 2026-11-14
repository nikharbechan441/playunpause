import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Circle,
  MapPin,
  Copy,
  Check,
  Link2,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { playSwitchTick, triggerHaptic } from '../utils/soundHaptics.js';
import { copyTextReliably } from '../utils/clipboard.js';
import { buildNightRunSharePath, buildNightRunShareUrl } from '../utils/shareUrlHelpers.js';

const SESSION_DURATIONS = [
  { mins: 45, label: '45m Express (Free)', free: true },
  { mins: 90, label: '90m Standard (Pass)', free: false },
  { mins: 120, label: '120m Deep Clear (Pass)', free: false },
];

export default function NightRunProDeck({
  gamePack,
  isPro,
  isPreLaunch,
  isEmbed = false,
  deckCode,
  checkedRouteIds,
  onToggleRouteStop,
  onOpenProModal,
  runtimeConfig,
  soundEnabled,
  initialPreset = null,
  presetKey = '',
}) {
  const [sessionMins, setSessionMins] = useState(() => initialPreset?.mins ?? 45);
  const [activeWaypointId, setActiveWaypointId] = useState(() => initialPreset?.waypointId || null);
  const [copiedCode, setCopiedCode] = useState('');
  const [copiedRouteLink, setCopiedRouteLink] = useState('');
  const [shareFallbackUrl, setShareFallbackUrl] = useState('');
  const [liveStatus, setLiveStatus] = useState('');
  const toastTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (initialPreset?.mins && [45, 90, 120].includes(initialPreset.mins)) {
      setSessionMins(initialPreset.mins);
    }
    if (initialPreset?.waypointId !== undefined) {
      setActiveWaypointId(initialPreset.waypointId || null);
    }
    setShareFallbackUrl('');
  }, [presetKey]);

  const setTimedToast = (setter, value, announcement) => {
    setter(value);
    if (announcement) setLiveStatus(announcement);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setter('');
      setLiveStatus('');
    }, 2400);
  };

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

  const handleCopyDeckCode = async () => {
    if (!deckCode) return;
    playSwitchTick(soundEnabled, 880);
    const ok = await copyTextReliably(deckCode);
    setTimedToast(
      setCopiedCode,
      ok ? 'ok' : 'blocked',
      ok ? `Sync Pass code ${deckCode} copied.` : 'Clipboard blocked — copy Sync Pass code manually.'
    );
  };

  const shareSpecState = {
    mins: sessionMins,
    waypointId: activeWaypointId || '',
  };
  const sharePath = buildNightRunSharePath(shareSpecState);
  const shareFullUrl = buildNightRunShareUrl(
    shareSpecState,
    typeof window !== 'undefined' ? window.location.origin : 'https://playunpause.com'
  );

  const handleDurationKeyDown = (e, idx) => {
    let nextIdx = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % SESSION_DURATIONS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + SESSION_DURATIONS.length) % SESSION_DURATIONS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = SESSION_DURATIONS.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    const nextOpt = SESSION_DURATIONS[nextIdx];
    playSwitchTick(soundEnabled, 660);
    setSessionMins(nextOpt.mins);
    const tabs = e.currentTarget.parentElement?.querySelectorAll('[role="tab"]');
    tabs?.[nextIdx]?.focus();
  };

  const TitleTag = isEmbed ? 'h1' : 'h2';

  const toolbarNode = (
    <div className="subtab-toolbar">
      <div className="subtab-bar" role="tablist" aria-label="Session length selector">
        {SESSION_DURATIONS.map((opt, idx) => (
          <button
            key={opt.mins}
            id={`night-tab-${opt.mins}`}
            type="button"
            role="tab"
            tabIndex={sessionMins === opt.mins ? 0 : -1}
            aria-selected={sessionMins === opt.mins}
            aria-controls="night-route-panel"
            className={`subtab-btn ${sessionMins === opt.mins ? 'active' : ''}`}
            onKeyDown={(e) => handleDurationKeyDown(e, idx)}
            onClick={() => {
              playSwitchTick(soundEnabled, 660);
              setSessionMins(opt.mins);
            }}
          >
            {!isPro && !opt.free && (
              <Lock size={12} aria-hidden="true" style={{ marginRight: '5px', verticalAlign: '-1px' }} />
            )}
            {opt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="subtle-pill-btn"
        data-share-url={sharePath}
        onClick={async () => {
          playSwitchTick(soundEnabled, 820);
          const ok = await copyTextReliably(shareFullUrl);
          if (ok) {
            setShareFallbackUrl('');
            setTimedToast(setCopiedRouteLink, 'ok', 'Night Run preset link copied.');
          } else {
            setShareFallbackUrl(shareFullUrl);
            setTimedToast(setCopiedRouteLink, 'blocked', 'Clipboard blocked — copy preset URL below.');
          }
        }}
      >
        {copiedRouteLink === 'ok' ? <Check size={13} aria-hidden="true" /> : <Link2 size={13} aria-hidden="true" />}
        <span>
          {copiedRouteLink === 'ok'
            ? 'Copied Link'
            : shareFallbackUrl
              ? 'Copy Below'
              : 'Share Link'}
        </span>
      </button>
    </div>
  );

  return (
    <section className="deck-panel" aria-label="Weeknight Route Planner & Missables Shield">
      {isEmbed ? (
        <div className="studio-hero-band">
          <div>
            <div className="panel-eyebrow">
              <Clock size={13} aria-hidden="true" />
              <span>
                {isPreLaunch
                  ? 'PRE-LAUNCH UI PREVIEW · UPDATES LIVE NOV 18–19'
                  : 'WEEKNIGHT TIME-BOXED CHECKLIST · ZERO SPOILERS'}
              </span>
            </div>
            <TitleTag className="panel-title">GTA VI Weeknight Route &amp; Missables Shield</TitleTag>
            <p className="panel-subtitle">
              Finish a productive Leonida circuit inside 45 minutes on a weeknight, inspect coastal
              waypoints, and keep story missables protected before crossing Act gates.
            </p>
          </div>
          {toolbarNode}
        </div>
      ) : (
        <div className="studio-compact-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Clock size={15} color="var(--coral)" aria-hidden="true" />
            <TitleTag className="panel-title">GTA VI Weeknight Route &amp; Missables Shield</TitleTag>
            <span className="district-pill">
              {isPreLaunch ? 'Launch UI Preview' : 'Zero Spoilers'}
            </span>
          </div>
          {toolbarNode}
        </div>
      )}

      <div className="deck-body-pad">
        {shareFallbackUrl && (
          <div className="share-fallback-box" style={{ marginTop: 0, marginBottom: '12px' }}>
            <label className="share-fallback-label" htmlFor="night-share-fallback-input">
              Clipboard access blocked — copy your Night Run preset URL:
            </label>
            <input
              id="night-share-fallback-input"
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
          {liveStatus && (
            <div
              className={`inline-status-note mono ${copiedRouteLink === 'blocked' || copiedCode === 'blocked' ? 'err' : 'ok'}`}
              style={{ marginTop: 0, marginBottom: '10px' }}
            >
              {liveStatus}
            </div>
          )}
        </div>
        <div className="night-stage-grid">
          {/* LEFT: INTERACTIVE LEONIDA ROUTE MAP + TIME-BOXED STOPS */}
          <div id="night-route-panel" role="tabpanel" aria-labelledby={`night-tab-${sessionMins}`}>
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
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
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
                      stroke="var(--border-subtle)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="420" height="205" fill="url(#unpauseGrid)" />

                {/* Coastline & wetlands subtle terrain polygon */}
                <path
                  d="M 28 148 L 64 78 L 134 52 L 245 48 L 352 60 L 382 96 L 348 136 L 306 176 L 266 184 L 222 150 L 142 142 Z"
                  fill="var(--surface-tint)"
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                />

                {/* Circuit polyline */}
                {waypoints.length > 1 && (
                  <polyline
                    points={waypoints.map((w) => `${w.x},${w.y}`).join(' ')}
                    fill="none"
                    stroke="var(--ocean)"
                    strokeOpacity={0.55}
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
                      <circle
                        className="map-node-visual"
                        cx={wp.x}
                        cy={wp.y}
                        r={13}
                        fill={active ? wp.color : 'var(--bg-surface)'}
                        stroke={wp.color}
                        strokeWidth="2"
                      />
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
                      <text
                        x={wp.x}
                        y={wp.y + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                        fill={active ? '#0B0E14' : 'var(--ink-primary)'}
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
                        fill={matchingDone ? 'var(--teal-dark)' : 'var(--ink-secondary)'}
                      >
                        {wp.name}
                      </text>
                      <circle
                        className="map-node-hit"
                        cx={wp.x}
                        cy={wp.y}
                        r={36}
                      />
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
                    {copiedCode === 'ok' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
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
                    className="primary-coral-btn full-width-btn"
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

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Share2, Copy, TrendingUp, Users, Plus, Trash2, Lock, Unlock } from 'lucide-react';
import { playSwitchTick, playUnlockChime } from '../utils/soundHaptics.js';
import {
  renderSquadSplitCanvas,
  copyCanvasToClipboard,
  shareOrDownloadCanvas,
  computeHostGreedLabel,
} from '../utils/canvasCards.js';

const MAX_DOLLARS = 10_000_000_000;
const MIN_CREW_PCT = 5;
const CREW_BAR_COLORS = ['#ff5964', '#00a896', '#0077b6', '#f59e0b'];

const DEFAULT_CREW = [
  { id: 'c1', name: 'Host (Leader)', role: 'Point / Vault', pct: 40, locked: false },
  { id: 'c2', name: 'Player 2', role: 'Wheelman', pct: 20, locked: false },
  { id: 'c3', name: 'Player 3', role: 'Crowd Control', pct: 20, locked: false },
  { id: 'c4', name: 'Player 4', role: 'Lookout', pct: 20, locked: false },
];

function sanitizeMoneyInput(raw) {
  if (raw === '' || raw === null || raw === undefined) return '';
  const cleaned = String(raw).replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return MAX_DOLLARS;
  return Math.min(MAX_DOLLARS, Math.max(0, Math.round(num)));
}

function toFiniteDollars(val) {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(MAX_DOLLARS, Math.max(0, Math.round(num)));
}

function formatCommaDollars(rawVal) {
  if (rawVal === '' || rawVal === null || rawVal === undefined) return '';
  const n = toFiniteDollars(rawVal);
  return `$${n.toLocaleString('en-US')}`;
}

export function rebalanceCrewShares(crewList, changedId = null, requestedVal = null) {
  const n = crewList.length;
  if (n === 0) return [];
  if (n === 1) return [{ ...crewList[0], pct: 100 }];

  if (changedId !== null) {
    const fixedOthers = crewList.filter((m) => m.id !== changedId && m.locked);
    const flexOthers = crewList.filter((m) => m.id !== changedId && !m.locked);

    if (flexOthers.length === 0) {
      const fixedSum = fixedOthers.reduce((s, m) => s + m.pct, 0);
      return crewList.map((m) =>
        m.id === changedId ? { ...m, pct: Math.max(MIN_CREW_PCT, 100 - fixedSum) } : m
      );
    }

    const fixedSum = fixedOthers.reduce((s, m) => s + m.pct, 0);
    const maxAllowed = Math.max(MIN_CREW_PCT, 100 - fixedSum - MIN_CREW_PCT * flexOthers.length);
    const target = Math.min(
      maxAllowed,
      Math.max(MIN_CREW_PCT, Math.round(Number(requestedVal) || MIN_CREW_PCT))
    );

    const distributable = Math.max(0, 100 - fixedSum - target - MIN_CREW_PCT * flexOthers.length);
    const weights = flexOthers.map((m) => Math.max(0, m.pct - MIN_CREW_PCT));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    const rawExtras = flexOthers.map((_, idx) =>
      weightSum > 0 ? (distributable * weights[idx]) / weightSum : distributable / flexOthers.length
    );
    const floored = rawExtras.map((v) => Math.floor(v));
    let rem = distributable - floored.reduce((a, b) => a + b, 0);

    rawExtras
      .map((v, idx) => ({ idx, frac: v - floored[idx] }))
      .sort((a, b) => b.frac - a.frac)
      .forEach(({ idx }) => {
        if (rem > 0) {
          floored[idx] += 1;
          rem -= 1;
        }
      });

    const flexMap = new Map(flexOthers.map((m, idx) => [m.id, MIN_CREW_PCT + floored[idx]]));
    return crewList.map((m) => {
      if (m.id === changedId) return { ...m, pct: target };
      if (flexMap.has(m.id)) return { ...m, pct: flexMap.get(m.id) };
      return m;
    });
  }

  const distributable = Math.max(0, 100 - MIN_CREW_PCT * n);
  const weights = crewList.map((m) => Math.max(1, m.pct));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const rawExtras = weights.map((w) => (distributable * w) / weightSum);
  const floored = rawExtras.map((v) => Math.floor(v));
  let rem = distributable - floored.reduce((a, b) => a + b, 0);

  rawExtras
    .map((v, idx) => ({ idx, frac: v - floored[idx] }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ idx }) => {
      if (rem > 0) {
        floored[idx] += 1;
        rem -= 1;
      }
    });

  return crewList.map((m, idx) => ({ ...m, pct: MIN_CREW_PCT + floored[idx], locked: false }));
}

export default function SquadHeistMarketDeck({ gamePack, soundEnabled }) {
  const [subMode, setSubMode] = useState('heist');
  const [selectedPresetId, setSelectedPresetId] = useState(gamePack.heistPresets[0].id);
  const [grossTakeInput, setGrossTakeInput] = useState(String(gamePack.heistPresets[0].grossDollars));
  const [supportFeePct, setSupportFeePct] = useState(gamePack.heistPresets[0].supportFeePct);
  const [crew, setCrew] = useState(DEFAULT_CREW);
  const [copyFeedback, setCopyFeedback] = useState('');
  const copyTimerRef = useRef(null);

  const [capitalInput, setCapitalInput] = useState('250000');
  const [selectedFlipId, setSelectedFlipId] = useState(gamePack.marketFlips[0].id);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const selectedPreset = useMemo(
    () => gamePack.heistPresets.find((p) => p.id === selectedPresetId) || gamePack.heistPresets[0],
    [gamePack.heistPresets, selectedPresetId]
  );

  const splitBreakdown = useMemo(() => {
    const cleanGross = toFiniteDollars(grossTakeInput);
    const parsedFee = Number(supportFeePct);
    const cleanFeePct = Number.isFinite(parsedFee) ? Math.min(50, Math.max(0, parsedFee)) : 0;
    const supportFeeDollars = Math.round((cleanGross * cleanFeePct) / 100);
    const netPoolDollars = Math.max(0, cleanGross - supportFeeDollars);

    let allocated = 0;
    const rows = crew.map((member, idx) => {
      if (idx === crew.length - 1) {
        return {
          ...member,
          payout: Math.max(0, netPoolDollars - allocated),
        };
      }
      const amt = Math.floor((netPoolDollars * member.pct) / 100);
      allocated += amt;
      return {
        ...member,
        payout: amt,
      };
    });

    return {
      grossDollars: cleanGross,
      supportFeeDollars,
      netPoolDollars,
      rows,
    };
  }, [grossTakeInput, supportFeePct, crew]);

  const greedLabel = useMemo(() => computeHostGreedLabel(splitBreakdown.rows), [splitBreakdown.rows]);

  const handleSelectPreset = (preset) => {
    playSwitchTick(soundEnabled, 700);
    setSelectedPresetId(preset.id);
    setGrossTakeInput(String(preset.grossDollars));
    setSupportFeePct(preset.supportFeePct);
  };

  const nudgeGross = (delta) => {
    playSwitchTick(soundEnabled, delta > 0 ? 740 : 620);
    const next = Math.min(MAX_DOLLARS, Math.max(50_000, toFiniteDollars(grossTakeInput) + delta));
    setGrossTakeInput(String(next));
  };

  const updateCrewShare = (id, nextPct) => {
    setCrew((prev) => rebalanceCrewShares(prev, id, nextPct));
  };

  const toggleCrewLock = (id) => {
    playSwitchTick(soundEnabled, 660);
    setCrew((prev) => prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m)));
  };

  const buildSplitCanvas = async () => {
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch {
      // Safe fallback
    }
    return renderSquadSplitCanvas({
      jobTitle: selectedPreset.title,
      grossDollars: splitBreakdown.grossDollars,
      supportFeePct,
      supportFeeDollars: splitBreakdown.supportFeeDollars,
      netPoolDollars: splitBreakdown.netPoolDollars,
      crewRows: splitBreakdown.rows,
    });
  };

  const handleCopyWireImage = async () => {
    playUnlockChime(soundEnabled);
    const canvas = await buildSplitCanvas();
    const ok = await copyCanvasToClipboard(canvas);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    if (ok) {
      setCopyFeedback('Copied! Paste in Discord');
    } else {
      await shareOrDownloadCanvas(
        canvas,
        'unpause-squad-split.png',
        `${selectedPreset.title} Squad Payout Split`
      );
      setCopyFeedback('Saved PNG');
    }
    copyTimerRef.current = setTimeout(() => setCopyFeedback(''), 2400);
  };

  const handleExportSplitCard = async () => {
    playUnlockChime(soundEnabled);
    const canvas = await buildSplitCanvas();
    await shareOrDownloadCanvas(
      canvas,
      'unpause-squad-split.png',
      `${selectedPreset.title} Squad Payout Split`
    );
  };

  const selectedFlip = useMemo(
    () => gamePack.marketFlips.find((f) => f.id === selectedFlipId) || gamePack.marketFlips[0],
    [gamePack.marketFlips, selectedFlipId]
  );

  const flipMath = useMemo(() => {
    const cleanPerProtagonist = toFiniteDollars(capitalInput);
    const baseTotal = cleanPerProtagonist * 2;
    const afterLeg1 = Math.round(baseTotal * (1 + selectedFlip.estPeakPct / 100));
    const afterLeg2 = Math.round(afterLeg1 * (1 + selectedFlip.reboundPct / 100));
    return {
      baseTotal,
      afterLeg1,
      afterLeg2,
      netGain: Math.max(0, afterLeg2 - baseTotal),
    };
  }, [capitalInput, selectedFlip]);

  const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

  return (
    <section className="deck-panel">
      <div className="coastal-hero-band" data-tone="gold">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="panel-title">
              {subMode === 'heist' ? 'Split the heist payout' : 'Two-character stock compounder'}
            </h1>
            <div className="subtab-bar" role="group" aria-label="Squad finance mode">
              <button
                type="button"
                aria-pressed={subMode === 'heist'}
                className={`subtab-btn ${subMode === 'heist' ? 'active' : ''}`}
                onClick={() => {
                  playSwitchTick(soundEnabled, 700);
                  setSubMode('heist');
                }}
              >
                Heist Cut
              </button>
              <button
                type="button"
                aria-pressed={subMode === 'stocks'}
                className={`subtab-btn ${subMode === 'stocks' ? 'active' : ''}`}
                onClick={() => {
                  playSwitchTick(soundEnabled, 730);
                  setSubMode('stocks');
                }}
              >
                Stock Planner
              </button>
            </div>
          </div>
          <p className="panel-subtitle">
            {subMode === 'heist'
              ? 'Deduct NPC hacker fees automatically, lock agreed shares, and send the payout slip to party chat (presets use simulated pre-launch examples; enter any custom payout live).'
              : 'Model two-leg market swings across both playable characters before starting major contracts (simulated pre-launch example tickers).'}
          </p>
        </div>

        <div className="hud-readout">
          {subMode === 'heist' ? (
            <>
              <Users size={16} color="var(--coral)" />
              <span>Net Pool: {fmt(splitBreakdown.netPoolDollars)}</span>
            </>
          ) : (
            <>
              <TrendingUp size={16} color="var(--teal)" />
              <span>Est. Gain: +{fmt(flipMath.netGain)}</span>
            </>
          )}
        </div>
      </div>

      <div className="deck-body-pad">
        {subMode === 'heist' ? (
          <div className="squad-stage-grid">
            {/* LEFT COLUMN: Job Presets + Gross Take + Crew Sliders */}
            <div>
              <div className="filter-row">
                {gamePack.heistPresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`filter-pill ${selectedPresetId === p.id ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(p)}
                  >
                    {p.title} ({fmt(p.grossDollars)})
                  </button>
                ))}
              </div>

              <div className="slider-pair-grid" style={{ marginBottom: 14, marginTop: 0 }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  Gross vault take (USD)
                  <div className="money-input-group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="deck-input no-icon"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}
                      placeholder="$2,450,000"
                      value={grossTakeInput === '' ? '' : formatCommaDollars(grossTakeInput)}
                      onChange={(e) => {
                        const next = sanitizeMoneyInput(e.target.value);
                        setGrossTakeInput(next === '' ? '' : String(next));
                      }}
                    />
                    <button
                      type="button"
                      className="tactile-icon-btn"
                      onClick={() => nudgeGross(-100_000)}
                      title="Subtract $100,000"
                    >
                      -100k
                    </button>
                    <button
                      type="button"
                      className="tactile-icon-btn"
                      onClick={() => nudgeGross(100_000)}
                      title="Add $100,000"
                    >
                      +100k
                    </button>
                  </div>
                </label>

                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span>NPC fence &amp; hacker fee</span>
                    <strong style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                      {supportFeePct}% (-{fmt(splitBreakdown.supportFeeDollars)})
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={supportFeePct}
                    onChange={(e) => setSupportFeePct(Number(e.target.value))}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gap: 9 }}>
                {splitBreakdown.rows.map((member, index) => {
                  const maxSlider = Math.max(MIN_CREW_PCT, 100 - MIN_CREW_PCT * (crew.length - 1));
                  return (
                    <div key={member.id} className={`crew-row ${member.locked ? 'locked' : ''}`}>
                      <input
                        type="text"
                        maxLength={24}
                        value={member.name}
                        placeholder={`Player ${index + 1}`}
                        aria-label={`Crew member ${index + 1} name`}
                        className="crew-name-input"
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 24);
                          setCrew((prev) =>
                            prev.map((m) => (m.id === member.id ? { ...m, name: val } : m))
                          );
                        }}
                      />

                      <div className="crew-row-slider">
                        <input
                          type="range"
                          min={MIN_CREW_PCT}
                          max={maxSlider}
                          step={1}
                          disabled={member.locked}
                          value={member.pct}
                          aria-label={`${member.name || `Player ${index + 1}`} share percentage`}
                          onChange={(e) => updateCrewShare(member.id, e.target.value)}
                        />
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            minWidth: 44,
                            textAlign: 'right',
                            color: 'var(--ink-primary)',
                          }}
                        >
                          {member.pct}%
                        </span>
                      </div>

                      <div className="crew-row-payout">
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: 'var(--teal-dark)',
                            minWidth: 90,
                            textAlign: 'right',
                          }}
                        >
                          {fmt(member.payout)}
                        </span>

                        <button
                          type="button"
                          className="tactile-icon-btn"
                          title={member.locked ? 'Unlock share' : 'Lock share'}
                          aria-label={member.locked ? `Unlock ${member.name} share` : `Lock ${member.name} share`}
                          aria-pressed={member.locked}
                          onClick={() => toggleCrewLock(member.id)}
                          style={{
                            padding: '0 9px',
                            borderColor: member.locked ? 'var(--gold)' : undefined,
                            color: member.locked ? 'var(--gold)' : undefined,
                          }}
                        >
                          {member.locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>

                        {crew.length > 2 && (
                          <button
                            type="button"
                            className="tactile-icon-btn"
                            aria-label={`Remove ${member.name || `Player ${index + 1}`}`}
                            onClick={() => {
                              playSwitchTick(soundEnabled, 480);
                              setCrew((prev) =>
                                rebalanceCrewShares(prev.filter((m) => m.id !== member.id))
                              );
                            }}
                            style={{ padding: '0 9px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() => {
                    playSwitchTick(soundEnabled, 640);
                    const even = Math.floor(100 / crew.length);
                    setCrew((prev) =>
                      prev.map((m, i) => ({
                        ...m,
                        locked: false,
                        pct: i === prev.length - 1 ? 100 - even * (prev.length - 1) : even,
                      }))
                    );
                  }}
                >
                  Equal split ({Math.round(100 / crew.length)}% each)
                </button>

                {crew.length < 4 && (
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() => {
                      playSwitchTick(soundEnabled, 700);
                      setCrew((prev) =>
                        rebalanceCrewShares([
                          ...prev,
                          {
                            id: `c-${Date.now()}`,
                            name: `Player ${prev.length + 1}`,
                            role: 'Support',
                            pct: 20,
                            locked: false,
                          },
                        ])
                      );
                    }}
                  >
                    <Plus size={14} /> Add crew member
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: BRIGHT COASTAL PAYOUT VOUCHER */}
            <aside className="wire-ledger-card" aria-label="Live Squad Payout Slip">
              <div className="wire-header-band">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    opacity: 0.92,
                  }}
                >
                  <span>Crew Payout Voucher</span>
                  <span>playunpause.com</span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '1.14rem',
                    marginTop: 3,
                  }}
                >
                  {selectedPreset.title}
                </div>
              </div>

              <div className="wire-body">
                <div className="cut-stack-bar" title="Proportional vault distribution">
                  {supportFeePct > 0 && (
                    <div
                      style={{
                        width: `${supportFeePct}%`,
                        background: '#f59e0b',
                        transition: 'width 180ms var(--ease-out)',
                      }}
                      title={`NPC Fee: ${supportFeePct}%`}
                    />
                  )}
                  {splitBreakdown.rows.map((m, idx) => {
                    const netShareOfGross = ((100 - supportFeePct) * m.pct) / 100;
                    return (
                      <div
                        key={`${m.id}-seg`}
                        style={{
                          width: `${netShareOfGross}%`,
                          background: CREW_BAR_COLORS[idx % CREW_BAR_COLORS.length],
                          borderLeft: '2px solid #ffffff',
                          transition: 'width 180ms var(--ease-out)',
                        }}
                        title={`${m.name}: ${m.pct}% of net`}
                      />
                    );
                  })}
                </div>

                <div className="wire-summary-grid">
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--ink-muted)', fontWeight: 700 }}>Gross</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--ink-primary)' }}>
                      {fmt(splitBreakdown.grossDollars)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
                      NPC ({supportFeePct}%)
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--gold)' }}>
                      -{fmt(splitBreakdown.supportFeeDollars)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--ink-muted)', fontWeight: 700 }}>Net Pool</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--teal-dark)' }}>
                      {fmt(splitBreakdown.netPoolDollars)}
                    </div>
                  </div>
                </div>

                {splitBreakdown.rows.map((member, idx) => (
                  <div key={`${member.id}-wire`} className="wire-row">
                    <div
                      className="wire-row-fill"
                      style={{
                        width: `${member.pct}%`,
                        background:
                          idx === 0 ? 'rgba(255, 89, 100, 0.12)' : 'rgba(0, 168, 150, 0.11)',
                      }}
                    />
                    <span
                      style={{
                        position: 'relative',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        color: 'var(--ink-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {member.name || `Player ${idx + 1}`}
                    </span>
                    <span
                      style={{
                        position: 'relative',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        color: 'var(--teal-dark)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {member.pct}% ({fmt(member.payout)})
                    </span>
                  </div>
                ))}

                <div
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: 'var(--ocean)',
                    background: 'var(--ocean-soft)',
                    padding: '6px 10px',
                    borderRadius: 8,
                    marginTop: 10,
                  }}
                >
                  {greedLabel}
                </div>

                <div className="stage-action-row">
                  <button type="button" className="primary-coral-btn" onClick={handleCopyWireImage}>
                    <Copy size={15} />
                    <span>{copyFeedback || 'Copy for Discord'}</span>
                  </button>
                  <button type="button" className="secondary-key-btn" onClick={handleExportSplitCard}>
                    <Share2 size={15} />
                    <span>Save PNG</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          /* Sub-Tab 2: Two-Character Market Flip Compounder */
          <div>
            <div className="filter-row">
              {gamePack.marketFlips.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`filter-pill ${selectedFlip.id === f.id ? 'active' : ''}`}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 690);
                    setSelectedFlipId(f.id);
                  }}
                >
                  {f.step}
                </button>
              ))}
            </div>

            <div className="slider-pair-grid" style={{ alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                Starting cash per protagonist (2x combined pool)
                <input
                  type="text"
                  inputMode="numeric"
                  className="deck-input no-icon"
                  style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontWeight: 800 }}
                  placeholder="$250,000"
                  value={capitalInput === '' ? '' : formatCommaDollars(capitalInput)}
                  onChange={(e) => {
                    const next = sanitizeMoneyInput(e.target.value);
                    setCapitalInput(next === '' ? '' : String(next));
                  }}
                />
              </label>

              <div className="meter-box" style={{ marginBottom: 0 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-primary)', fontWeight: 700 }}>
                  Execution note: {selectedFlip.timingRule}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                    marginTop: 12,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.86rem',
                  }}
                >
                  <span>
                    Combined: <strong>{fmt(flipMath.baseTotal)}</strong>
                  </span>
                  <span>
                    Leg 1 (+{selectedFlip.estPeakPct}%): <strong>{fmt(flipMath.afterLeg1)}</strong>
                  </span>
                  <span style={{ color: 'var(--teal-dark)' }}>
                    Rebound (+{selectedFlip.reboundPct}%): <strong>{fmt(flipMath.afterLeg2)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

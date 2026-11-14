import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  TrendingUp,
  Lock,
  Unlock,
  Share2,
  Copy,
  Check,
  Link2,
  Plus,
  Minus,
} from 'lucide-react';
import {
  computeHostGreedLabel,
  renderSquadSplitCanvas,
  copyCanvasToClipboard,
  shareOrDownloadCanvas,
} from '../utils/canvasCards.js';
import { playSwitchTick, triggerHaptic } from '../utils/soundHaptics.js';
import { copyTextReliably } from '../utils/clipboard.js';

const PLAYER_COLORS = ['#FF5964', '#2CE5B5', '#38BDF8', '#F59E0B'];
const NPC_FEE_COLOR = '#64748B';

const DEFAULT_CREW = [
  { id: 'p1', name: 'Host / Lead', role: 'HOST', pct: 40, locked: false },
  { id: 'p2', name: 'Co-Lead', role: 'CREW #2', pct: 30, locked: false },
  { id: 'p3', name: 'Wheelman', role: 'DRIVER', pct: 15, locked: false },
  { id: 'p4', name: 'Tech', role: 'HACKER', pct: 15, locked: false },
];

export function rebalanceCrewShares(crewList, changedId, requestedVal) {
  const lockedTotal = crewList
    .filter((m) => m.id !== changedId && m.locked)
    .reduce((sum, m) => sum + m.pct, 0);

  const unlockedOthers = crewList.filter((m) => m.id !== changedId && !m.locked);
  const maxAllowed = Math.max(0, 100 - lockedTotal);
  const clampedNewVal = Math.max(0, Math.min(maxAllowed, Math.round(requestedVal)));
  const remainingForOthers = 100 - lockedTotal - clampedNewVal;

  if (unlockedOthers.length === 0) {
    return crewList.map((m) =>
      m.id === changedId ? { ...m, pct: 100 - lockedTotal } : m
    );
  }

  const prevUnlockedSum = unlockedOthers.reduce((s, m) => s + m.pct, 0);
  const allocated = [];
  let running = 0;

  unlockedOthers.forEach((m, idx) => {
    if (idx === unlockedOthers.length - 1) {
      allocated.push({ id: m.id, pct: Math.max(0, remainingForOthers - running) });
    } else {
      const share =
        prevUnlockedSum > 0
          ? Math.floor((m.pct / prevUnlockedSum) * remainingForOthers)
          : Math.floor(remainingForOthers / unlockedOthers.length);
      allocated.push({ id: m.id, pct: share });
      running += share;
    }
  });

  const allocMap = Object.fromEntries(allocated.map((a) => [a.id, a.pct]));
  return crewList.map((m) => {
    if (m.id === changedId) return { ...m, pct: clampedNewVal };
    if (!m.locked && allocMap[m.id] !== undefined) return { ...m, pct: allocMap[m.id] };
    return m;
  });
}

function buildCrewFromCuts(cutsArr) {
  if (
    !Array.isArray(cutsArr) ||
    cutsArr.length < 2 ||
    cutsArr.length > 4 ||
    cutsArr.reduce((a, b) => a + Number(b || 0), 0) !== 100
  ) {
    return DEFAULT_CREW;
  }
  return DEFAULT_CREW.map((m, idx) => ({
    ...m,
    pct: idx < cutsArr.length ? Number(cutsArr[idx]) : 0,
  }));
}

function normalizeSubTab(raw) {
  return raw === 'market' || raw === 'stocks' ? 'market' : 'heist';
}

export default function SquadHeistMarketDeck({
  gamePack,
  soundEnabled,
  isPreLaunch = false,
  isEmbed = false,
  initialPreset = null,
  presetKey = '',
}) {
  const presets = gamePack.heistPresets || [];
  const marketFlips = gamePack.marketFlips || [];

  const [subTab, setSubTab] = useState(() => normalizeSubTab(initialPreset?.subTab));
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id || 'ocean-vault');
  const [grossDollars, setGrossDollars] = useState(
    () => initialPreset?.gross ?? presets[0]?.grossDollars ?? 2_450_000
  );
  const [supportFeePct, setSupportFeePct] = useState(
    () => initialPreset?.fee ?? presets[0]?.supportFeePct ?? 12
  );
  const [crew, setCrew] = useState(() => buildCrewFromCuts(initialPreset?.cuts));
  const [seedCash, setSeedCash] = useState(1_600_000);
  const [slipToast, setSlipToast] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!initialPreset) return;
    if (initialPreset.subTab) setSubTab(normalizeSubTab(initialPreset.subTab));
    if (initialPreset.gross !== undefined) setGrossDollars(initialPreset.gross);
    if (initialPreset.fee !== undefined) setSupportFeePct(initialPreset.fee);
    if (initialPreset.cuts) setCrew(buildCrewFromCuts(initialPreset.cuts));
  }, [presetKey]);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedPresetId) || presets[0],
    [presets, selectedPresetId]
  );

  const supportFeeDollars = Math.round((grossDollars * supportFeePct) / 100);
  const netPoolDollars = Math.max(0, grossDollars - supportFeeDollars);

  const crewWithPayouts = useMemo(() => {
    let allocated = 0;
    return crew.map((member, idx) => {
      const payout =
        idx === crew.length - 1
          ? Math.max(0, netPoolDollars - allocated)
          : Math.round((netPoolDollars * member.pct) / 100);
      allocated += payout;
      return {
        ...member,
        color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
        payout,
        grossSharePct: Math.round((member.pct * (100 - supportFeePct)) / 100),
      };
    });
  }, [crew, netPoolDollars, supportFeePct]);

  const greedDiagnosis = useMemo(() => computeHostGreedLabel(crewWithPayouts), [crewWithPayouts]);

  const compoundTimeline = useMemo(() => {
    let runningBalance = Math.max(0, Number(seedCash) || 0);
    return marketFlips.map((flip) => {
      const startBalance = runningBalance;
      const afterDrop = Math.round(startBalance * (1 + flip.estPeakPct / 100));
      const afterRebound = Math.round(afterDrop * (1 + flip.reboundPct / 100));
      runningBalance = afterRebound;
      return {
        ...flip,
        startBalance,
        afterDrop,
        afterRebound,
      };
    });
  }, [seedCash, marketFlips]);

  const handleSelectPreset = (preset) => {
    playSwitchTick(soundEnabled, 660);
    setSelectedPresetId(preset.id);
    setGrossDollars(preset.grossDollars);
    setSupportFeePct(preset.supportFeePct);
  };

  const handlePlayerCount = (delta) => {
    playSwitchTick(soundEnabled, delta > 0 ? 740 : 580);
    if (delta > 0 && crew.length < 4) {
      const nextNum = crew.length + 1;
      const expanded = [
        ...crew.map((c) => ({ ...c, locked: false })),
        {
          id: `p${nextNum}`,
          name: nextNum === 3 ? 'Wheelman' : 'Tech',
          role: `CREW #${nextNum}`,
          pct: 0,
          locked: false,
        },
      ];
      const even = Math.floor(100 / expanded.length);
      const rem = 100 - even * expanded.length;
      setCrew(
        expanded.map((m, i) => ({
          ...m,
          pct: even + (i === 0 ? rem : 0),
        }))
      );
    } else if (delta < 0 && crew.length > 2) {
      const trimmed = crew.slice(0, crew.length - 1).map((c) => ({ ...c, locked: false }));
      const even = Math.floor(100 / trimmed.length);
      const rem = 100 - even * trimmed.length;
      setCrew(
        trimmed.map((m, i) => ({
          ...m,
          pct: even + (i === 0 ? rem : 0),
        }))
      );
    }
  };

  const handleEvenSplit = () => {
    playSwitchTick(soundEnabled, 760);
    const unlockedCount = crew.length;
    const base = Math.floor(100 / unlockedCount);
    const rem = 100 - base * unlockedCount;
    setCrew(
      crew.map((m, i) => ({
        ...m,
        locked: false,
        pct: base + (i === 0 ? rem : 0),
      }))
    );
  };

  const flashToast = (msg) => {
    setSlipToast(msg);
    setTimeout(() => setSlipToast(''), 2600);
  };

  const buildSlipCanvas = () =>
    renderSquadSplitCanvas({
      jobTitle: selectedPreset?.title || 'Custom Squad Heist',
      grossDollars,
      supportFeePct,
      supportFeeDollars,
      netPoolDollars,
      crewRows: crewWithPayouts,
    });

  const handleSaveSlip = async () => {
    setIsExporting(true);
    playSwitchTick(soundEnabled, 880);
    triggerHaptic(12);
    const res = await shareOrDownloadCanvas(
      buildSlipCanvas(),
      'unpause-squad-payout.png',
      'Squad Heist Payout Ledger'
    );
    setIsExporting(false);
    flashToast(res.method === 'shared' ? 'Payout slip shared.' : 'Squad Payout PNG saved.');
  };

  const handleCopySlip = async () => {
    setIsExporting(true);
    playSwitchTick(soundEnabled, 920);
    triggerHaptic(12);
    const ok = await copyCanvasToClipboard(buildSlipCanvas());
    setIsExporting(false);
    flashToast(ok ? 'Payout image copied!' : 'Clipboard PNG unsupported — saved instead via Save PNG.');
  };

  return (
    <section className="deck-panel" aria-label="Squad Heist Cut & Two-Character Stock Planner">
      <div className="studio-hero-band">
        <div>
          <div className="panel-eyebrow">
            <Users size={13} />
            <span>
              {isPreLaunch
                ? 'INTEGER-EXACT 100% LOCK SPLITTER · UI ESTIMATE / PREVIEW SAMPLES'
                : 'INTEGER-EXACT 100% LOCK SPLITTER · NPC FEE DEDUCTION'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isEmbed ? (
              <h1 className="panel-title">Squad Heist Split &amp; Dual-Lead Market Compounder</h1>
            ) : (
              <h2 className="panel-title">Squad Heist Split &amp; Dual-Lead Market Compounder</h2>
            )}
            <span className="district-pill">Gameplay Math Only</span>
          </div>
          <p className="panel-subtitle">
            Lock individual player cuts without rounding drift, settle lobby arguments cleanly with
            a shareable Payout PNG, or plan post-heist dual-character stock rebounds.
          </p>
        </div>

        <div className="subtab-bar" role="tablist" aria-label="Squad planner sub-modes">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'heist'}
            className={`subtab-btn ${subTab === 'heist' ? 'active' : ''}`}
            onClick={() => {
              playSwitchTick(soundEnabled, 660);
              setSubTab('heist');
            }}
          >
            Heist Cut Splitter
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'market'}
            className={`subtab-btn ${subTab === 'market' ? 'active' : ''}`}
            onClick={() => {
              playSwitchTick(soundEnabled, 660);
              setSubTab('market');
            }}
          >
            2-Lead Stock Flip
          </button>
        </div>
      </div>

      <div className="deck-body-pad">
        {subTab === 'heist' ? (
          <div className="squad-stage-grid">
            {/* LEFT CONTROLS */}
            <div>
              <div className="meter-labels" style={{ marginBottom: '8px' }}>
                <span className="section-label">1. Select Vault Preset or Custom Take</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() => handlePlayerCount(-1)}
                    disabled={crew.length <= 2}
                  >
                    <Minus size={13} /> Crew
                  </button>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() => handlePlayerCount(1)}
                    disabled={crew.length >= 4}
                  >
                    <Plus size={13} /> Crew
                  </button>
                  <button type="button" className="subtle-pill-btn" onClick={handleEvenSplit}>
                    Even Split
                  </button>
                </div>
              </div>

              <div className="filter-row">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`filter-pill ${selectedPresetId === p.id ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(p)}
                  >
                    {p.title}
                  </button>
                ))}
              </div>

              <div className="slider-pair-grid" style={{ marginBottom: '16px' }}>
                <div>
                  <label htmlFor="gross-vault-input" className="section-label">
                    Gross Take ($)
                  </label>
                  <div className="money-input-group">
                    <input
                      id="gross-vault-input"
                      type="number"
                      min={10000}
                      max={15000000}
                      step={50000}
                      className="deck-input no-icon mono"
                      value={grossDollars}
                      onChange={(e) => setGrossDollars(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div>
                  <div className="meter-labels" style={{ fontSize: '0.82rem', marginBottom: '8px' }}>
                    <label htmlFor="npc-fee-slider" className="section-label">
                      NPC Crew / Lester-Style Cut
                    </label>
                    <strong className="mono">{supportFeePct}% (-${supportFeeDollars.toLocaleString('en-US')})</strong>
                  </div>
                  <input
                    id="npc-fee-slider"
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={supportFeePct}
                    style={{ width: '100%', '--pct': `${Math.round((supportFeePct / 30) * 100)}%` }}
                    onChange={(e) => setSupportFeePct(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {crewWithPayouts.map((member) => (
                  <div
                    key={member.id}
                    className={`crew-row ${member.locked ? 'locked' : ''}`}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                        <span
                          className="ssd-dot"
                          style={{ background: member.color }}
                        />
                        <span className="district-pill">{member.role}</span>
                      </div>
                      <input
                        type="text"
                        aria-label={`${member.role} player name`}
                        className="crew-name-input"
                        maxLength={24}
                        value={member.name}
                        onChange={(e) =>
                          setCrew((prev) =>
                            prev.map((m) => (m.id === member.id ? { ...m, name: e.target.value } : m))
                          )
                        }
                      />
                    </div>

                    <div className="crew-row-slider">
                      <input
                        type="range"
                        aria-label={`${member.name} cut percentage`}
                        min={0}
                        max={100}
                        step={5}
                        disabled={member.locked}
                        value={member.pct}
                        style={{ flex: 1, '--pct': `${member.pct}%` }}
                        onChange={(e) => {
                          playSwitchTick(soundEnabled, 640);
                          setCrew((prev) =>
                            rebalanceCrewShares(prev, member.id, Number(e.target.value))
                          );
                        }}
                      />
                    </div>

                    <div className="crew-row-payout">
                      <div style={{ textAlign: 'right', minWidth: '88px' }}>
                        <div className="mono" style={{ fontWeight: 700, fontSize: '0.94rem', color: member.color }}>
                          {member.pct}%
                        </div>
                        <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                          ${member.payout.toLocaleString('en-US')}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`subtle-pill-btn ${member.locked ? 'active' : ''}`}
                        aria-pressed={member.locked}
                        aria-label={member.locked ? `Unlock ${member.name}` : `Lock ${member.name} share`}
                        onClick={() => {
                          playSwitchTick(soundEnabled, member.locked ? 560 : 760);
                          setCrew((prev) =>
                            prev.map((m) => (m.id === member.id ? { ...m, locked: !m.locked } : m))
                          );
                        }}
                      >
                        {member.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT WIRE LEDGER + PNG EXPORT */}
            <div className="wire-ledger-card mobile-answer-first">
              <div className="wire-header-band">
                <div className="mono" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ink-muted)' }}>
                  UNPAUSE // SQUAD WIRE LEDGER
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.12rem', fontWeight: 700, marginTop: '2px' }}>
                  {selectedPreset?.title || 'Vault Payout'}
                </div>
              </div>

              <div className="wire-body">
                <div className="cut-stack-bar" aria-label="Vault split breakdown">
                  {supportFeePct > 0 && (
                    <div
                      style={{ width: `${supportFeePct}%`, background: NPC_FEE_COLOR }}
                      title={`NPC Cut: ${supportFeePct}%`}
                    />
                  )}
                  {crewWithPayouts.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        width: `${Math.max(0, (m.pct * (100 - supportFeePct)) / 100)}%`,
                        background: m.color,
                      }}
                      title={`${m.name}: ${m.pct}%`}
                    />
                  ))}
                </div>

                <div className="ssd-legend-row" style={{ marginBottom: '12px', fontSize: '0.77rem' }}>
                  <span>
                    <span className="ssd-dot" style={{ background: NPC_FEE_COLOR }} />
                    NPC ({supportFeePct}%)
                  </span>
                  {crewWithPayouts.map((m) => (
                    <span key={m.id}>
                      <span className="ssd-dot" style={{ background: m.color }} />
                      {m.name} ({m.pct}%)
                    </span>
                  ))}
                </div>

                <div className="wire-summary-grid">
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>GROSS VAULT</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                      ${grossDollars.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>NPC FEE ({supportFeePct}%)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gold)' }}>
                      -${supportFeeDollars.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>NET POOL</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--teal-dark)' }}>
                      ${netPoolDollars.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                {crewWithPayouts.map((m) => (
                  <div key={m.id} className="wire-row">
                    <div
                      className="wire-row-fill"
                      style={{
                        width: `${m.pct}%`,
                        background: `${m.color}22`,
                      }}
                    />
                    <div style={{ position: 'relative', fontWeight: 600, fontSize: '0.85rem' }}>
                      {m.name}{' '}
                      <span style={{ color: 'var(--ink-muted)', fontSize: '0.73rem' }}>({m.role})</span>
                    </div>
                    <div className="mono" style={{ position: 'relative', fontWeight: 700, fontSize: '0.88rem', color: m.color }}>
                      {m.pct}% · ${m.payout.toLocaleString('en-US')}
                    </div>
                  </div>
                ))}

                <div className="receipt-diagnosis" style={{ marginTop: '12px' }}>
                  {greedDiagnosis}
                </div>

                <div className="stage-action-row stage-action-row-3">
                  <button
                    type="button"
                    className="primary-coral-btn"
                    onClick={handleSaveSlip}
                    disabled={isExporting}
                  >
                    <Share2 size={15} />
                    <span>{isExporting ? 'Rendering…' : 'Save Slip PNG'}</span>
                  </button>
                  <button
                    type="button"
                    className="stage-dark-btn"
                    onClick={handleCopySlip}
                    disabled={isExporting}
                  >
                    {slipToast.includes('copied') ? <Check size={15} /> : <Copy size={15} />}
                    <span>Copy Slip</span>
                  </button>
                  <button
                    type="button"
                    className="stage-dark-btn"
                    data-share-url={`/gta-6/heist-split?sub=${subTab}&gross=${grossDollars}&fee=${supportFeePct}&cuts=${crew.map((m) => m.pct).join(',')}`}
                    onClick={async () => {
                      const shareUrl = `${window.location.origin}/gta-6/heist-split?sub=${subTab}&gross=${grossDollars}&fee=${supportFeePct}&cuts=${crew.map((m) => m.pct).join(',')}`;
                      playSwitchTick(soundEnabled, 820);
                      const ok = await copyTextReliably(shareUrl);
                      setSlipToast(ok ? 'Share link copied to clipboard.' : 'Clipboard blocked — copy URL from bar.');
                      setTimeout(() => setSlipToast(''), 2000);
                    }}
                  >
                    {slipToast.includes('Share link') ? <Check size={15} /> : <Link2 size={15} />}
                    <span>
                      {slipToast.includes('Share link')
                        ? 'Copied Link'
                        : slipToast.includes('Clipboard blocked')
                          ? 'Copy Blocked'
                          : 'Share Link'}
                    </span>
                  </button>
                </div>

                {slipToast && (
                  <div className="mono" style={{ marginTop: '8px', fontSize: '0.76rem', color: 'var(--teal-dark)', textAlign: 'center' }}>
                    {slipToast}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="meter-box" style={{ maxWidth: '520px' }}>
              <div className="meter-labels">
                <label htmlFor="seed-cash-input" className="section-label">
                  Dual-Protagonist Combined Seed Capital ($)
                </label>
                <strong className="mono" style={{ color: 'var(--teal-dark)' }}>
                  ${(compoundTimeline[compoundTimeline.length - 1]?.afterRebound || seedCash).toLocaleString('en-US')} Projected
                </strong>
              </div>
              <input
                id="seed-cash-input"
                type="number"
                min={50000}
                max={50000000}
                step={100000}
                className="deck-input no-icon mono"
                style={{ marginTop: '10px' }}
                value={seedCash}
                onChange={(e) => setSeedCash(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <div className="mg-stack-cards">
              {compoundTimeline.map((step) => (
                <div key={step.id} className="mg-subcard">
                  <div className="mg-subcard-head">
                    <h3 className="mg-subcard-title">
                      <TrendingUp size={16} color="var(--teal-dark)" />
                      <span>{step.step} — {step.buyTicker}</span>
                    </h3>
                    <span className="district-pill" style={{ color: 'var(--teal-dark)' }}>
                      +{step.estPeakPct}% Initial · +{step.reboundPct}% Rebound
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                    {step.timingRule}
                  </p>
                  <div className="wire-summary-grid" style={{ marginBottom: 0 }}>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>ENTRY</div>
                      <div style={{ fontWeight: 700 }}>${step.startBalance.toLocaleString('en-US')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>PEAK FLIP</div>
                      <div style={{ fontWeight: 700, color: 'var(--ocean)' }}>${step.afterDrop.toLocaleString('en-US')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>REBOUND ({step.reboundTicker})</div>
                      <div style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>${step.afterRebound.toLocaleString('en-US')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

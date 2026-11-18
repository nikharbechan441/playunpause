import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Bookmark,
  Trash2,
} from 'lucide-react';
import {
  computeHostGreedLabel,
  renderSquadSplitCanvas,
  copyCanvasToClipboard,
  shareOrDownloadCanvas,
} from '../utils/canvasCards.js';
import { playSwitchTick, triggerHaptic } from '../utils/soundHaptics.js';
import { copyTextReliably } from '../utils/clipboard.js';
import { MAX_FREE_PROFILES, MAX_SYNC_PROFILES } from '../utils/syncState.js';
import { AnimatedValue, SpotlightPanel } from '../utils/motionPrimitives.jsx';
import {
  DEFAULT_HEIST_CREW,
  normalizeHeistSubTab,
  buildCrewFromCuts,
  buildHeistMarketSharePath,
  buildHeistMarketShareUrl,
} from '../utils/shareUrlHelpers.js';

const PLAYER_COLORS = ['#FF5964', '#2CE5B5', '#38BDF8', '#F59E0B'];
const PLAYER_TEXT_COLORS = ['var(--coral)', 'var(--teal-dark)', 'var(--ocean)', 'var(--gold)'];
const NPC_FEE_COLOR = '#64748B';

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

export default function SquadHeistMarketDeck({
  gamePack,
  soundEnabled,
  isPreLaunch = false,
  isEmbed = false,
  isPro = false,
  crewPresets = [],
  onSaveCrewPreset,
  onDeleteCrewPreset,
  onOpenProModal,
  initialPreset = null,
  presetKey = '',
}) {
  const presets = gamePack.heistPresets || [];
  const marketFlips = gamePack.marketFlips || [];
  const defaultGross = presets[0]?.grossDollars ?? 2_450_000;

  const [subTab, setSubTab] = useState(() => normalizeHeistSubTab(initialPreset?.subTab));
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id || 'ocean-vault');
  const [grossDollars, setGrossDollars] = useState(
    () => initialPreset?.gross ?? defaultGross
  );
  const [grossInput, setGrossInput] = useState(
    () => String(initialPreset?.gross ?? defaultGross)
  );
  const [supportFeePct, setSupportFeePct] = useState(
    () => initialPreset?.fee ?? presets[0]?.supportFeePct ?? 12
  );
  const [crew, setCrew] = useState(() => buildCrewFromCuts(initialPreset?.cuts, DEFAULT_HEIST_CREW));
  const [seedCash, setSeedCash] = useState(() => initialPreset?.seedCash ?? 1_600_000);
  const [seedInput, setSeedInput] = useState(() => String(initialPreset?.seedCash ?? 1_600_000));
  const [slipToast, setSlipToast] = useState('');
  const [shareFallbackUrl, setShareFallbackUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [presetNotice, setPresetNotice] = useState('');
  const [presetLimitAlert, setPresetLimitAlert] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (isPro || crewPresets.length < MAX_FREE_PROFILES) {
      setPresetLimitAlert(false);
    }
  }, [isPro, crewPresets.length]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!initialPreset) return;
    if (initialPreset.subTab) setSubTab(normalizeHeistSubTab(initialPreset.subTab));
    if (initialPreset.gross !== undefined) {
      setGrossDollars(initialPreset.gross);
      setGrossInput(String(initialPreset.gross));
    }
    if (initialPreset.fee !== undefined) setSupportFeePct(initialPreset.fee);
    if (initialPreset.cuts) setCrew(buildCrewFromCuts(initialPreset.cuts, DEFAULT_HEIST_CREW));
    if (initialPreset.seedCash !== undefined) {
      setSeedCash(initialPreset.seedCash);
      setSeedInput(String(initialPreset.seedCash));
    }
    setShareFallbackUrl('');
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
        textColor: PLAYER_TEXT_COLORS[idx % PLAYER_TEXT_COLORS.length],
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
    setGrossInput(String(preset.grossDollars));
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
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSlipToast(''), 2600);
  };

  const shareSpecState = {
    subTab,
    gross: grossDollars,
    fee: supportFeePct,
    cuts: crew.map((m) => m.pct),
    seedCash,
  };
  const sharePath = buildHeistMarketSharePath(shareSpecState);
  const shareFullUrl = buildHeistMarketShareUrl(
    shareSpecState,
    typeof window !== 'undefined' ? window.location.origin : 'https://playunpause.com'
  );

  const handleCopyShareLink = async () => {
    playSwitchTick(soundEnabled, 820);
    const ok = await copyTextReliably(shareFullUrl);
    if (ok) {
      setShareFallbackUrl('');
      flashToast('Share link copied to clipboard.');
    } else {
      setShareFallbackUrl(shareFullUrl);
      flashToast('Clipboard blocked — copy the preset URL below.');
    }
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
    const canvas = buildSlipCanvas();
    if (!canvas) {
      setIsExporting(false);
      flashToast('Slip export unavailable in this browser.');
      return;
    }
    const res = await shareOrDownloadCanvas(
      canvas,
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
    const canvas = buildSlipCanvas();
    if (!canvas) {
      setIsExporting(false);
      flashToast('Slip export unavailable in this browser.');
      return;
    }
    const ok = await copyCanvasToClipboard(canvas);
    setIsExporting(false);
    flashToast(ok ? 'Payout image copied!' : 'Clipboard PNG unsupported — use Save Slip PNG.');
  };

  const handleSaveCrewPreset = () => {
    if (!onSaveCrewPreset) return;
    if (crewPresets.length >= MAX_SYNC_PROFILES) {
      playSwitchTick(soundEnabled, 640);
      setPresetLimitAlert(false);
      setPresetNotice(`Reached ${MAX_SYNC_PROFILES} saved squad rosters — remove an older roster first.`);
      return;
    }

    const cleanCrew = crew.map((m, idx) => ({
      id: m.id || `p${idx + 1}`,
      name: (m.name || '').replace(/[<>]/g, '').trim().slice(0, 24) || `Player ${idx + 1}`,
      role: (m.role || '').replace(/[<>]/g, '').trim().slice(0, 24) || `CREW #${idx + 1}`,
      pct: Math.max(0, Math.min(100, Math.round(Number(m.pct) || 0))),
      locked: Boolean(m.locked),
    }));
    const pctSum = cleanCrew.reduce((s, m) => s + m.pct, 0);
    if (pctSum !== 100 && cleanCrew.length > 0) {
      cleanCrew[0].pct = Math.max(0, Math.min(100, cleanCrew[0].pct + (100 - pctSum)));
    }
    const namesJoined = cleanCrew.map((m) => m.name).join(' · ');
    const cutsJoined = cleanCrew.map((m) => m.pct).join('/');
    const label = `${namesJoined} (${cutsJoined})`.slice(0, 80);

    playSwitchTick(soundEnabled, 820);
    triggerHaptic(10);
    onSaveCrewPreset({
      id: `cr-${Date.now().toString(36)}`,
      label,
      presetId: selectedPresetId,
      grossDollars,
      supportFeePct,
      crew: cleanCrew,
    });
    setPresetLimitAlert(false);
    setPresetNotice('Squad roster saved.');
    flashToast('Squad roster saved.');
  };

  const handleLoadCrewPreset = (preset) => {
    if (!preset) return;
    playSwitchTick(soundEnabled, 720);
    triggerHaptic(8);
    if (preset.presetId) setSelectedPresetId(preset.presetId);
    const nextGross = typeof preset.grossDollars === 'number' ? preset.grossDollars : defaultGross;
    setGrossDollars(nextGross);
    setGrossInput(String(nextGross));
    setSupportFeePct(typeof preset.supportFeePct === 'number' ? preset.supportFeePct : 12);
    if (Array.isArray(preset.crew) && preset.crew.length >= 2) {
      setCrew(preset.crew.map((m) => ({ ...m })));
    }
    setShareFallbackUrl('');
    setPresetLimitAlert(false);
    setPresetNotice(`Loaded ${preset.label}.`);
    flashToast('Loaded squad roster.');
  };

  const handleSubTabKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const next =
        e.key === 'Home'
          ? 'heist'
          : e.key === 'End'
            ? 'market'
            : subTab === 'heist'
              ? 'market'
              : 'heist';
      playSwitchTick(soundEnabled, 660);
      setSubTab(next);
      const buttons = e.currentTarget.parentElement?.querySelectorAll('[role="tab"]');
      const nextBtn = buttons?.[next === 'heist' ? 0 : 1];
      nextBtn?.focus();
    }
  };

  const subTabBarNode = (
    <div className="subtab-bar" role="tablist" aria-label="Squad planner sub-modes">
      <button
        id="squad-tab-heist"
        type="button"
        role="tab"
        tabIndex={subTab === 'heist' ? 0 : -1}
        aria-selected={subTab === 'heist'}
        aria-controls="squad-panel-heist"
        className={`subtab-btn ${subTab === 'heist' ? 'active' : ''}`}
        onKeyDown={handleSubTabKeyDown}
        onClick={() => {
          playSwitchTick(soundEnabled, 660);
          setSubTab('heist');
        }}
      >
        GTA Online / Future Crew Payout Estimator
      </button>
      <button
        id="squad-tab-market"
        type="button"
        role="tab"
        tabIndex={subTab === 'market' ? 0 : -1}
        aria-selected={subTab === 'market'}
        aria-controls="squad-panel-market"
        className={`subtab-btn ${subTab === 'market' ? 'active' : ''}`}
        onKeyDown={handleSubTabKeyDown}
        onClick={() => {
          playSwitchTick(soundEnabled, 660);
          setSubTab('market');
        }}
      >
        2-Lead Stock Flip
      </button>
    </div>
  );

  return (
    <section className="deck-panel" aria-label="Squad Heist Cut & Two-Character Stock Planner">
      {isEmbed ? (
        <div className="studio-hero-band">
          <div>
            <div className="panel-eyebrow">
              <Users size={13} aria-hidden="true" />
              <span>
                INTEGER-EXACT 100% LOCK SPLITTER · GTA ONLINE / FUTURE CREW PAYOUT ESTIMATOR
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 className="panel-title">GTA Online / Future Crew Payout Estimator &amp; Stock Flip</h1>
              <span className="district-pill">Single-Player Nov 19</span>
            </div>
            <p className="panel-subtitle">
              Grand Theft Auto VI launches November 19 as single-player ($79.99 Standard / $99.99 Ultimate). Use the 2/3/4-player estimator below for GTA Online or future multiplayer crews.
            </p>
          </div>
          {subTabBarNode}
        </div>
      ) : (
        <div className="studio-compact-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Users size={15} color="var(--coral)" aria-hidden="true" />
            <h2 className="panel-title">GTA Online / Future Crew Payout Estimator</h2>
            <span className="district-pill">Single-Player Launch Nov 19</span>
          </div>
          {subTabBarNode}
        </div>
      )}

      <div className="deck-body-pad">
        {subTab === 'heist' ? (
          <>
            <div
              className="nz-compact-card"
              role="note"
              style={{
                marginTop: 0,
                marginBottom: '14px',
                borderColor: 'var(--gold-border)',
                background: 'var(--gold-soft)',
              }}
            >
              <strong>Note:</strong> GTA VI launches November 19, 2026 as a <strong>single-player story release ($79.99 Standard / $99.99 Ultimate)</strong>. This 2/3/4-player splitter is a <strong>GTA Online / Future Crew Payout Estimator</strong>.
            </div>
            <div
              id="squad-panel-heist"
              role="tabpanel"
              aria-labelledby="squad-tab-heist"
              className="squad-stage-grid"
            >
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
                      max={25000000}
                      step={50000}
                      className="deck-input no-icon mono"
                      value={grossInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setGrossInput(raw);
                        if (raw.trim() !== '') {
                          const parsed = Number(raw);
                          if (Number.isFinite(parsed)) {
                            setGrossDollars(Math.max(0, Math.min(25000000, Math.round(parsed))));
                          }
                        }
                      }}
                      onBlur={() => {
                        const clamped = Math.max(10000, Math.min(25000000, Math.round(Number(grossInput) || defaultGross)));
                        setGrossDollars(clamped);
                        setGrossInput(String(clamped));
                      }}
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
                  <div className="slider-stepper-row">
                    <button
                      type="button"
                      className="calc-stepper-btn"
                      aria-label="Decrease NPC cut by 1%"
                      disabled={supportFeePct <= 0}
                      onClick={() => {
                        playSwitchTick(soundEnabled, 600);
                        setSupportFeePct((v) => Math.max(0, v - 1));
                      }}
                    >
                      −
                    </button>
                    <input
                      id="npc-fee-slider"
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={supportFeePct}
                      style={{ '--pct': `${Math.round((supportFeePct / 30) * 100)}%` }}
                      onChange={(e) => setSupportFeePct(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="calc-stepper-btn"
                      aria-label="Increase NPC cut by 1%"
                      disabled={supportFeePct >= 30}
                      onClick={() => {
                        playSwitchTick(soundEnabled, 660);
                        setSupportFeePct((v) => Math.min(30, v + 1));
                      }}
                    >
                      +
                    </button>
                  </div>
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

                    <div className="slider-stepper-row">
                      <button
                        type="button"
                        className="calc-stepper-btn"
                        aria-label={`Decrease ${member.name} cut by 5%`}
                        disabled={member.locked || member.pct <= 0}
                        onClick={() => {
                          playSwitchTick(soundEnabled, 600);
                          setCrew((prev) =>
                            rebalanceCrewShares(prev, member.id, Math.max(0, member.pct - 5))
                          );
                        }}
                      >
                        −
                      </button>
                      <input
                        type="range"
                        aria-label={`${member.name} cut percentage`}
                        min={0}
                        max={100}
                        step={5}
                        disabled={member.locked}
                        value={member.pct}
                        style={{ '--pct': `${member.pct}%` }}
                        onChange={(e) => {
                          playSwitchTick(soundEnabled, 640);
                          setCrew((prev) =>
                            rebalanceCrewShares(prev, member.id, Number(e.target.value))
                          );
                        }}
                      />
                      <button
                        type="button"
                        className="calc-stepper-btn"
                        aria-label={`Increase ${member.name} cut by 5%`}
                        disabled={member.locked || member.pct >= 100}
                        onClick={() => {
                          playSwitchTick(soundEnabled, 680);
                          setCrew((prev) =>
                            rebalanceCrewShares(prev, member.id, Math.min(100, member.pct + 5))
                          );
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div className="crew-row-payout">
                      <div style={{ textAlign: 'right', minWidth: '88px' }}>
                        <div className="mono" style={{ fontWeight: 700, fontSize: '0.94rem', color: member.textColor }}>
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
            <SpotlightPanel className="wire-ledger-card mobile-answer-first">
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
                      $<AnimatedValue value={grossDollars} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>NPC FEE ({supportFeePct}%)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gold)' }}>
                      -$<AnimatedValue value={supportFeeDollars} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>NET POOL</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--teal-dark)' }}>
                      $<AnimatedValue value={netPoolDollars} />
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
                    <div className="mono" style={{ position: 'relative', fontWeight: 700, fontSize: '0.88rem', color: m.textColor }}>
                      {m.pct}% · $<AnimatedValue value={m.payout} />
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
                    <Share2 size={15} aria-hidden="true" />
                    <span>{isExporting ? 'Rendering…' : 'Save Slip PNG'}</span>
                  </button>
                  <button
                    type="button"
                    className="stage-dark-btn"
                    onClick={handleCopySlip}
                    disabled={isExporting}
                  >
                    {slipToast.includes('copied') ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                    <span>Copy Slip</span>
                  </button>
                  <button
                    type="button"
                    className="stage-dark-btn"
                    data-share-url={sharePath}
                    onClick={handleCopyShareLink}
                  >
                    {slipToast.includes('Share link') ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                    <span>
                      {slipToast.includes('Share link')
                        ? 'Copied Link'
                        : shareFallbackUrl
                          ? 'Copy Below'
                          : 'Share Link'}
                    </span>
                  </button>
                </div>

                {shareFallbackUrl && (
                  <div className="share-fallback-box">
                    <label className="share-fallback-label" htmlFor="heist-share-fallback-input">
                      Clipboard access blocked — copy your preset URL:
                    </label>
                    <input
                      id="heist-share-fallback-input"
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
                  {slipToast && (
                    <div
                      className={`inline-status-note mono ${slipToast.includes('blocked') ? 'err' : 'ok'}`}
                      style={{ textAlign: 'center' }}
                    >
                      {slipToast}
                    </div>
                  )}
                </div>

                {!isEmbed && onSaveCrewPreset && (
                  <div className="saved-preset-card" style={{ marginTop: '14px' }}>
                    <div className="saved-preset-head">
                      <div className="saved-preset-title">
                        <Bookmark size={14} color="var(--ocean)" aria-hidden="true" />
                        <span>
                          Saved Squad Rosters ({crewPresets.length} / {MAX_SYNC_PROFILES} Free)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="subtle-pill-btn"
                        onClick={handleSaveCrewPreset}
                      >
                        <Bookmark size={13} aria-hidden="true" />
                        <span>Save Roster</span>
                      </button>
                    </div>

                    <div role="status" aria-live="polite">
                      {presetNotice && (
                        <div className="inline-status-note ok mono" style={{ marginBottom: '8px' }}>
                          {presetNotice}
                        </div>
                      )}
                    </div>

                    {crewPresets.length === 0 ? (
                      <p className="saved-preset-empty">
                        Save regular heist friends &amp; cut rules so your squad split loads in one tap on any device.
                      </p>
                    ) : (
                      <div className="saved-preset-list">
                        {crewPresets.map((preset) => (
                          <div key={preset.id} className="saved-preset-row">
                            <button
                              type="button"
                              className="saved-preset-load-btn"
                              onClick={() => handleLoadCrewPreset(preset)}
                            >
                              <span className="saved-preset-label">{preset.label}</span>
                              <span className="saved-preset-meta mono">
                                ${(preset.grossDollars || 0).toLocaleString('en-US')} gross · {preset.supportFeePct}% NPC
                              </span>
                            </button>
                            {onDeleteCrewPreset && (
                              <button
                                type="button"
                                className="subtle-pill-btn"
                                aria-label={`Remove saved roster ${preset.label}`}
                                onClick={() => {
                                  playSwitchTick(soundEnabled, 580);
                                  onDeleteCrewPreset(preset.id);
                                }}
                              >
                                <Trash2 size={14} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SpotlightPanel>
          </div>
          </>
        ) : (
          <div id="squad-panel-market" role="tabpanel" aria-labelledby="squad-tab-market">
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
                min={0}
                max={50000000}
                step={100000}
                className="deck-input no-icon mono"
                style={{ marginTop: '10px' }}
                value={seedInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  setSeedInput(raw);
                  if (raw.trim() !== '') {
                    const parsed = Number(raw);
                    if (Number.isFinite(parsed)) {
                      setSeedCash(Math.max(0, Math.min(50000000, Math.round(parsed))));
                    }
                  }
                }}
                onBlur={() => {
                  const clamped = Math.max(0, Math.min(50000000, Math.round(Number(seedInput) || 0)));
                  setSeedCash(clamped);
                  setSeedInput(String(clamped));
                }}
              />
              <div className="stage-action-row" style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="stage-dark-btn"
                  data-share-url={sharePath}
                  onClick={handleCopyShareLink}
                >
                  {slipToast.includes('Share link') ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                  <span>{slipToast.includes('Share link') ? 'Copied Link' : 'Share Market Plan'}</span>
                </button>
              </div>
              {shareFallbackUrl && (
                <div className="share-fallback-box">
                  <label className="share-fallback-label" htmlFor="market-share-fallback-input">
                    Clipboard access blocked — copy your preset URL:
                  </label>
                  <input
                    id="market-share-fallback-input"
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
                {slipToast && (
                  <div className={`inline-status-note mono ${slipToast.includes('blocked') ? 'err' : 'ok'}`}>
                    {slipToast}
                  </div>
                )}
              </div>
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

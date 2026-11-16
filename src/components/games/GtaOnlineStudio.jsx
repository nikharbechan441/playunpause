import React, { useEffect, useRef, useState } from 'react';
import { DollarSign, ShieldCheck, Share2 } from 'lucide-react';
import { renderSquadSplitCanvas, shareOrDownloadCanvas } from '../../utils/canvasCards.js';
import { AnimatedValue, SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { PinButton } from './GameStudioDock.jsx';

export const CAYO_TARGETS = [
  { id: 'tequila', name: 'Sinsimito Tequila', short: 'Tequila', val: 630000 },
  { id: 'ruby', name: 'Ruby Necklace', short: 'Ruby', val: 1000000 },
  { id: 'bonds', name: 'Bearer Bonds', short: 'Bonds', val: 1100000 },
  { id: 'diamond', name: 'Pink Diamond', short: 'Diamond', val: 1300000 },
  { id: 'panther', name: 'Panther Statue', short: 'Panther', val: 1900000 },
];

export const CAYO_BAGS = [
  { id: 'gold', name: 'Full Gold Stacks', note: '2+ Players · ~$495K', val: 495000 },
  { id: 'coke', name: 'Full Cocaine', note: 'Best Solo Bag · ~$400K', val: 400000 },
  { id: 'paint', name: '2× Office Paintings', note: 'Quick Run · ~$360K', val: 360000 },
  { id: 'weed', name: 'Mixed Weed / Cash', note: 'Budget Fill · ~$315K', val: 315000 },
];

export default function GtaOnlineStudio({
  soundEnabled,
  playTick,
  onPinSnapshot,
  cayoPrimaryVal,
  setCayoPrimaryVal,
  cayoSecondaryVal,
  setCayoSecondaryVal,
  cayoPlayers,
  setCayoPlayers,
  cayoHostPct,
  setCayoHostPct,
  cayoHardMode,
  setCayoHardMode,
  cayoEliteBonus,
  setCayoEliteBonus,
  cayoResult,
  cayoEliteDollars,
}) {
  const hostTakeHome = cayoResult.hostProfitAfterSetup + cayoEliteDollars;
  const [splitExportMsg, setSplitExportMsg] = useState('');
  const splitToastTimerRef = useRef(null);

  useEffect(() => () => {
    if (splitToastTimerRef.current) clearTimeout(splitToastTimerRef.current);
  }, []);

  const handleSaveSplitPng = async () => {
    playTick?.(soundEnabled, 840);
    const targetName = CAYO_TARGETS.find((t) => t.val === cayoPrimaryVal)?.short || 'Cayo Perico';
    const canvas = renderSquadSplitCanvas({
      jobTitle: `CAYO PERICO · ${targetName.toUpperCase()} (${cayoPlayers}P${cayoHardMode ? ' HARD' : ''})`,
      grossDollars: cayoResult.gross,
      supportFeePct: 12,
      supportFeeDollars: cayoResult.pavelCut + cayoResult.fenceCut,
      netPoolDollars: cayoResult.netPool,
      crewRows: [
        {
          name: 'Host',
          role: cayoEliteBonus ? 'LEADER + ELITE' : 'LEADER',
          pct: cayoResult.hostPct,
          payout: hostTakeHome,
        },
        ...cayoResult.crewPayouts.map((cp) => ({
          name: cp.label,
          role: cayoEliteBonus ? 'CREW + ELITE' : 'CREW',
          pct: cp.pct,
          payout: cp.payout + cayoEliteDollars,
        })),
      ],
    });
    const res = await shareOrDownloadCanvas(
      canvas,
      `unpause-cayo-${cayoPlayers}p-split.png`,
      'Cayo Perico Split Ledger'
    );
    const msg =
      res?.method === 'shared'
        ? 'Split PNG shared.'
        : res?.method === 'downloaded'
          ? 'Split PNG downloaded.'
          : 'Could not export PNG.';
    setSplitExportMsg(msg);
    if (splitToastTimerRef.current) clearTimeout(splitToastTimerRef.current);
    splitToastTimerRef.current = setTimeout(() => setSplitExportMsg(''), 4500);
  };

  return (
    <div className="gs-studio-stack gs-kosatka-sonar">
      {/* KOSATKA SONAR HEIST PLANNING HERO */}
      <SpotlightPanel className="gs-hero-instrument gs-kosatka-hero">
        <div className="gs-cod-top-row">
          <div className="gs-studio-identity">
            <span className="gs-kicker-badge">
              <DollarSign size={13} aria-hidden="true" />
              <span>KOSATKA SUBMARINE // CAYO PERICO PLANNING TABLE</span>
            </span>
            <h2 className="gs-bench-heading">Vault Target &amp; 15%-Floor Crew Payout Split</h2>
          </div>

          <div className="gs-pill-cluster">
            <button
              type="button"
              className="stage-dark-btn gs-export-btn"
              onClick={handleSaveSplitPng}
            >
              <Share2 size={14} aria-hidden="true" />
              <span>Save Split PNG</span>
            </button>

            <PinButton
              label="Pin Payout"
              onClick={() =>
                onPinSnapshot(
                  `${cayoPlayers}P Cayo (${cayoResult.hostPct}% Host)`,
                  `Host Net: $${hostTakeHome.toLocaleString('en-US')}`
                )
              }
            />
          </div>
        </div>

        <div role="status" aria-live="polite">
          {splitExportMsg && <div className="inline-status-note ok mono">{splitExportMsg}</div>}
        </div>

        <div className="gs-mc-coord-hero" aria-live="polite">
          <div>
            <span className="mono gs-micro-label">
              HOST NET PROFIT (AFTER $100K SETUP + PAVEL 2% + FENCE 10%)
            </span>
            <div className="gs-hero-big mono gs-txt-teal">
              $<AnimatedValue value={hostTakeHome} />
            </div>
          </div>
          <div className="gs-pill-cluster">
            <span className="gs-verdict-chip mono">
              Host Share: {cayoResult.hostPct}% (Max {cayoResult.maxHostPct}%)
            </span>
          </div>
        </div>

        {/* Visual Split Bar (Host vs Crew #1..3) */}
        <div className="gs-kosatka-split-vis">
          <div className="gs-fc-split-bar" aria-hidden="true">
            <span className="gs-cayo-seg-host" style={{ width: `${cayoResult.hostPct}%` }} />
            {cayoResult.crewPayouts.map((cp, idx) => (
              <span
                key={cp.label}
                className={`gs-cayo-seg-crew c-${idx}`}
                style={{ width: `${cp.pct}%` }}
              />
            ))}
          </div>
          <div className="gs-mc-y-labels mono">
            <span>Host: {cayoResult.hostPct}% (${hostTakeHome.toLocaleString('en-US')})</span>
            {cayoResult.crewPayouts.map((cp) => (
              <span key={cp.label}>
                {cp.label}: {cp.pct}% (${(cp.payout + cayoEliteDollars).toLocaleString('en-US')})
              </span>
            ))}
          </div>
        </div>
      </SpotlightPanel>

      {/* VAULT TARGET CARDS + CREW SLIDER */}
      <SpotlightPanel className="gs-work-card">
        <div className="filter-row">
          <button
            type="button"
            aria-pressed={cayoHardMode}
            className={`filter-pill ${cayoHardMode ? 'active' : ''}`}
            onClick={() => {
              playTick?.(soundEnabled, 700);
              setCayoHardMode((v) => !v);
            }}
          >
            Hard Mode (+10% Primary)
          </button>
          <button
            type="button"
            aria-pressed={cayoEliteBonus}
            className={`filter-pill ${cayoEliteBonus ? 'active' : ''}`}
            onClick={() => {
              playTick?.(soundEnabled, 700);
              setCayoEliteBonus((v) => !v);
            }}
          >
            <ShieldCheck size={13} aria-hidden="true" />
            <span>Elite Challenge (+${(cayoHardMode ? 100000 : 50000).toLocaleString('en-US')})</span>
          </button>
        </div>

        <h3 className="mg-field-label">1. Select Compound Primary Target</h3>
        <div className="gs-cayo-target-grid" role="group" aria-label="Cayo Perico primary target">
          {CAYO_TARGETS.map((t) => {
            const active = cayoPrimaryVal === t.val;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                className={`gs-cayo-card ${active ? 'active' : ''}`}
                onClick={() => {
                  playTick?.(soundEnabled, 740);
                  setCayoPrimaryVal(t.val);
                }}
              >
                <strong>{t.short}</strong>
                <span className="mono">${(t.val / 1000000).toFixed(2)}M</span>
              </button>
            );
          })}
        </div>

        <div className="mg-field-grid two-col">
          <div className="mg-field">
            <label htmlFor="cayo-bag">2. Secondary Loot Bags</label>
            <select
              id="cayo-bag"
              className="deck-input no-icon"
              value={cayoSecondaryVal}
              onChange={(e) => setCayoSecondaryVal(Number(e.target.value))}
            >
              {!CAYO_BAGS.some((b) => b.val === Number(cayoSecondaryVal)) && (
                <option value={cayoSecondaryVal}>
                  Custom Secondary Loot (~${Math.round(Number(cayoSecondaryVal || 0) / 1000).toLocaleString('en-US')}K)
                </option>
              )}
              {CAYO_BAGS.map((b) => (
                <option key={b.id} value={b.val}>
                  {b.name} ({b.note})
                </option>
              ))}
            </select>
          </div>
          <div className="mg-field">
            <label htmlFor="cayo-players">3. Squad Size (Enforces 15% Floor)</label>
            <select
              id="cayo-players"
              className="deck-input no-icon"
              value={cayoPlayers}
              onChange={(e) => {
                const p = Number(e.target.value);
                setCayoPlayers(p);
                setCayoHostPct(p === 1 ? 100 : 100 - 15 * (p - 1));
              }}
            >
              <option value={1}>Solo (100% Host)</option>
              <option value={2}>Duo (Max 85% Host)</option>
              <option value={3}>Trio (Max 70% Host)</option>
              <option value={4}>Quad (Max 55% Host)</option>
            </select>
          </div>
        </div>

        {cayoPlayers > 1 && (
          <div className="gs-cayo-slider-wrap">
            <div className="meter-labels">
              <label htmlFor="cayo-host-cut-slider">Host Percentage Cut</label>
              <strong className="mono">{cayoResult.hostPct}%</strong>
            </div>
            <input
              id="cayo-host-cut-slider"
              type="range"
              min={15}
              max={cayoResult.maxHostPct}
              step={1}
              value={cayoResult.hostPct}
              style={{
                '--pct': `${Math.round(
                  ((cayoResult.hostPct - 15) / Math.max(1, cayoResult.maxHostPct - 15)) * 100
                )}%`,
              }}
              onChange={(e) => setCayoHostPct(Number(e.target.value))}
            />
          </div>
        )}

        <div className="mg-stat-mini-grid">
          <div className="mg-stat-mini">
            <span>Gross Vault + Bags</span>
            <strong>$<AnimatedValue value={cayoResult.gross} /></strong>
          </div>
          <div className="mg-stat-mini">
            <span>Pavel (2%) + Fence (10%)</span>
            <strong>-$<AnimatedValue value={cayoResult.pavelCut + cayoResult.fenceCut} /></strong>
          </div>
        </div>
      </SpotlightPanel>
    </div>
  );
}

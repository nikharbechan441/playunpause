import React from 'react';
import { ExternalLink } from 'lucide-react';
import {
  LEONIDA_CONSOLES,
  LEONIDA_INSTALLED_GAMES,
  LEONIDA_MBPS_PRESETS,
} from '../../../data/games/leonidaV2Data.js';
import { computeLeonidaStorage } from '../../../utils/leonidaState.js';

export default function LeonidaStorageTab({
  state,
  runtimeConfig,
  onTogglePatch,
  onSelectConsole,
  onToggleInstalledGame,
  onChangeOtherUsedGb,
  onChangeMbps,
}) {
  const calc = computeLeonidaStorage(state);
  const isPs5 = calc.console.platform === 'ps5';
  const hardwareUrl = isPs5
    ? runtimeConfig?.affiliates?.ps5SsdUrl || 'https://www.amazon.com/dp/B0C47ZX1WB?tag=playunpause-20'
    : runtimeConfig?.affiliates?.xboxCardUrl || 'https://www.amazon.com/dp/B0C44XVWCH?tag=playunpause-20';
  const hardwareCta = isPs5
    ? 'Check WD_BLACK SN850P (PS5 M.2 SSD) on Amazon'
    : 'Check WD_BLACK C50 1TB Expansion Card on Amazon';

  return (
    <section className="lh-card" aria-labelledby="lh-storage-heading">
      <div className="lh-card-header">
        <div>
          <h2 id="lh-storage-heading" className="lh-card-title">
            Console Storage Surgery (212 GB + Patch 01.002.002 / 1.0.2.2)
          </h2>
          <p className="lh-card-sub">
            Test usable internal NVMe space against GTA VI base install + Patch 01.002.002 (+0.6 GB PS5 / +1.6 GB Xbox 1.0.2.2).
          </p>
        </div>

        <button
          type="button"
          aria-pressed={state.includePatch}
          className={`lh-btn lh-pressable ${state.includePatch ? 'active-teal' : ''}`}
          onClick={onTogglePatch}
        >
          Patch 01.002.002 (+0.6 GB PS5 / +1.6 GB Xbox): {state.includePatch ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* 5 Console Selector Tiles */}
      <div className="lh-console-grid" role="group" aria-label="Select console storage profile">
        {LEONIDA_CONSOLES.map((con) => {
          const active = state.consoleId === con.id;
          return (
            <button
              key={con.id}
              type="button"
              aria-pressed={active}
              className={`lh-console-tile lh-pressable ${active ? 'active' : ''}`}
              onClick={() => onSelectConsole(con.id)}
            >
              <strong style={{ fontSize: '0.86rem' }}>{con.label}</strong>
              <span className="lh-num" style={{ fontSize: '0.75rem', color: 'var(--lh-slate)' }}>
                {con.usableGb} GB net
              </span>
              <span className="lh-num" style={{ fontSize: '0.72rem', color: 'var(--lh-gold)' }}>
                +{con.patchGb} GB patch
              </span>
            </button>
          );
        })}
      </div>

      {/* Verdict Box */}
      <div
        className={`lh-verdict-box ${calc.isShort ? 'short' : 'fits'}`}
        data-storage-verdict={calc.isShort ? 'short' : 'fits'}
      >
        <div>
          <div
            className="lh-verdict-headline lh-num"
            style={{ color: calc.isShort ? 'var(--lh-coral)' : 'var(--lh-teal)' }}
          >
            {calc.isShort ? `SHORT BY ${calc.shortByGb} GB` : `FITS · ${calc.freeAfterGb} GB FREE`}
          </div>
          <div className="lh-card-sub lh-num" style={{ marginTop: '4px' }}>
            {calc.console.label}: {calc.usableGb} GB usable vs. {calc.totalNeeded} GB needed ({calc.effectiveGamesGb}{' '}
            GB games + {calc.gtaGb} GB GTA VI)
          </div>
        </div>
        <span className={`lh-badge lh-num ${calc.isShort ? 'coral' : 'teal'}`}>
          ETA: {calc.etaLabel} @ {calc.mbps} Mbps
        </span>
      </div>

      {/* Proportional 3-Segment Storage Bar (denom = isShort ? totalNeeded : usableGb) */}
      <div
        className="lh-seg-bar"
        role="img"
        aria-label={`Storage allocation: ${calc.effectiveGamesGb} GB installed games, ${calc.gtaGb} GB GTA VI, ${calc.shortByGb} GB over capacity`}
      >
        <div
          className="lh-seg-games"
          style={{ width: `${calc.gamesPct}%` }}
          title={`Installed Games: ${calc.effectiveGamesGb} GB`}
        />
        <div
          className="lh-seg-fit"
          style={{ width: `${calc.gtaFitPct}%` }}
          title="GTA VI Fitting Space"
        />
        {calc.overPct > 0 && (
          <div
            className="lh-seg-over"
            style={{ width: `${calc.overPct}%` }}
            title={`Over Capacity: ${calc.shortByGb} GB`}
          />
        )}
      </div>

      <div className="lh-seg-legend lh-num">
        <span>Games &amp; Captures: {calc.effectiveGamesGb} GB ({calc.gamesPct}%)</span>
        <span>GTA VI Fit: {calc.gtaFitPct}%</span>
        {calc.isShort && <span style={{ color: 'var(--lh-coral)' }}>Over Capacity: {calc.shortByGb} GB ({calc.overPct}%)</span>}
      </div>

      {/* Inline Mobile/Workbench Amazon Shortage CTA so mobile users don't miss it below the fold */}
      {calc.isShort && (
        <div className="lh-inset-strip coral-border" style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span className="lh-badge coral">Shortage Fix · Expand NVMe</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--lh-slate)' }}>
              As an Amazon Associate I earn from qualifying purchases.
            </span>
          </div>
          <a
            href={hardwareUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="lh-amazon-link lh-pressable"
          >
            <span>{hardwareCta}</span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      )}

      {/* Interactive Installed Game Chips */}
      <div style={{ marginTop: '14px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--lh-ivory)', marginBottom: '4px' }}>
          Currently Installed Games (Click any chip to toggle offload &amp; recalculate):
        </div>
        <div className="lh-chip-row">
          {LEONIDA_INSTALLED_GAMES.map((game) => {
            const installed = state.installedGames.includes(game.id);
            return (
              <button
                key={game.id}
                type="button"
                aria-pressed={installed}
                className={`lh-game-chip lh-pressable lh-num ${installed ? 'installed' : ''}`}
                onClick={() => onToggleInstalledGame(game.id)}
              >
                <span>{game.label}</span>
                <span>({game.gb} GB)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Other Installed Games / Captures Slider (0-600 GB, step 10) */}
      <div className="lh-inset-strip" style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label htmlFor="lh-other-used-gb" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            Other installed games / captures
          </label>
          <span className="lh-badge lh-num">{state.otherUsedGb} GB</span>
        </div>
        <input
          id="lh-other-used-gb"
          type="range"
          min="0"
          max="600"
          step="10"
          className="lh-range"
          value={state.otherUsedGb}
          onChange={(e) => onChangeOtherUsedGb(Number(e.target.value))}
        />
      </div>

      {/* Download ETA Calculator */}
      <div className="lh-inset-strip" style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <strong style={{ fontSize: '0.86rem' }}>Download ETA Calculator</strong>
            <div className="lh-card-sub lh-num" style={{ marginTop: '2px' }}>
              Downloading {calc.gtaGb} GB at {calc.mbps} Mbps takes approximately {calc.etaLabel}.
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {LEONIDA_MBPS_PRESETS.map((speed) => (
              <button
                key={speed}
                type="button"
                aria-pressed={state.mbps === speed}
                className={`lh-btn lh-pressable lh-num ${state.mbps === speed ? 'active-gold' : ''}`}
                onClick={() => onChangeMbps(speed)}
              >
                {speed} Mbps
              </button>
            ))}
            <input
              type="number"
              min="5"
              max="2500"
              aria-label="Custom download speed in Mbps"
              className="lh-num-input lh-num"
              value={state.mbps}
              onChange={(e) => onChangeMbps(e.target.value)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

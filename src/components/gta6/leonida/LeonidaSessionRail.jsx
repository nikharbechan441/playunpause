import React from 'react';
import { Download, ExternalLink } from 'lucide-react';
import {
  LEONIDA_CHAPTERS,
  LEONIDA_SAMPLE_COUNTS,
} from '../../../data/games/leonidaV2Data.js';
import {
  computeFinishDate,
  computeLeonidaStorage,
  computeTrackerStats,
} from '../../../utils/leonidaState.js';

const QUICK_CONSOLES = [
  { id: 'ps5_slim', label: 'PS5 Slim' },
  { id: 'xsx', label: 'Series X' },
  { id: 'xss', label: 'Series S' },
];

function LeonidaSessionRail({
  state,
  runtimeConfig,
  previewSample,
  isExporting,
  hideMiniStorage = false,
  onSelectConsole,
  onToggleInstalledGame,
  onTogglePreviewSample,
  onExportPng,
}) {
  const storageCalc = computeLeonidaStorage(state);
  const isPs5 = storageCalc.console.platform === 'ps5';
  const codInstalled = state.installedGames.includes('cod');

  const hardwareTitle = isPs5
    ? 'WD_BLACK SN850P 1TB NVMe SSD for PS5'
    : 'WD_BLACK C50 1TB Expansion Card for Xbox';
  const hardwareUrl = isPs5
    ? runtimeConfig?.affiliates?.ps5SsdUrl || 'https://www.amazon.com/dp/B0C47ZX1WB?tag=playunpause-20'
    : runtimeConfig?.affiliates?.xboxCardUrl || 'https://www.amazon.com/dp/B0C44XVWCH?tag=playunpause-20';
  const hardwareCta = isPs5
    ? 'Check WD_BLACK SN850P on Amazon'
    : 'Check WD_BLACK C50 1TB on Amazon';

  const displayCounts = previewSample ? LEONIDA_SAMPLE_COUNTS : state.counts;
  const trackerStats = computeTrackerStats(displayCounts);
  const finish = computeFinishDate({
    pace: state.pace,
    chapter: state.chapter,
    hoursPerDay: state.hoursPerDay,
  });
  const chMeta = LEONIDA_CHAPTERS.find((c) => c.id === state.chapter) || LEONIDA_CHAPTERS[0];
  const savedCount = previewSample ? 6 : state.saves.filter((s) => s.saved).length;

  return (
    <aside className="lh-sticky-rail" aria-label="Live Session Rail">
      {/* 1. Mini Console Fit & SSD Card (hidden on /gta-6/storage to avoid duplicate calculator) */}
      {!hideMiniStorage && (
      <section className="lh-card" aria-labelledby="lh-rail-ssd-heading">
        <div className="lh-card-header" style={{ marginBottom: '8px' }}>
          <h2 id="lh-rail-ssd-heading" className="lh-card-title" style={{ fontSize: '1.15rem' }}>
            Mini Console Fit &amp; SSD
          </h2>
          <span className={`lh-badge lh-num ${storageCalc.isShort ? 'coral' : 'teal'}`}>
            {storageCalc.isShort
              ? `SHORT BY ${storageCalc.shortByGb} GB`
              : `FITS · ${storageCalc.freeAfterGb} GB FREE`}
          </span>
        </div>

        {/* 1-click quick console switcher pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {QUICK_CONSOLES.map((qc) => (
            <button
              key={qc.id}
              type="button"
              aria-pressed={state.consoleId === qc.id}
              className={`lh-btn lh-pressable ${state.consoleId === qc.id ? 'active-coral' : ''}`}
              style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => onSelectConsole(qc.id)}
            >
              {qc.label}
            </button>
          ))}
        </div>

        <div className="lh-seg-bar" style={{ height: '12px' }} aria-hidden="true">
          <div className="lh-seg-games" style={{ width: `${storageCalc.gamesPct}%` }} />
          <div className="lh-seg-fit" style={{ width: `${storageCalc.gtaFitPct}%` }} />
          {storageCalc.overPct > 0 && (
            <div className="lh-seg-over" style={{ width: `${storageCalc.overPct}%` }} />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.76rem', color: 'var(--lh-slate)' }} className="lh-num">
          <span>{storageCalc.console.shortLabel}: {storageCalc.usableGb} GB net</span>
          <span>ETA: {storageCalc.etaLabel}</span>
        </div>

        <button
          type="button"
          className={`lh-btn lh-pressable lh-num ${codInstalled ? 'active-gold' : ''}`}
          style={{ width: '100%', marginTop: '10px' }}
          onClick={() => onToggleInstalledGame('cod')}
        >
          {codInstalled ? 'Offload Call of Duty (-145 GB)' : 'Re-add Call of Duty (+145 GB)'}
        </button>

        {/* Contextual Amazon Hardware Card */}
        <div className="lh-inset-strip" style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
            <strong style={{ fontSize: '0.82rem' }}>{hardwareTitle}</strong>
            <span className={`lh-badge ${storageCalc.isShort ? 'coral' : 'teal'}`}>
              {storageCalc.isShort ? 'Shortage Fix' : 'Optional Expansion'}
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

          <p className="lh-card-sub" style={{ fontSize: '0.7rem', marginTop: '6px' }}>
            As an Amazon Associate I earn from qualifying purchases.
          </p>
        </div>
      </section>
      )}

      {/* 2. Leonida 100% Passport Card */}
      <section className="lh-card" aria-labelledby="lh-passport-heading">
        <div className="lh-card-header" style={{ marginBottom: '6px' }}>
          <h2 id="lh-passport-heading" className="lh-card-title" style={{ fontSize: '1.15rem' }}>
            Leonida 100% Passport
          </h2>
          <button
            type="button"
            className={`lh-btn lh-pressable ${previewSample ? 'active-gold' : ''}`}
            style={{ minHeight: '30px', padding: '4px 9px', fontSize: '0.75rem' }}
            onClick={onTogglePreviewSample}
          >
            {previewSample ? 'Show My Run' : 'Preview Sample'}
          </button>
        </div>

        <div className="lh-passport-preview">
          <img
            src="/images/leonida-banner.jpg"
            alt=""
            className="lh-passport-bg"
            loading="lazy"
          />
          <div className="lh-passport-scrim" aria-hidden="true" />
          <div className="lh-passport-inner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
              <span className="lh-display lh-num" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>
                {trackerStats.totalPct}% COMPLETE
              </span>
              <span className="lh-badge coral">{chMeta.label} SAFE</span>
            </div>

            <div className="lh-num" style={{ fontSize: '0.77rem', color: 'var(--lh-slate)', marginTop: '4px' }}>
              Est. Finish: <strong style={{ color: 'var(--lh-ivory)' }}>{finish.formattedDate}</strong> · Saves:{' '}
              <strong style={{ color: 'var(--lh-teal)' }}>{savedCount}/15</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px', marginTop: '10px' }}>
              {trackerStats.rows.slice(0, 3).map((r) => (
                <div
                  key={r.key}
                  style={{
                    backgroundColor: 'rgba(21, 23, 30, 0.88)',
                    border: '1px solid var(--lh-hairline)',
                    borderRadius: '7px',
                    padding: '6px 7px',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--lh-slate)' }}>
                    {r.key === 'waink' ? 'WAiNK' : r.key === 'wildlife' ? 'Wild' : 'Flam'}
                  </div>
                  <div className="lh-num" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--lh-ivory)' }}>
                    {r.value}/{r.target}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isExporting}
          className="lh-btn primary-gold lh-pressable"
          style={{ width: '100%', minHeight: '42px' }}
          onClick={onExportPng}
        >
          <Download size={15} aria-hidden="true" />
          <span>{isExporting ? 'Rendering 9:16 Card...' : 'Export 9:16 Flex Card PNG'}</span>
        </button>
      </section>
    </aside>
  );
}

export default React.memo(LeonidaSessionRail);

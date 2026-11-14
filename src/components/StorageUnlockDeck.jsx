import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HardDrive,
  Download,
  Share2,
  Copy,
  Check,
  Link2,
  ExternalLink,
  AlertTriangle,
  Globe,
  Cpu,
  Trash2,
} from 'lucide-react';
import {
  computeStorageDiagnosis,
  renderStorageReceiptCanvas,
  copyCanvasToClipboard,
  shareOrDownloadCanvas,
} from '../utils/canvasCards.js';
import { playSwitchTick, triggerHaptic } from '../utils/soundHaptics.js';
import { copyTextReliably } from '../utils/clipboard.js';
import {
  formatDurationMinutes,
  formatCountdownMs,
  buildStorageSharePath,
  buildStorageShareUrl,
} from '../utils/shareUrlHelpers.js';

export { formatDurationMinutes, formatCountdownMs };

export default function StorageUnlockDeck({
  gamePack,
  runtimeConfig,
  soundEnabled,
  nowMs,
  isEmbed = false,
  onOpenProModal,
  initialPreset = null,
  presetKey = '',
}) {
  const consoles = gamePack.consoles || [];
  const [selectedConsoleId, setSelectedConsoleId] = useState(
    () => initialPreset?.consoleId || consoles[0]?.id || 'xss-512'
  );
  const [alreadyFreeGb, setAlreadyFreeGb] = useState(
    () => initialPreset?.freeGb ?? 140
  );
  const [includeDayOnePatch, setIncludeDayOnePatch] = useState(
    () => Boolean(initialPreset?.includePatch)
  );
  const [customOffsetGb, setCustomOffsetGb] = useState(
    () => initialPreset?.customOffsetGb ?? 0
  );
  const [mbps, setMbps] = useState(() => initialPreset?.mbps ?? 120);
  const [sacrificedIds, setSacrificedIds] = useState(
    () => (Array.isArray(initialPreset?.sacrificedIds) ? initialPreset.sacrificedIds : [])
  );
  const [actionToast, setActionToast] = useState('');
  const [shareFallbackUrl, setShareFallbackUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!initialPreset) return;
    if (initialPreset.consoleId) setSelectedConsoleId(initialPreset.consoleId);
    if (initialPreset.freeGb !== undefined) setAlreadyFreeGb(initialPreset.freeGb);
    if (initialPreset.includePatch !== undefined) setIncludeDayOnePatch(Boolean(initialPreset.includePatch));
    if (initialPreset.customOffsetGb !== undefined) setCustomOffsetGb(initialPreset.customOffsetGb);
    if (initialPreset.mbps !== undefined) setMbps(initialPreset.mbps);
    if (Array.isArray(initialPreset.sacrificedIds)) setSacrificedIds(initialPreset.sacrificedIds);
    setShareFallbackUrl('');
  }, [presetKey]);

  const selectedConsole = useMemo(
    () => consoles.find((c) => c.id === selectedConsoleId) || consoles[0],
    [consoles, selectedConsoleId]
  );

  const baseInstallGb = selectedConsole?.installGb ?? gamePack.installSizeGb ?? 212;
  const patchGb = includeDayOnePatch ? (gamePack.dayOnePatchGb ?? 35) : 0;
  const installTargetGb = Math.max(100, Math.min(600, baseInstallGb + patchGb + customOffsetGb));
  const usableGb = selectedConsole?.usableGb || 364;
  const clampedFreeGb = Math.min(alreadyFreeGb, usableGb);

  const sacrificedGames = useMemo(
    () => (gamePack.commonInstalledGames || []).filter((g) => sacrificedIds.includes(g.id)),
    [gamePack.commonInstalledGames, sacrificedIds]
  );

  const freedByUninstallGb = useMemo(
    () => sacrificedGames.reduce((sum, g) => sum + g.sizeGb, 0),
    [sacrificedGames]
  );

  const totalClearedGb = Math.min(usableGb, clampedFreeGb + freedByUninstallGb);
  const shortfallGb = Math.max(0, installTargetGb - totalClearedGb);
  const surplusGb = Math.max(0, totalClearedGb - installTargetGb);
  const fits = shortfallGb === 0;

  const nzCountdown = useMemo(() => {
    const targetMs = Date.parse(gamePack.nzUnlockIsoUtc || '');
    if (!Number.isFinite(targetMs)) return 'Nov 18 · 11:00 UTC';
    return formatCountdownMs(targetMs - nowMs);
  }, [gamePack.nzUnlockIsoUtc, nowMs]);

  // Download time in minutes: GB * 8000 Mb / (Mbps * 60 sec * 0.90 realistic throughput factor)
  const downloadMinutes = useMemo(() => {
    const remainingToDownloadGb = installTargetGb;
    const effectiveMbps = Math.max(10, mbps * 0.9);
    return (remainingToDownloadGb * 8000) / (effectiveMbps * 60);
  }, [installTargetGb, mbps]);

  const downloadTimeText = useMemo(() => formatDurationMinutes(downloadMinutes), [downloadMinutes]);

  const freePct = Math.min(100, (clampedFreeGb / usableGb) * 100);
  const freedPct = Math.min(100 - freePct, (freedByUninstallGb / usableGb) * 100);
  const markerLeftPct = Math.min(98, (installTargetGb / usableGb) * 100);
  const freeSliderPct = Math.round((clampedFreeGb / usableGb) * 100);
  const speedSliderPct = Math.round(((mbps - 15) / (1000 - 15)) * 100);

  const upgradeUrl =
    runtimeConfig?.affiliates?.[selectedConsole?.upgradeKind] ||
    'https://www.amazon.com/s?k=PS5+NVMe+SSD+2TB+heatsink';

  const diagnosisLine = useMemo(
    () => computeStorageDiagnosis(selectedConsole?.id, sacrificedGames, fits),
    [selectedConsole?.id, sacrificedGames, fits]
  );

  const flashToast = (msg) => {
    setActionToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setActionToast(''), 2800);
  };

  const shareSpecState = {
    consoleId: selectedConsoleId,
    freeGb: clampedFreeGb,
    includePatch: includeDayOnePatch,
    mbps,
    customOffsetGb,
    sacrificedIds,
  };
  const sharePath = buildStorageSharePath(shareSpecState);
  const shareFullUrl = buildStorageShareUrl(
    shareSpecState,
    typeof window !== 'undefined' ? window.location.origin : 'https://playunpause.com'
  );

  const handleSelectConsole = (consoleObj) => {
    playSwitchTick(soundEnabled, 660);
    triggerHaptic(8);
    setSelectedConsoleId(consoleObj.id);
    setAlreadyFreeGb((prev) => Math.min(prev, consoleObj.usableGb));
  };

  const toggleSacrificeGame = (id) => {
    playSwitchTick(soundEnabled, 740);
    triggerHaptic(10);
    setSacrificedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const buildSpecCanvas = () =>
    renderStorageReceiptCanvas({
      consoleName: selectedConsole.shortName,
      consoleId: selectedConsole.id,
      usableGb,
      installSizeGb: installTargetGb,
      deletedGames: sacrificedGames,
      alreadyFreeGb: clampedFreeGb,
      mbps,
      downloadTimeText,
      nzStatusLabel: selectedConsole.nzStatusShort,
    });

  const handleSaveCard = async () => {
    setIsExporting(true);
    playSwitchTick(soundEnabled, 880);
    triggerHaptic(12);
    const canvas = buildSpecCanvas();
    if (!canvas) {
      setIsExporting(false);
      flashToast('Receipt export unavailable in this browser.');
      return;
    }
    const res = await shareOrDownloadCanvas(
      canvas,
      `unpause-preload-${selectedConsole.id}.png`,
      'GTA VI Preload Spec Card'
    );
    setIsExporting(false);
    flashToast(res.method === 'shared' ? 'Spec card shared.' : 'Preload Spec PNG saved.');
  };

  const handleCopyCard = async () => {
    setIsExporting(true);
    playSwitchTick(soundEnabled, 920);
    triggerHaptic(12);
    const canvas = buildSpecCanvas();
    if (!canvas) {
      setIsExporting(false);
      flashToast('Receipt export unavailable in this browser.');
      return;
    }
    const ok = await copyCanvasToClipboard(canvas);
    setIsExporting(false);
    flashToast(ok ? 'PNG copied to clipboard.' : 'Clipboard PNG unsupported here — use Save Spec PNG.');
  };

  const handleCopyDiscord = () => {
    playSwitchTick(soundEnabled, 880);
    triggerHaptic(10);
    const statusLine = fits
      ? `READY (+${surplusGb} GB buffer)`
      : `SHORT (${shortfallGb} GB needed)`;
    const clearedList = sacrificedGames.length
      ? sacrificedGames.map((g) => `-${g.title} (+${g.sizeGb} GB)`).join(', ')
      : 'None';
    const summary = [
      `**Unpause — GTA VI Storage Fit Plan**`,
      `• Console: ${selectedConsole.shortName} (${usableGb} GB usable)`,
      `• Required Install: ${installTargetGb} GB · Status: **${statusLine}**`,
      `• Existing Free: ${clampedFreeGb} GB · Uninstalled: ${clearedList} · Total Free: ${totalClearedGb} GB`,
      `• ETA @ ${mbps} Mbps: ${downloadTimeText} · Rollout: ${selectedConsole.nzStatusShort}`,
      shareFullUrl,
    ].join('\n');
    copyTextReliably(summary).then((ok) => {
      if (ok) {
        setShareFallbackUrl('');
        flashToast('Discord summary copied.');
      } else {
        setShareFallbackUrl(shareFullUrl);
        flashToast('Clipboard blocked — copy the preset URL below.');
      }
    });
  };

  return (
    <section className="deck-panel" aria-label="Console SSD Preload & Launch Unlock Calculator">
      {isEmbed && (
        <div className="studio-hero-band">
          <div>
            <div className="panel-eyebrow">
              <HardDrive size={13} aria-hidden="true" />
              <span>CONSOLES &amp; LAUNCH SPEC · FREE STORAGE FIT PLANNER</span>
            </div>
            <h1 className="panel-title">GTA VI Storage &amp; Preload Unlock Planner</h1>
            <p className="panel-subtitle">
              Check PS5 &amp; Xbox SSD headroom, uninstall savings, and download ETA in seconds.
            </p>
          </div>
        </div>
      )}
      <div className="deck-body-pad">
        <div
          className={fits ? 'mobile-live-verdict ok' : 'mobile-live-verdict short'}
          style={{
            borderColor: fits ? 'var(--teal-border)' : 'var(--coral-border)',
            background: fits ? 'var(--teal-soft)' : 'var(--coral-soft)',
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: fits ? 'var(--teal-dark)' : 'var(--coral)' }}>
              {fits ? `FITS ON ${selectedConsole.shortName.toUpperCase()}` : `SHORT BY ${shortfallGb} GB`}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
              {totalClearedGb} GB free vs {installTargetGb} GB req · ETA {downloadTimeText}
            </div>
          </div>
          <span className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {fits ? `+${surplusGb} GB` : `-${shortfallGb} GB`}
          </span>
        </div>

        <div className="storage-stage-grid">
          {/* LEFT WORKBENCH */}
          <div>
            <div className="meter-labels" style={{ marginBottom: '10px' }}>
              <h2 className="section-label" style={{ margin: 0 }}>Pick your console</h2>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  aria-pressed={includeDayOnePatch}
                  className={`filter-pill ${includeDayOnePatch ? 'active' : ''}`}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 700);
                    setIncludeDayOnePatch((v) => !v);
                  }}
                >
                  +{gamePack.dayOnePatchGb ?? 35} GB Day-1 Patch {includeDayOnePatch ? '(On)' : '(Off)'}
                </button>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    aria-label="Decrease target GB by 5"
                    onClick={() => {
                      playSwitchTick(soundEnabled, 600);
                      setCustomOffsetGb((v) => Math.max(-60, v - 5));
                    }}
                  >
                    -5 GB
                  </button>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    aria-label="Increase target GB by 5"
                    onClick={() => {
                      playSwitchTick(soundEnabled, 680);
                      setCustomOffsetGb((v) => Math.min(120, v + 5));
                    }}
                  >
                    +5 GB
                  </button>
                </div>
              </div>
            </div>

            <div className="console-grid" role="radiogroup" aria-label="Console Storage Tiers">
              {consoles.map((c) => {
                const isSelected = c.id === selectedConsole.id;
                const installGb = c.installGb ?? gamePack.installSizeGb;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`console-key ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectConsole(c)}
                  >
                    <span className="console-platform-tag">
                      {c.platform === 'xbox' ? 'XBOX SERIES' : 'PLAYSTATION 5'}
                    </span>
                    <span className="console-key-name">{c.shortName}</span>
                    <span className="console-key-meta">
                      {c.usableGb} GB net · {installGb} req
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SSD CAPACITY TELEMETRY BAR */}
            <div className="meter-box ssd-meter-card">
              <div className="meter-labels">
                <span>
                  Target Required:{' '}
                  <strong className="mono">{installTargetGb} GB</strong>
                  {customOffsetGb !== 0 && (
                    <span style={{ color: 'var(--ink-muted)', fontSize: '0.76rem', marginLeft: '6px' }}>
                      ({customOffsetGb > 0 ? `+${customOffsetGb}` : customOffsetGb} GB adj)
                    </span>
                  )}
                </span>
                <span
                  className="mono"
                  style={{ color: fits ? 'var(--teal-dark)' : 'var(--coral)', fontWeight: 700 }}
                >
                  {fits
                    ? `FITS (+${surplusGb} GB HEADROOM)`
                    : `SHORT BY ${shortfallGb} GB`}
                </span>
              </div>

              <div className="ssd-bar-wrap">
                <div className="ssd-bar-track" aria-label="SSD capacity breakdown">
                  <div
                    className="ssd-seg-free"
                    style={{ width: `${freePct}%` }}
                    title={`Already free: ${clampedFreeGb} GB`}
                  />
                  <div
                    className={`ssd-seg-freed ${fits ? '' : 'short'}`}
                    style={{ width: `${freedPct}%` }}
                    title={`Freed by queue: +${freedByUninstallGb} GB`}
                  />
                </div>
                <div
                  className="ssd-target-marker"
                  style={{ left: `${markerLeftPct}%` }}
                  title={`Target mark: ${installTargetGb} GB`}
                />
              </div>

              <div className="ssd-legend-row">
                <span>
                  <span className="ssd-dot" style={{ background: 'var(--ocean)' }} />
                  Existing Free: <strong className="mono">{clampedFreeGb} GB</strong>
                </span>
                <span>
                  <span
                    className="ssd-dot"
                    style={{ background: fits ? 'var(--teal)' : 'var(--coral)' }}
                  />
                  Uninstalls: <strong className="mono">+{freedByUninstallGb} GB</strong>
                </span>
                <span>
                  <span className="ssd-dot" style={{ background: 'var(--ink-primary)' }} />
                  Download ETA ({mbps} Mbps): <strong className="mono">{downloadTimeText}</strong>
                </span>
              </div>

              <div className="slider-pair-grid">
                <div>
                  <div className="meter-labels" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
                    <label htmlFor="free-gb-slider">Existing Free SSD Space</label>
                    <strong className="mono">{clampedFreeGb} / {usableGb} GB</strong>
                  </div>
                  <div className="stepper-input-row">
                    <button
                      type="button"
                      className="calc-stepper-btn"
                      aria-label="Decrease free SSD GB"
                      onClick={() => {
                        playSwitchTick(soundEnabled, 600);
                        setAlreadyFreeGb((v) => Math.max(0, v - 10));
                      }}
                    >
                      −
                    </button>
                    <input
                      id="free-gb-slider"
                      type="range"
                      min={0}
                      max={usableGb}
                      step={5}
                      value={clampedFreeGb}
                      style={{ '--pct': `${freeSliderPct}%` }}
                      onChange={(e) => setAlreadyFreeGb(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="calc-stepper-btn"
                      aria-label="Increase free SSD GB"
                      onClick={() => {
                        playSwitchTick(soundEnabled, 660);
                        setAlreadyFreeGb((v) => Math.min(usableGb, v + 10));
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <div className="meter-labels" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
                    <label htmlFor="mbps-slider">Real Internet Speed</label>
                    <strong className="mono">{mbps} Mbps</strong>
                  </div>
                  <div className="stepper-input-row">
                    <button
                      type="button"
                      className="calc-stepper-btn"
                      aria-label="Decrease Mbps speed"
                      onClick={() => {
                        playSwitchTick(soundEnabled, 600);
                        setMbps((v) => Math.max(15, v - 25));
                      }}
                    >
                      −
                    </button>
                    <input
                      id="mbps-slider"
                      type="range"
                      min={15}
                      max={1000}
                      step={5}
                      value={mbps}
                      style={{ '--pct': `${speedSliderPct}%` }}
                      onChange={(e) => setMbps(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="calc-stepper-btn"
                      aria-label="Increase Mbps speed"
                      onClick={() => {
                        playSwitchTick(soundEnabled, 660);
                        setMbps((v) => Math.min(1000, v + 25));
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* UNINSTALL QUEUE */}
            <div className="meter-labels" style={{ marginTop: '12px' }}>
              <h2 className="section-label" style={{ margin: 0 }}>Tap installed games to test clearing space</h2>
              {sacrificedIds.length > 0 && (
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() => {
                    playSwitchTick(soundEnabled, 620);
                    setSacrificedIds([]);
                  }}
                >
                  <Trash2 size={13} /> Clear Queue
                </button>
              )}
            </div>

            <div className="game-chip-grid">
              {(gamePack.commonInstalledGames || []).map((g) => {
                const sacrificed = sacrificedIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={sacrificed}
                    className={`game-kill-btn ${sacrificed ? 'sacrificed' : ''}`}
                    onClick={() => toggleSacrificeGame(g.id)}
                  >
                    <span className="game-kill-title">
                      {sacrificed ? '✓ ' : '+ '}
                      {g.title}
                    </span>
                    <span className="game-kill-gb">+{g.sizeGb} GB</span>
                  </button>
                );
              })}
            </div>

            {!fits && (
              <div className="hardware-slim-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
                  <AlertTriangle size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                    Short by <strong>{shortfallGb} GB</strong>. Standard USB HDDs cannot boot current-gen builds — expand with{' '}
                    <strong>{selectedConsole.upgradeLabel}</strong>.{' '}
                    <span style={{ color: 'var(--ink-muted)' }}>(As an Amazon Associate I earn from qualifying purchases.)</span>
                  </span>
                </div>
                <a
                  href={/^https:\/\//i.test(String(upgradeUrl || '')) ? upgradeUrl : 'https://www.amazon.com/'}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="secondary-key-btn"
                >
                  <span>Shop Compatible SSD</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>

          {/* RIGHT SPEC CARD PREVIEW & PNG EXPORT */}
          <div className="live-receipt-stage">
            <div className="thermal-paper-wrap">
              <div className="thermal-paper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                  <div className="receipt-title">UNPAUSE · STORAGE FIT RECEIPT</div>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: fits ? 'var(--teal-dark)' : 'var(--coral)',
                    }}
                  >
                    {fits ? 'FITS' : 'SHORT'}
                  </span>
                </div>
                <div className="receipt-sub">
                  {selectedConsole.name} ({usableGb} GB usable)
                </div>

                <hr className="receipt-dash" />

                <div className="receipt-row">
                  <span>Target Install ({selectedConsole.platform === 'xbox' ? 'Xbox' : 'PS5'})</span>
                  <span>{installTargetGb} GB</span>
                </div>
                <div className="receipt-row">
                  <span>Existing Free NVMe</span>
                  <span>{clampedFreeGb} GB</span>
                </div>

                {sacrificedGames.length > 0 && (
                  <>
                    <hr className="receipt-dash" />
                    <div className="receipt-row muted">
                      <span>QUEUED UNINSTALLS ({sacrificedGames.length})</span>
                      <span>CLEARED</span>
                    </div>
                    {sacrificedGames.map((g) => (
                      <div key={g.id} className="receipt-row receipt-row-kill">
                        <span>− {g.title}</span>
                        <span>+{g.sizeGb} GB</span>
                      </div>
                    ))}
                  </>
                )}

                <hr className="receipt-dash" />

                <div className="receipt-row" style={{ fontWeight: 700 }}>
                  <span>Total Free Space</span>
                  <span>{totalClearedGb} / {usableGb} GB</span>
                </div>
                <div className="receipt-row">
                  <span>ETA @ {mbps} Mbps</span>
                  <span>{downloadTimeText}</span>
                </div>
                <div className="receipt-row">
                  <span>New Zealand Rollout</span>
                  <span>{selectedConsole.nzStatusShort}</span>
                </div>

                <div
                  className="receipt-stamp"
                  style={{
                    color: fits ? 'var(--teal-dark)' : 'var(--coral)',
                    borderColor: fits ? 'var(--teal-border)' : 'var(--coral-border)',
                    background: fits ? 'var(--teal-soft)' : 'var(--coral-soft)',
                  }}
                >
                  {fits
                    ? `READY FOR PRELOAD · +${surplusGb} GB BUFFER`
                    : `SHORT ${shortfallGb} GB · CLEAR MORE GAMES`}
                </div>

                <div className="receipt-diagnosis">{diagnosisLine}</div>
                <div className="receipt-domain">NOV 19 GLOBAL · NOV 18 (11:00 UTC NZ) · PLAYUNPAUSE.COM</div>
              </div>
            </div>

            <div className="stage-action-row stage-action-row-3">
              <button
                type="button"
                className="stage-dark-btn"
                onClick={handleCopyDiscord}
              >
                {actionToast.includes('Discord') ? <Check size={15} /> : <Copy size={15} />}
                <span>Copy Discord</span>
              </button>
              <button
                type="button"
                className="stage-dark-btn"
                data-share-url={sharePath}
                onClick={async () => {
                  playSwitchTick(soundEnabled, 820);
                  const ok = await copyTextReliably(shareFullUrl);
                  if (ok) {
                    setShareFallbackUrl('');
                    flashToast('Shareable link copied to clipboard.');
                  } else {
                    setShareFallbackUrl(shareFullUrl);
                    flashToast('Clipboard blocked — copy the link below.');
                  }
                }}
              >
                {actionToast.includes('Shareable') ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
                <span>
                  {actionToast.includes('Shareable')
                    ? 'Copied Link'
                    : shareFallbackUrl
                      ? 'Copy Below'
                      : 'Share Link'}
                </span>
              </button>
              <button
                type="button"
                className="primary-coral-btn"
                onClick={handleSaveCard}
                disabled={isExporting}
              >
                <Share2 size={15} aria-hidden="true" />
                <span>{isExporting ? 'Rendering…' : 'Save Spec PNG'}</span>
              </button>
            </div>

            {shareFallbackUrl && (
              <div className="share-fallback-box">
                <label className="share-fallback-label" htmlFor="storage-share-fallback-input">
                  Clipboard access blocked — copy your preset URL:
                </label>
                <input
                  id="storage-share-fallback-input"
                  type="text"
                  readOnly
                  className="deck-input mono"
                  value={shareFallbackUrl}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}

            {onOpenProModal && (
              <div className="sync-quiet-note">
                <span>Save &amp; sync your storage list between phone and PC</span>
                <button
                  type="button"
                  className="sync-quiet-btn"
                  onClick={onOpenProModal}
                >
                  Phone ↔ PC Sync
                </button>
              </div>
            )}

            <div role="status" aria-live="polite">
              {actionToast && (
                <div className="inline-status-note ok mono" style={{ textAlign: 'center' }}>
                  {actionToast}
                </div>
              )}
            </div>

            <div className="nz-compact-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: 700, fontSize: '0.84rem' }}>
                <HardDrive size={14} color={selectedConsole.nzTrickWorks ? 'var(--teal-dark)' : 'var(--coral)'} />
                <span>
                  {selectedConsole.platform === 'xbox'
                    ? 'Xbox New Zealand Location Rule'
                    : 'PlayStation 5 Region-Lock Reality'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.48, color: 'var(--ink-secondary)' }}>
                {selectedConsole.nzDetail}
              </p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                <Download size={12} />
                <span>Includes 10% protocol overhead factor on {mbps} Mbps downloads.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

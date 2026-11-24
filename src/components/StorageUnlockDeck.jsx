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
  Bookmark,
} from 'lucide-react';
import {
  computeStorageDiagnosis,
  renderStorageReceiptCanvas,
  copyCanvasToClipboard,
  shareOrDownloadCanvas,
} from '../utils/canvasCards.js';
import { playSwitchTick, triggerHaptic } from '../utils/soundHaptics.js';
import { copyTextReliably } from '../utils/clipboard.js';
import { MAX_FREE_PROFILES, MAX_SYNC_PROFILES } from '../utils/syncState.js';
import { AnimatedValue, SpotlightPanel } from '../utils/motionPrimitives.jsx';
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
  isPro = false,
  storageProfiles = [],
  onSaveStorageProfile,
  onDeleteStorageProfile,
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
  const [profileNotice, setProfileNotice] = useState('');
  const [profileLimitAlert, setProfileLimitAlert] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (isPro || storageProfiles.length < MAX_FREE_PROFILES) {
      setProfileLimitAlert(false);
    }
  }, [isPro, storageProfiles.length]);

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
  const patchGb = includeDayOnePatch
    ? (selectedConsole?.patchGb ??
        (selectedConsole?.platform === 'ps5'
          ? (gamePack.dayOnePatchPs5Gb ?? 0.6)
          : (gamePack.dayOnePatchXboxGb ?? 1.6)))
    : 0;
  const roundGb = (val) => Math.round(val * 10) / 10;
  const installTargetGb = roundGb(Math.max(100, Math.min(600, baseInstallGb + patchGb + customOffsetGb)));
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
  const shortfallGb = roundGb(Math.max(0, installTargetGb - totalClearedGb));
  const surplusGb = roundGb(Math.max(0, totalClearedGb - installTargetGb));
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

  const defaultUpgradeFallback =
    selectedConsole?.platform === 'xbox'
      ? 'https://www.amazon.com/dp/B0C44XVWCH?tag=playunpause-20'
      : 'https://www.amazon.com/dp/B0C47ZX1WB?tag=playunpause-20';
  const rawUpgradeUrl = runtimeConfig?.affiliates?.[selectedConsole?.upgradeKind] || '';
  const upgradeUrl = /^https:\/\//i.test(String(rawUpgradeUrl))
    ? rawUpgradeUrl
    : defaultUpgradeFallback;

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
      `unpause-launch-${selectedConsole.id}.png`,
      'GTA VI Launch Spec Card'
    );
    setIsExporting(false);
    flashToast(res.method === 'shared' ? 'Spec card shared.' : 'Launch Spec PNG saved.');
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

  const handleSaveProfile = () => {
    if (!onSaveStorageProfile) return;
    if (storageProfiles.length >= MAX_SYNC_PROFILES) {
      playSwitchTick(soundEnabled, 640);
      setProfileLimitAlert(false);
      setProfileNotice(`Reached ${MAX_SYNC_PROFILES} saved console setups — remove an older setup first.`);
      return;
    }
    playSwitchTick(soundEnabled, 820);
    triggerHaptic(10);
    const statusSummary = fits ? `+${surplusGb} GB Ready` : `-${shortfallGb} GB Short`;
    onSaveStorageProfile({
      id: `sp-${Date.now().toString(36)}`,
      label: `${selectedConsole.shortName} · ${statusSummary}`,
      consoleId: selectedConsoleId,
      freeGb: clampedFreeGb,
      includePatch: includeDayOnePatch,
      mbps,
      customOffsetGb,
      sacrificedIds,
    });
    setProfileLimitAlert(false);
    setProfileNotice('Console setup saved.');
    flashToast('Console setup saved.');
  };

  const handleLoadProfile = (prof) => {
    if (!prof) return;
    playSwitchTick(soundEnabled, 720);
    triggerHaptic(8);
    if (prof.consoleId) setSelectedConsoleId(prof.consoleId);
    if (typeof prof.freeGb === 'number') setAlreadyFreeGb(prof.freeGb);
    setIncludeDayOnePatch(Boolean(prof.includePatch));
    if (typeof prof.mbps === 'number') setMbps(prof.mbps);
    setCustomOffsetGb(typeof prof.customOffsetGb === 'number' ? prof.customOffsetGb : 0);
    setSacrificedIds(Array.isArray(prof.sacrificedIds) ? prof.sacrificedIds : []);
    setShareFallbackUrl('');
    setProfileLimitAlert(false);
    setProfileNotice(`Loaded ${prof.label}.`);
    flashToast(`Loaded ${prof.label}.`);
  };

  return (
    <section className="deck-panel" aria-label="Console SSD & Patch 01.002.002 Calculator">
      {isEmbed && (
        <div className="studio-hero-band">
          <div>
            <div className="panel-eyebrow">
              <HardDrive size={13} aria-hidden="true" />
              <span>CONSOLES &amp; PATCH 01.002.002 · FREE STORAGE FIT PLANNER</span>
            </div>
            <h1 className="panel-title">GTA VI Storage &amp; Launch Fit Planner</h1>
            <p className="panel-subtitle">
              Check PS5 &amp; Xbox SSD headroom with Patch 01.002.002 (+0.6 GB PS5 / +1.6 GB Xbox 1.0.2.2) and download ETA.
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
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: fits ? 'var(--teal-dark)' : 'var(--coral)' }}>
              {fits ? `FITS ON ${selectedConsole.shortName.toUpperCase()}` : `SHORT BY ${shortfallGb} GB`}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
              {totalClearedGb} GB free vs {installTargetGb} GB req · ETA {downloadTimeText}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', flex: '1 1 200px', minWidth: 0, maxWidth: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', maxWidth: '100%' }}>
              {!fits && (
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="amazon-plain-link"
                  style={{ fontSize: '0.75rem' }}
                >
                  <span>{selectedConsole.platform === 'xbox' ? 'Check Xbox Card on Amazon' : 'Check PS5 M.2 NVMe on Amazon'}</span>
                  <ExternalLink size={11} aria-hidden="true" />
                </a>
              )}
              <span className="mono" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-primary)', whiteSpace: 'nowrap' }}>
                {fits ? `+${surplusGb} GB` : `-${shortfallGb} GB`}
              </span>
            </div>
            {!fits && (
              <small style={{ fontSize: '0.67rem', color: 'var(--ink-muted)', lineHeight: 1.35, maxWidth: '100%', overflowWrap: 'anywhere' }}>
                (As an Amazon Associate I earn from qualifying purchases.)
              </small>
            )}
          </div>
        </div>

        <div className="storage-stage-grid">
          {/* LEFT WORKBENCH */}
          <div>
            <div className="meter-labels" style={{ marginBottom: '10px', paddingTop: '2px' }}>
              <h2 className="section-label" style={{ margin: 0, lineHeight: 1.35 }}>Pick your console</h2>
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
                  +0.6 GB PS5 / +1.6 GB Xbox (Patch 01.002.002) {includeDayOnePatch ? '(On)' : '(Off)'}
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
            <SpotlightPanel className="meter-box ssd-meter-card">
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
                  {fits ? `FITS (+${surplusGb} GB HEADROOM)` : `SHORT BY ${shortfallGb} GB`}
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
            </SpotlightPanel>

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
                  href={upgradeUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="amazon-plain-link"
                >
                  <span>
                    {selectedConsole.platform === 'xbox'
                      ? 'Check Xbox Card on Amazon'
                      : 'Check PS5 M.2 NVMe on Amazon'}
                  </span>
                  <ExternalLink size={13} aria-hidden="true" />
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
                    ? `READY TO PLAY · +${surplusGb} GB BUFFER`
                    : `SHORT ${shortfallGb} GB · CLEAR MORE GAMES`}
                </div>

                <div className="receipt-diagnosis">{diagnosisLine}</div>
                <div className="receipt-domain">OUT NOW · PATCH 01.002.002 / 1.0.2.2 · PLAYUNPAUSE.COM</div>
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

            {!isEmbed && onSaveStorageProfile && (
              <div className="saved-preset-card">
                <div className="saved-preset-head">
                  <div className="saved-preset-title">
                    <Bookmark size={14} color="var(--ocean)" aria-hidden="true" />
                    <span>
                      Saved Console Setups ({storageProfiles.length} / {MAX_SYNC_PROFILES} Free)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={handleSaveProfile}
                  >
                    <Bookmark size={13} aria-hidden="true" />
                    <span>Save Setup</span>
                  </button>
                </div>

                <div role="status" aria-live="polite">
                  {profileNotice && (
                    <div className="inline-status-note ok mono" style={{ marginBottom: '8px' }}>
                      {profileNotice}
                    </div>
                  )}
                </div>

                {storageProfiles.length === 0 ? (
                  <p className="saved-preset-empty">
                    Save PS5 or Xbox storage setups to switch consoles fast or sync between phone &amp; PC.
                  </p>
                ) : (
                  <div className="saved-preset-list">
                    {storageProfiles.map((prof) => {
                      const uninstallCount = Array.isArray(prof.sacrificedIds)
                        ? prof.sacrificedIds.length
                        : 0;
                      const detailText = `${prof.freeGb} GB free · ${prof.mbps} Mbps${uninstallCount ? ` · -${uninstallCount} queued` : ''}`;
                      return (
                        <div key={prof.id} className="saved-preset-row">
                          <button
                            type="button"
                            className="saved-preset-load-btn"
                            onClick={() => handleLoadProfile(prof)}
                          >
                            <span className="saved-preset-label">{prof.label}</span>
                            <span className="saved-preset-meta mono">{detailText}</span>
                          </button>
                          {onDeleteStorageProfile && (
                            <button
                              type="button"
                              className="subtle-pill-btn"
                              aria-label={`Remove saved setup ${prof.label}`}
                              onClick={() => {
                                playSwitchTick(soundEnabled, 580);
                                onDeleteStorageProfile(prof.id);
                              }}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {onOpenProModal && (
              <div className="sync-quiet-note">
                <span>
                  {isPro
                    ? 'Synced to Cloud · Console setups follow your UP- code'
                    : 'Switch between couch phone & desktop? Sync setups via QR'}
                </span>
                <button
                  type="button"
                  className="sync-quiet-btn"
                  onClick={onOpenProModal}
                >
                  {isPro ? 'Manage Sync' : 'Phone ↔ PC Sync'}
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
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={12} />
                  <span>Includes 10% protocol overhead factor on {mbps} Mbps downloads.</span>
                </span>
                {selectedConsole.platform === 'ps5' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                    <a
                      href={
                        /^https:\/\//i.test(String(runtimeConfig?.affiliates?.topupsUrl || ''))
                          ? runtimeConfig.affiliates.topupsUrl
                          : 'https://www.amazon.com/dp/B00SW85KD4?tag=playunpause-20'
                      }
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="amazon-plain-link"
                      style={{ fontSize: '0.76rem' }}
                    >
                      <span>Check PSN Gift Cards on Amazon</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                    <small style={{ fontSize: '0.67rem', color: 'var(--ink-muted)' }}>
                      (As an Amazon Associate I earn from qualifying purchases.)
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

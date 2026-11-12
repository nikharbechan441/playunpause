import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  HardDrive,
  Share2,
  Copy,
  Globe,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { playSwitchTick, playUnlockChime } from '../utils/soundHaptics.js';
import {
  renderStorageReceiptCanvas,
  copyCanvasToClipboard,
  shareOrDownloadCanvas,
  computeStorageDiagnosis,
} from '../utils/canvasCards.js';

const STORAGE_PREFS_KEY = 'unpause_storage_prefs_v2';

function loadStoragePrefs(consoles) {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlConsole = params.get('console');
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}') || {};
    const validIds = new Set(consoles.map((c) => c.id));
    const consoleId =
      (urlConsole && validIds.has(urlConsole) && urlConsole) ||
      (saved.selectedConsoleId && validIds.has(saved.selectedConsoleId) && saved.selectedConsoleId) ||
      'ps5-base';

    return {
      selectedConsoleId: consoleId,
      alreadyFreeGb: Number.isFinite(Number(saved.alreadyFreeGb)) ? Number(saved.alreadyFreeGb) : 72,
      sacrificedIds: Array.isArray(saved.sacrificedIds) ? saved.sacrificedIds : ['cod-hq'],
      mbps: Number.isFinite(Number(saved.mbps)) ? Math.min(1000, Math.max(15, Number(saved.mbps))) : 150,
    };
  } catch {
    return {
      selectedConsoleId: 'ps5-base',
      alreadyFreeGb: 72,
      sacrificedIds: ['cod-hq'],
      mbps: 150,
    };
  }
}

export function formatDurationMinutes(totalMinutes) {
  const roundedMins = Math.max(1, Math.round(Number(totalMinutes) || 1));
  if (roundedMins < 60) return `${roundedMins}m`;
  const hrs = Math.floor(roundedMins / 60);
  const mins = roundedMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function formatCountdownMs(diffMs) {
  if (diffMs <= 0) return 'LIVE IN NZ';
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${days}d ${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export default function StorageUnlockDeck({ gamePack, runtimeConfig, soundEnabled }) {
  const initialPrefs = useMemo(() => loadStoragePrefs(gamePack.consoles), [gamePack.consoles]);
  const [selectedConsoleId, setSelectedConsoleId] = useState(initialPrefs.selectedConsoleId);
  const [alreadyFreeGb, setAlreadyFreeGb] = useState(initialPrefs.alreadyFreeGb);
  const [sacrificedIds, setSacrificedIds] = useState(initialPrefs.sacrificedIds);
  const [mbps, setMbps] = useState(initialPrefs.mbps);
  const [copyFeedback, setCopyFeedback] = useState('');
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_PREFS_KEY,
        JSON.stringify({ selectedConsoleId, alreadyFreeGb, sacrificedIds, mbps })
      );
    } catch {
      // Ignore storage quota issues
    }
  }, [selectedConsoleId, alreadyFreeGb, sacrificedIds, mbps]);

  const selectedConsole = useMemo(
    () => gamePack.consoles.find((c) => c.id === selectedConsoleId) || gamePack.consoles[0],
    [gamePack, selectedConsoleId]
  );

  const deletedGames = useMemo(
    () => gamePack.commonInstalledGames.filter((g) => sacrificedIds.includes(g.id)),
    [gamePack, sacrificedIds]
  );

  const freedGb = useMemo(
    () => deletedGames.reduce((acc, g) => acc + g.sizeGb, 0),
    [deletedGames]
  );

  const usableGb = selectedConsole.usableGb;
  const clampedAlreadyFree = Math.min(usableGb, Math.max(0, alreadyFreeGb));
  const effectiveFreedGb = Math.min(usableGb - clampedAlreadyFree, freedGb);
  const totalClearedGb = Math.min(usableGb, clampedAlreadyFree + freedGb);
  const remainingUsedGb = Math.max(0, usableGb - totalClearedGb);

  const installGb = gamePack.installSizeGb;
  const fitsDrive = totalClearedGb >= installGb;
  const deficitGb = Math.max(0, installGb - totalClearedGb);

  const freeSegPct = (clampedAlreadyFree / usableGb) * 100;
  const freedSegPct = (effectiveFreedGb / usableGb) * 100;
  const usedSegPct = Math.max(0, 100 - freeSegPct - freedSegPct);
  const targetMarkerPct = Math.min(99, (installGb / usableGb) * 100);

  const downloadMinutes = (installGb * 8192) / Math.max(5, mbps) / 60;
  const downloadTimeText = formatDurationMinutes(downloadMinutes);
  const diagnosisText = useMemo(
    () => computeStorageDiagnosis(selectedConsole.id, deletedGames, fitsDrive),
    [selectedConsole.id, deletedGames, fitsDrive]
  );

  const handleSelectConsole = (c) => {
    playSwitchTick(soundEnabled, 740);
    setSelectedConsoleId(c.id);
    if (c.id === 'ps5-pro') {
      setAlreadyFreeGb(420);
      setSacrificedIds([]);
    } else if (c.id === 'xss-512') {
      setAlreadyFreeGb(68);
      setSacrificedIds(['cod-hq']);
    } else {
      setAlreadyFreeGb(72);
      if (sacrificedIds.length === 0) setSacrificedIds(['cod-hq']);
    }
  };

  const toggleGameSacrifice = (gameId) => {
    playSwitchTick(soundEnabled, 620);
    setSacrificedIds((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  const buildCanvas = async () => {
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch {
      // Safe fallback
    }
    return renderStorageReceiptCanvas({
      consoleName: selectedConsole.shortName,
      consoleId: selectedConsole.id,
      usableGb: selectedConsole.usableGb,
      installSizeGb: installGb,
      deletedGames,
      alreadyFreeGb: clampedAlreadyFree,
      mbps,
      downloadTimeText,
      nzStatusLabel: selectedConsole.nzStatusShort,
    });
  };

  const flashCopyLabel = (txt) => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopyFeedback(txt);
    copyTimerRef.current = setTimeout(() => setCopyFeedback(''), 2400);
  };

  const handleCopyReceiptImage = async () => {
    playUnlockChime(soundEnabled);
    const canvas = await buildCanvas();
    const ok = await copyCanvasToClipboard(canvas);
    if (ok) {
      flashCopyLabel('Copied! Paste in Discord');
    } else {
      await shareOrDownloadCanvas(
        canvas,
        `unpause-212gb-receipt-${selectedConsole.id}.png`,
        `${selectedConsole.shortName} 212GB Drive Funeral Receipt`
      );
      flashCopyLabel('Saved receipt PNG');
    }
  };

  const handleShareOrSaveReceipt = async () => {
    playUnlockChime(soundEnabled);
    const canvas = await buildCanvas();
    await shareOrDownloadCanvas(
      canvas,
      `unpause-212gb-receipt-${selectedConsole.id}.png`,
      `${selectedConsole.shortName} 212GB Drive Funeral Receipt`
    );
  };

  const upgradeHref =
    runtimeConfig?.affiliates?.[selectedConsole.upgradeKind] ||
    'https://www.amazon.com/s?k=PS5+2TB+Heatsink+NVMe+SSD';

  const visibleReceiptGames = deletedGames.slice(0, 4);
  const overflowGames = deletedGames.slice(4);
  const overflowGb = overflowGames.reduce((s, g) => s + g.sizeGb, 0);

  return (
    <section className="deck-panel">
      <div className="coastal-hero-band" data-tone="ocean">
        <div>
          <h1 className="panel-title">Will {installGb} GB fit on your console?</h1>
          <p className="panel-subtitle">
            Pick your console and tap installed games to clear room. Your receipt updates live on the right.
          </p>
        </div>
        <div className="hud-readout" aria-live="polite">
          <HardDrive size={17} color={fitsDrive ? 'var(--teal)' : 'var(--coral)'} />
          <span>
            {totalClearedGb} / {installGb} GB {fitsDrive ? 'Ready' : 'Short'}
          </span>
        </div>
      </div>

      <div className="deck-body-pad">
        <div className="storage-stage-grid">
          {/* LEFT COLUMN: Hardware Selector + Segmented SSD Gauge + Game Switches */}
          <div>
            <div className="console-grid" role="radiogroup" aria-label="Select your console">
              {gamePack.consoles.map((c) => {
                const pctOfDrive = Math.round((installGb / c.usableGb) * 100);
                const isSelected = c.id === selectedConsole.id;
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
                      {c.platform === 'ps5' ? 'PlayStation' : 'Xbox'}
                    </span>
                    <span className="console-key-name">{c.shortName}</span>
                    <span className="console-key-meta">
                      {c.usableGb} GB ({pctOfDrive}%)
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="meter-box">
              <div className="meter-labels">
                <span>
                  {fitsDrive ? (
                    <span style={{ color: 'var(--teal-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={17} /> Ready with +{totalClearedGb - installGb} GB to spare
                    </span>
                  ) : (
                    <span style={{ color: 'var(--coral)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={17} /> Clear {deficitGb} GB more (or expand storage)
                    </span>
                  )}
                </span>
                <span style={{ color: 'var(--ink-secondary)', fontSize: '0.84rem' }}>
                  Preload time at {mbps} Mbps:{' '}
                  <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                    {downloadTimeText}
                  </strong>
                </span>
              </div>

              <div className="ssd-bar-wrap">
                <div
                  className="ssd-bar-track"
                  role="progressbar"
                  aria-valuenow={totalClearedGb}
                  aria-valuemin={0}
                  aria-valuemax={usableGb}
                  aria-label="Console SSD storage allocation"
                >
                  <div
                    className="ssd-seg-free"
                    style={{ width: `${freeSegPct}%` }}
                    title={`Free now: ${clampedAlreadyFree} GB`}
                  />
                  <div
                    className={`ssd-seg-freed ${fitsDrive ? '' : 'short'}`}
                    style={{ width: `${freedSegPct}%` }}
                    title={`Cleared by uninstalling: +${effectiveFreedGb} GB`}
                  />
                  <div
                    className="ssd-seg-used"
                    style={{ width: `${usedSegPct}%` }}
                    title={`Other games kept: ${remainingUsedGb} GB`}
                  />
                </div>
                <div
                  className="ssd-target-marker"
                  style={{ left: `${targetMarkerPct}%` }}
                  title={`${installGb} GB preload line`}
                />
              </div>

              <div className="ssd-legend-row">
                <span>
                  <span className="ssd-dot" style={{ background: '#0077b6' }} />
                  Free now: {clampedAlreadyFree} GB
                </span>
                <span>
                  <span
                    className="ssd-dot"
                    style={{ background: fitsDrive ? '#00a896' : '#ff5964' }}
                  />
                  Cleared: +{freedGb} GB
                </span>
                <span>
                  <span className="ssd-dot" style={{ background: '#0b2545' }} />
                  Preload target: {installGb} GB of {usableGb} GB SSD
                </span>
              </div>

              <div className="slider-pair-grid">
                <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--ink-secondary)', fontWeight: 700 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>Free space right now</span>
                    <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                      {clampedAlreadyFree} GB
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.min(600, usableGb)}
                    step={5}
                    value={clampedAlreadyFree}
                    aria-label="Free console SSD space right now in gigabytes"
                    aria-valuetext={`${clampedAlreadyFree} GB`}
                    onChange={(e) => setAlreadyFreeGb(Number(e.target.value))}
                  />
                </label>

                <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--ink-secondary)', fontWeight: 700 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>Internet speed</span>
                    <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                      {mbps} Mbps
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={1000}
                    step={5}
                    value={mbps}
                    aria-label="Internet download speed in megabits per second"
                    aria-valuetext={`${mbps} Mbps`}
                    onChange={(e) => setMbps(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            {/* Game Sacrifice Grid */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--ink-primary)' }}>
                  Tap games or clip folders to clear ({deletedGames.length} selected, +{freedGb} GB):
                </span>
                {sacrificedIds.length > 0 && (
                  <button
                    type="button"
                    className="subtle-pill-btn"
                    onClick={() => {
                      playSwitchTick(soundEnabled, 520);
                      setSacrificedIds([]);
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="game-chip-grid">
                {gamePack.commonInstalledGames.map((g) => {
                  const killed = sacrificedIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={killed}
                      className={`game-kill-btn ${killed ? 'sacrificed' : ''}`}
                      onClick={() => toggleGameSacrifice(g.id)}
                    >
                      <span className="game-kill-title">
                        {killed ? `✕ ${g.title}` : g.title}
                      </span>
                      <span className="game-kill-gb">{killed ? `+${g.sizeGb} GB` : `${g.sizeGb} GB`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Storage Expansion Tip + Proximate FTC / Amazon Affiliate Disclosure */}
            <div className="hardware-slim-bar">
              <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                <strong style={{ color: 'var(--ink-primary)' }}>
                  {selectedConsole.platform === 'xbox'
                    ? 'USB drive heads-up: '
                    : 'Keep every game installed: '}
                </strong>
                <span style={{ color: 'var(--ink-secondary)' }}>
                  {selectedConsole.platform === 'xbox'
                    ? 'Standard USB 3.0 drives cannot launch Series X|S games. Use a licensed Storage Expansion Card.'
                    : 'A heatsink Gen4 M.2 NVMe SSD drops into the PS5 expansion bay in 3 minutes.'}
                </span>
                <div style={{ fontSize: '0.73rem', color: 'var(--ink-muted)', marginTop: 4 }}>
                  Affiliate link: As an Amazon Associate / retail partner, Unpause may earn a commission from qualifying purchases at no extra cost to you.
                </div>
              </div>
              <a
                href={upgradeHref}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="subtle-pill-btn"
              >
                <span>{selectedConsole.upgradeLabel} (Affiliate)</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN: SUNLIT COASTAL RECEIPT STAGE + NZ UNLOCK REALITY CHECK */}
          <aside className="live-receipt-stage" aria-label="Live Drive Funeral Receipt">
            <div className="thermal-paper-wrap">
              <div className="thermal-sawtooth-top" aria-hidden="true" />
              <div className="thermal-paper">
                <div className="receipt-title">DRIVE FUNERAL RECEIPT</div>
                <div className="receipt-sub">
                  {selectedConsole.shortName.toUpperCase()} ({usableGb} GB USABLE)
                </div>

                <hr className="receipt-dash" />

                <div className="receipt-row">
                  <span>PRELOAD REQUIRED</span>
                  <span className="receipt-row-kill">{installGb} GB</span>
                </div>

                <hr className="receipt-dash" />

                <div className="receipt-row muted" style={{ fontSize: '0.68rem' }}>
                  <span>CLEARED FROM SSD</span>
                  <span>FREED</span>
                </div>

                {deletedGames.length === 0 ? (
                  <div className="receipt-row">
                    <span>0 GAMES REMOVED (OPEN SSD)</span>
                    <span>0 GB</span>
                  </div>
                ) : (
                  <>
                    {visibleReceiptGames.map((g) => (
                      <div key={g.id} className="receipt-row">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ✕ {g.title.toUpperCase()}
                        </span>
                        <span className="receipt-row-kill">+{g.sizeGb} GB</span>
                      </div>
                    ))}
                    {overflowGames.length > 0 && (
                      <div className="receipt-row muted">
                        <span>+ {overflowGames.length} MORE REMOVED</span>
                        <span className="receipt-row-kill">+{overflowGb} GB</span>
                      </div>
                    )}
                  </>
                )}

                <div className="receipt-row muted">
                  <span>✕ WEEKEND PLANS (NOV 19-22)</span>
                  <span>100%</span>
                </div>

                <hr className="receipt-dash" />

                <div className="receipt-row" style={{ fontSize: '0.78rem' }}>
                  <span>TOTAL CLEARED</span>
                  <span>
                    {totalClearedGb} / {installGb} GB
                  </span>
                </div>
                <div className="receipt-row muted">
                  <span>DOWNLOAD ETA ({mbps} MBPS)</span>
                  <span>{downloadTimeText.toUpperCase()}</span>
                </div>
                <div className="receipt-row muted">
                  <span>NZ EARLY UNLOCK</span>
                  <span>{selectedConsole.nzStatusShort.toUpperCase()}</span>
                </div>

                <div className={`receipt-stamp ${fitsDrive ? '' : 'short'}`}>
                  {fitsDrive
                    ? `READY FOR LAUNCH (+${totalClearedGb - installGb} GB SPARE)`
                    : `SHORT BY ${deficitGb} GB`}
                </div>

                <div className="receipt-diagnosis">{diagnosisText}</div>
                <div className="receipt-barcode" aria-hidden="true" />
                <div className="receipt-domain">PLAYUNPAUSE.COM</div>
              </div>
              <div className="thermal-sawtooth-bottom" aria-hidden="true" />
            </div>

            <div className="stage-action-row">
              <button type="button" className="primary-coral-btn" onClick={handleCopyReceiptImage}>
                <Copy size={15} />
                <span>{copyFeedback || 'Copy for Discord'}</span>
              </button>
              <button type="button" className="secondary-key-btn" onClick={handleShareOrSaveReceipt}>
                <Share2 size={15} />
                <span>Save PNG</span>
              </button>
            </div>

            <div
              className="nz-compact-card"
              style={{
                borderColor: selectedConsole.nzTrickWorks ? 'var(--teal-border)' : 'var(--coral-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 800,
                  fontSize: '0.83rem',
                  color: selectedConsole.nzTrickWorks ? 'var(--teal-dark)' : 'var(--coral)',
                  marginBottom: 3,
                }}
              >
                <Globe size={15} />
                <span>
                  New Zealand trick ({selectedConsole.shortName}): {selectedConsole.nzStatusShort}
                </span>
              </div>
              <div style={{ color: 'var(--ink-secondary)', fontSize: '0.78rem', lineHeight: 1.45 }}>
                {selectedConsole.nzTrickWorks
                  ? 'Xbox rolling midnight unlocks follow system Location settings (New Zealand unlocks first on November 18 at 11:00 UTC).'
                  : 'Changing PS5 clock settings will not unlock early. PlayStation ties unlock time strictly to the store region your account was created in.'}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

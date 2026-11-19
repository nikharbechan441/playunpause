import React, { useEffect, useState } from 'react';
import {
  Monitor,
  Cpu,
  Check,
  Share2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import {
  GTA6_CONSOLE_30FPS_SPECS,
  GTA6_DAY1_SETTINGS_CHECKLIST,
} from '../../data/games/gta6LaunchTools.js';
import { gta6Pack } from '../../data/games/gta6Pack.js';
import {
  renderLaunchGraveyardCanvas,
  shareOrDownloadCanvas,
} from '../../utils/canvasCards.js';
import WakeLockToggle from './WakeLockToggle.jsx';
import { SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { playSwitchTick, triggerHaptic } from '../../utils/soundHaptics.js';

const SETTINGS_STORAGE_KEY = 'unpause_gta6_settings_v1';

function loadSettingsState() {
  if (typeof window === 'undefined') {
    return { checkedIds: ['set-ps5-fw'], consoleId: 'df-ps5-pro', sacrificedIds: ['cod-hq', 'media-gallery'] };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      checkedIds: Array.isArray(parsed.checkedIds) ? parsed.checkedIds.filter((x) => typeof x === 'string') : ['set-ps5-fw'],
      consoleId: typeof parsed.consoleId === 'string' ? parsed.consoleId : 'df-ps5-pro',
      sacrificedIds: Array.isArray(parsed.sacrificedIds)
        ? parsed.sacrificedIds.filter((x) => typeof x === 'string')
        : ['cod-hq', 'media-gallery'],
    };
  } catch {
    return { checkedIds: ['set-ps5-fw'], consoleId: 'df-ps5-pro', sacrificedIds: ['cod-hq', 'media-gallery'] };
  }
}

export default function Gta6SettingsTunerDeck({
  soundEnabled = true,
  runtimeConfig = null,
}) {
  const [state, setState] = useState(loadSettingsState);
  const [toast, setToast] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  const toggleSetting = (id) => {
    playSwitchTick(soundEnabled, 740);
    triggerHaptic(25);
    setState((prev) => ({
      ...prev,
      checkedIds: prev.checkedIds.includes(id)
        ? prev.checkedIds.filter((x) => x !== id)
        : [...prev.checkedIds, id],
    }));
  };

  const toggleSacrifice = (id) => {
    playSwitchTick(soundEnabled, 680);
    triggerHaptic(25);
    setState((prev) => ({
      ...prev,
      sacrificedIds: prev.sacrificedIds.includes(id)
        ? prev.sacrificedIds.filter((x) => x !== id)
        : [...prev.sacrificedIds, id].slice(0, 6),
    }));
  };

  const selectedSpec =
    GTA6_CONSOLE_30FPS_SPECS.find((s) => s.id === state.consoleId) || GTA6_CONSOLE_30FPS_SPECS[0];

  const handleExportCard = async () => {
    setIsExporting(true);
    playSwitchTick(soundEnabled, 880);
    triggerHaptic(25);

    const sacrificedNames = (gta6Pack.commonInstalledGames || [])
      .filter((g) => state.sacrificedIds.includes(g.id))
      .map((g) => `${g.title} (-${g.sizeGb} GB)`);
    const checkedTitles = GTA6_DAY1_SETTINGS_CHECKLIST.filter((c) => state.checkedIds.includes(c.id))
      .map((c) => c.title);

    const canvas = renderLaunchGraveyardCanvas({
      consoleTitle: selectedSpec.console,
      fpsNote: `${selectedSpec.resolution} · ${selectedSpec.framePacing}`,
      sacrificedGames: sacrificedNames,
      checkedSettings: checkedTitles,
    });

    if (!canvas) {
      setIsExporting(false);
      setToast('Canvas export unavailable in this browser.');
      return;
    }

    const res = await shareOrDownloadCanvas(
      canvas,
      `unpause-gta6-launch-card.png`,
      'GTA VI Console Graveyard & Launch Card'
    );
    setIsExporting(false);
    setToast(res.method === 'shared' ? 'Launch Card shared cleanly.' : 'Console Graveyard PNG downloaded.');
  };

  const rawPs5Url = runtimeConfig?.affiliates?.ps5SsdUrl || '';
  const ps5Href = /^https:\/\//i.test(rawPs5Url)
    ? rawPs5Url
    : 'https://www.amazon.com/dp/B0C47ZX1WB?tag=playunpause-20';
  const rawXboxUrl = runtimeConfig?.affiliates?.xboxCardUrl || '';
  const xboxHref = /^https:\/\//i.test(rawXboxUrl)
    ? rawXboxUrl
    : 'https://www.amazon.com/dp/B0C44XVWCH?tag=playunpause-20';

  return (
    <section className="deck-panel" aria-label="GTA VI 30fps Console Tuner & Launch Card Exporter">
      <div className="deck-body-pad">
        {/* Mandatory PS5 Firmware Check Alert */}
        <div className="cheat-warning-banner fw-alert" role="alert">
          <AlertTriangle size={18} color="#F59E0B" aria-hidden="true" />
          <div>
            <strong>MANDATORY PS5 FIRMWARE CHECK: 26.07-14.23.00 + PATCH 1.002.001</strong>
            <p>
              Verify PlayStation 5 System Software matches <strong>26.07-14.23.00</strong> before starting Campaign (prevents Day-1 cutscene hitching). Patch 1.002.001 adds +0.6 GB (PS5) / +1.6 GB (Xbox).
            </p>
          </div>
        </div>

        {/* Digital Foundry 4-Console 30fps Comparison Grid */}
        <div className="cheat-controls-row">
          <div className="section-label">
            <Monitor size={13} aria-hidden="true" />
            <span>DIGITAL FOUNDRY 4-CONSOLE 30FPS LAUNCH SPEC COMPARISON (TAP TO SELECT FOR PNG)</span>
          </div>
          <WakeLockToggle soundEnabled={soundEnabled} />
        </div>

        <div className="tuner-console-grid" role="radiogroup" aria-label="Select console for launch card">
          {GTA6_CONSOLE_30FPS_SPECS.map((spec) => {
            const active = spec.id === selectedSpec.id;
            return (
              <button
                key={spec.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`tuner-spec-card tactile-press ${active ? 'selected' : ''}`}
                onClick={() => {
                  playSwitchTick(soundEnabled, 720);
                  triggerHaptic(25);
                  setState((prev) => ({ ...prev, consoleId: spec.id }));
                }}
              >
                <div className="tuner-spec-top">
                  <strong>{spec.console}</strong>
                  <span className="mono tuner-res-pill">{spec.resolution}</span>
                </div>
                <div className="tuner-spec-line">{spec.rtFeature}</div>
                <div className="mono tuner-fps-line">{spec.framePacing}</div>
                <p className="tuner-note">{spec.note}</p>
              </button>
            );
          })}
        </div>

        {/* Day-1 Settings Checklist */}
        <div className="section-label" style={{ marginTop: '18px' }}>
          <Cpu size={13} aria-hidden="true" />
          <span>DAY-1 SETTINGS CHECKLIST ({state.checkedIds.length} / {GTA6_DAY1_SETTINGS_CHECKLIST.length} TUNED)</span>
        </div>

        <div className="settings-checklist-grid">
          {GTA6_DAY1_SETTINGS_CHECKLIST.map((item) => {
            const checked = state.checkedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={checked}
                className={`setting-check-row tactile-press ${checked ? 'checked' : ''}`}
                onClick={() => toggleSetting(item.id)}
              >
                <span className={`setting-box ${checked ? 'done' : ''}`} aria-hidden="true">
                  {checked ? <Check size={14} /> : null}
                </span>
                <div className="setting-copy">
                  <div className="setting-title-row">
                    <strong>{item.title}</strong>
                    <span className="mono setting-tag">{item.tag}</span>
                  </div>
                  <p>{item.detail}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Console Graveyard & Shareable PNG Generator */}
        <SpotlightPanel className="graveyard-export-panel">
          <div className="dpad-stage-head">
            <div>
              <span className="section-label">EXPORT CONSOLE GRAVEYARD / LAUNCH CARD (PNG)</span>
              <p className="cheat-meta-sub">
                Pick uninstalled games to stamp onto a shareable PNG card watermarked <code>playunpause.com</code>.
              </p>
            </div>
            <button
              type="button"
              className="primary-coral-btn tactile-press"
              onClick={handleExportCard}
              disabled={isExporting}
            >
              <Share2 size={14} aria-hidden="true" />
              <span>{isExporting ? 'Rendering PNG…' : 'Export Console Graveyard / Launch Card (PNG)'}</span>
            </button>
          </div>

          <div className="game-chip-grid" style={{ marginTop: '10px' }}>
            {(gta6Pack.commonInstalledGames || []).slice(0, 8).map((g) => {
              const sacrificed = state.sacrificedIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={sacrificed}
                  className={`game-kill-btn tactile-press ${sacrificed ? 'sacrificed' : ''}`}
                  onClick={() => toggleSacrifice(g.id)}
                >
                  <span className="game-kill-title">
                    {sacrificed ? '✕ ' : '+ '}
                    {g.title}
                  </span>
                  <span className="game-kill-gb">-{g.sizeGb} GB</span>
                </button>
              );
            })}
          </div>

          <div role="status" aria-live="polite">
            {toast && <div className="inline-status-note ok mono" style={{ marginTop: '10px' }}>{toast}</div>}
          </div>
        </SpotlightPanel>

        {/* Direct PS5 & Xbox Amazon /dp/ Hardware CTAs */}
        <div className="hardware-slim-bar" style={{ marginTop: '16px' }}>
          <div style={{ flex: '1 1 260px' }}>
            <strong style={{ fontSize: '0.84rem' }}>Verified Storage Expansion Hardware</strong>
            <div style={{ fontSize: '0.77rem', color: 'var(--ink-secondary)', marginTop: '3px' }}>
              WD_BLACK SN850P Heatsink (PS5) · WD_BLACK C50 Expansion Card (Xbox Series X|S).{' '}
              <span style={{ color: 'var(--ink-muted)' }}>(As an Amazon Associate I earn from qualifying purchases.)</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <a
              href={ps5Href}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="amazon-plain-link"
            >
              <span>Check PS5 WD_BLACK SN850P on Amazon</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
            <a
              href={xboxHref}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="amazon-plain-link"
            >
              <span>Check Xbox WD_BLACK C50 on Amazon</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

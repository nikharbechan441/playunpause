import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  ArrowRight,
  HardDriveDownload,
} from 'lucide-react';
import { GTA6_LAUNCH_FIXES } from '../../data/games/gta6LaunchTools.js';
import { SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { playSwitchTick, triggerHaptic } from '../../utils/soundHaptics.js';

export default function Gta6FixesDeck({
  soundEnabled = true,
  initialPreset = null,
  presetKey = '',
  onSelectTab = null,
}) {
  const [selectedId, setSelectedId] = useState(() => {
    const pre = initialPreset?.symptomId;
    return GTA6_LAUNCH_FIXES.some((s) => s.id === pre) ? pre : GTA6_LAUNCH_FIXES[0].id;
  });

  useEffect(() => {
    const pre = initialPreset?.symptomId;
    if (pre && GTA6_LAUNCH_FIXES.some((s) => s.id === pre)) {
      setSelectedId(pre);
    }
  }, [presetKey, initialPreset?.symptomId]);

  const activeFix =
    GTA6_LAUNCH_FIXES.find((item) => item.id === selectedId) || GTA6_LAUNCH_FIXES[0];

  return (
    <section className="deck-panel" aria-label="GTA VI Launch-Day Crash, PSN and Offline Play Triage">
      <div className="deck-body-pad">
        <div className="section-label">
          <Wrench size={14} aria-hidden="true" />
          <span>SELECT YOUR LAUNCH-DAY SYMPTOM (ZERO LOGIN · INSTANT TRIAGE)</span>
        </div>

        <div
          className="tuner-console-grid"
          role="radiogroup"
          aria-label="GTA VI launch issue symptoms"
          style={{ marginTop: '10px', marginBottom: '16px' }}
        >
          {GTA6_LAUNCH_FIXES.map((symptom) => {
            const active = symptom.id === activeFix.id;
            return (
              <button
                key={symptom.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`tuner-spec-card tactile-press ${active ? 'selected' : ''} ${
                  symptom.isScamWarning ? 'fix-scam-card' : ''
                }`}
                onClick={() => {
                  playSwitchTick(soundEnabled, symptom.isScamWarning ? 560 : 740);
                  triggerHaptic(25);
                  setSelectedId(symptom.id);
                }}
              >
                <div className="tuner-card-head">
                  <strong>{symptom.title}</strong>
                  <span className={`mono money-ch-pill ${symptom.isScamWarning ? 'fix-scam-pill' : ''}`}>
                    {symptom.badge}
                  </span>
                </div>
                <div className="cheat-meta-sub">{symptom.summary}</div>
              </button>
            );
          })}
        </div>

        <SpotlightPanel
          className={`fix-detail-panel ${activeFix.isScamWarning ? 'money-stop-banner' : ''}`}
          role={activeFix.isScamWarning ? 'alert' : 'region'}
          aria-live="polite"
        >
          <div className="fix-detail-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeFix.isScamWarning ? (
                <ShieldAlert size={20} color="#FF5964" aria-hidden="true" />
              ) : (
                <HardDriveDownload size={18} color="#2CE5B5" aria-hidden="true" />
              )}
              <h2 className="panel-title" style={{ fontSize: '1.14rem' }}>
                {activeFix.title}
              </h2>
            </div>
            <span className={`mono money-ch-pill ${activeFix.isScamWarning ? 'fix-scam-pill' : ''}`}>
              {activeFix.badge}
            </span>
          </div>

          <p className="cheat-meta-sub" style={{ fontSize: '0.84rem', marginTop: '8px' }}>
            {activeFix.summary}
          </p>

          <ol className="fix-steps-list">
            {activeFix.steps.map((step, idx) => (
              <li key={step} className="fix-step-item">
                <span className="mono fix-step-num">{String(idx + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {activeFix.id === 'crash-lost-progress' && typeof onSelectTab === 'function' && (
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="subtle-pill-btn tactile-press"
                onClick={() => {
                  playSwitchTick(soundEnabled, 740);
                  onSelectTab('platinum');
                }}
              >
                <span>Open 15-Slot Manual Save Planner</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          )}

          {activeFix.id === 'ps5-wont-launch' && typeof onSelectTab === 'function' && (
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="subtle-pill-btn tactile-press"
                onClick={() => {
                  playSwitchTick(soundEnabled, 740);
                  onSelectTab('settings');
                }}
              >
                <span>Check PS5 26.07-14.23.00 &amp; 30fps Tuner</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </SpotlightPanel>

        <div className="cheat-warning-banner" style={{ marginTop: '14px' }}>
          {activeFix.isScamWarning ? (
            <AlertTriangle size={18} color="#FF5964" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={18} color="#2CE5B5" aria-hidden="true" />
          )}
          <div>
            <strong>LAUNCH-DAY FACT REMINDER (NOV 19, 2026)</strong>
            <p>
              GTA VI launches strictly as single-player on PS5 (Firmware 26.07-14.23.00 required, Patch 1.002.001 +602.5 MB) and Xbox Series X|S (Patch 1.002.001 +1.59 GB). No PC build or GTA 6 Online is available at launch.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  DollarSign,
  ShieldAlert,
  Camera,
  Check,
  Lock,
} from 'lucide-react';
import {
  GTA6_MONEY_METHODS,
  GTA6_ROBBERY_TIERS,
} from '../../data/games/gta6LaunchTools.js';
import { SpoilerGuard } from './Gta6SpoilerShieldBar.jsx';
import { SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { playSwitchTick, triggerHaptic } from '../../utils/soundHaptics.js';

const ROBBERY_STORAGE_KEY = 'unpause_gta6_robbery_v1';

function loadCheckedRobberies() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ROBBERY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export default function Gta6MoneyRobberyDeck({
  soundEnabled = true,
  spoilerChapter = 1,
  initialPreset = null,
  presetKey = '',
}) {
  const [subTab, setSubTab] = useState(() =>
    initialPreset?.subTab === 'robberies' ? 'robberies' : 'money'
  );
  const [sessionMinutes, setSessionMinutes] = useState(() =>
    Number.isFinite(initialPreset?.sessionMinutes)
      ? Math.max(10, Math.min(180, initialPreset.sessionMinutes))
      : 45
  );
  const [checkedTiers, setCheckedTiers] = useState(loadCheckedRobberies);

  useEffect(() => {
    if (initialPreset?.subTab === 'robberies' || initialPreset?.subTab === 'money') {
      setSubTab(initialPreset.subTab);
    }
  }, [presetKey, initialPreset?.subTab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ROBBERY_STORAGE_KEY, JSON.stringify(checkedTiers));
    } catch {
      // Ignore
    }
  }, [checkedTiers]);

  const roiProjections = useMemo(() => {
    const mins = Math.max(10, Math.min(180, Number(sessionMinutes) || 45));
    return GTA6_MONEY_METHODS.map((m) => {
      const estDollars = m.wipeWarning ? 0 : Math.round((m.ratePerHour / 60) * mins);
      return {
        ...m,
        estDollars,
      };
    });
  }, [sessionMinutes]);

  const toggleTier = (id) => {
    playSwitchTick(soundEnabled, 730);
    triggerHaptic(25);
    setCheckedTiers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <section className="deck-panel" aria-label="GTA VI Story Money ROI & 4-Tier Robbery Protocol">
      <div className="deck-body-pad">
        {/* Critical Red Cash Wipe Banner */}
        <div className="money-stop-banner" role="alert">
          <AlertOctagon size={20} color="#FF5964" aria-hidden="true" />
          <div>
            <strong>STOP: Cash Wipes at End of Chapter 1</strong>
            <p>
              Do not stockpile unspent Jason &amp; Lucia cash in Chapter 1 — wallet cash resets to zero moving into Chapter 2. Spend leftover money on weapon attachments and safehouse upgrades first.
            </p>
          </div>
        </div>

        {/* Subtab Navigation */}
        <div className="filter-row" role="tablist" aria-label="Money and Robbery Views">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'money'}
            className={`filter-pill tactile-press ${subTab === 'money' ? 'active' : ''}`}
            onClick={() => {
              playSwitchTick(soundEnabled, 700);
              triggerHaptic(25);
              setSubTab('money');
            }}
          >
            <DollarSign size={13} aria-hidden="true" />
            <span>Story Money ROI Slider</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'robberies'}
            className={`filter-pill tactile-press ${subTab === 'robberies' ? 'active' : ''}`}
            onClick={() => {
              playSwitchTick(soundEnabled, 700);
              triggerHaptic(25);
              setSubTab('robberies');
            }}
          >
            <Lock size={13} aria-hidden="true" />
            <span>4-Tier Robbery Protocol ({checkedTiers.length}/4)</span>
          </button>
        </div>

        {subTab === 'money' ? (
          <div>
            <SpotlightPanel className="meter-box">
              <div className="meter-labels">
                <label htmlFor="money-session-slider">
                  Active Grind Session Window (Jason &amp; Lucia)
                </label>
                <strong className="mono">{sessionMinutes} Minutes</strong>
              </div>
              <input
                id="money-session-slider"
                type="range"
                min={10}
                max={180}
                step={5}
                value={sessionMinutes}
                style={{ '--pct': `${Math.round(((sessionMinutes - 10) / 170) * 100)}%` }}
                onChange={(e) => setSessionMinutes(Number(e.target.value))}
              />
              <p className="cheat-meta-sub" style={{ marginTop: '8px' }}>
                Adjust session duration to compare chapter-gated payouts (spoiler shield automatically frost-blurs future chapters above your bar).
              </p>
            </SpotlightPanel>

            <div className="money-methods-grid">
              {roiProjections.map((method) => (
                <SpoilerGuard
                  key={method.id}
                  currentChapter={spoilerChapter}
                  minChapter={method.minChapter}
                  label={method.chapterBadge}
                  soundEnabled={soundEnabled}
                >
                  <SpotlightPanel
                    className={`money-method-card ${method.wipeWarning ? 'wipe-card' : ''}`}
                  >
                    <div className="money-method-head">
                      <span className="mono money-ch-pill">{method.chapterBadge}</span>
                      <strong className="mono money-est-val">
                        {method.wipeWarning
                          ? '$0 SAVED'
                          : `~$${method.estDollars.toLocaleString('en-US')}`}
                      </strong>
                    </div>
                    <h3>{method.title}</h3>
                    <div className="mono money-payout-range">{method.payoutRange}</div>
                    <p>{method.detail}</p>
                    <div className="money-gear-note">{method.gearNote}</div>
                  </SpotlightPanel>
                </SpoilerGuard>
              ))}
            </div>
          </div>
        ) : (
          <div className="robbery-protocol-grid">
            <SpotlightPanel className="robbery-alert-strip">
              <Camera size={16} color="#38BDF8" aria-hidden="true" />
              <span>
                <strong>Key Launch Rules:</strong> Safe codes are <strong>randomized per playthrough</strong> (search local desk clues), shoot pulsing <strong>Cloud-icon CCTV</strong> cameras before uploading alerts, and equip the <strong>Ch. 3 Dye Pack Jammer</strong> before Vault runs.
              </span>
            </SpotlightPanel>

            <div className="cheats-list-grid">
              {GTA6_ROBBERY_TIERS.map((tier) => {
                const checked = checkedTiers.includes(tier.id);
                return (
                  <SpoilerGuard
                    key={tier.id}
                    currentChapter={spoilerChapter}
                    minChapter={tier.minChapter}
                    label={`${tier.tier}: ${tier.title}`}
                    soundEnabled={soundEnabled}
                  >
                    <article className={`robbery-tier-card ${checked ? 'cleared' : ''}`}>
                      <div className="cheat-card-top">
                        <div>
                          <span className="mono money-ch-pill">
                            {tier.tier} · Min Ch. {tier.minChapter}
                          </span>
                          <h3 className="robbery-tier-title">{tier.title}</h3>
                        </div>
                        <button
                          type="button"
                          aria-pressed={checked}
                          className={`subtle-pill-btn tactile-press ${checked ? 'challenge-done' : ''}`}
                          onClick={() => toggleTier(tier.id)}
                        >
                          {checked ? <Check size={13} aria-hidden="true" /> : <ShieldAlert size={13} aria-hidden="true" />}
                          <span>{checked ? 'Practiced' : 'Mark Ready'}</span>
                        </button>
                      </div>
                      <div className="mono money-payout-range">{tier.payout}</div>
                      <p className="cheat-card-effect">{tier.rule}</p>
                    </article>
                  </SpoilerGuard>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

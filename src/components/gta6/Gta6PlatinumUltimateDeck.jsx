import React, { useEffect, useState } from 'react';
import {
  Award,
  AlertTriangle,
  Check,
  Plus,
  Minus,
  Anchor,
  Save,
} from 'lucide-react';
import {
  GTA6_PLATINUM_MISSABLES,
  GTA6_SAVE_SLOT_TEMPLATES,
  GTA6_COLLECTIBLE_TARGETS,
  GTA6_ULTIMATE_CLAIMS,
} from '../../data/games/gta6LaunchTools.js';
import { SpoilerGuard } from './Gta6SpoilerShieldBar.jsx';
import { SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { playSwitchTick, triggerHaptic } from '../../utils/soundHaptics.js';

const PLATINUM_STORAGE_KEY = 'unpause_gta6_platinum_v1';

function sanitizeNote(str) {
  return String(str || '').replace(/[<>]/g, '').slice(0, 64);
}

function loadPlatinumState() {
  const defaultSlots = GTA6_SAVE_SLOT_TEMPLATES.map((t) => ({
    slot: t.slot,
    saved: false,
    note: t.defaultLabel,
  }));
  if (typeof window === 'undefined') {
    return {
      wainkCount: 0,
      animalCount: 0,
      slots: defaultSlots,
      ultimateClaimed: [],
      balconyDone: false,
    };
  }
  try {
    const raw = window.localStorage.getItem(PLATINUM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const waink = Number.isFinite(parsed.wainkCount) ? Math.max(0, Math.min(200, Math.round(parsed.wainkCount))) : 0;
    const animals = Number.isFinite(parsed.animalCount) ? Math.max(0, Math.min(100, Math.round(parsed.animalCount))) : 0;
    const slots = Array.isArray(parsed.slots) && parsed.slots.length === 15
      ? parsed.slots.map((s, idx) => ({
          slot: idx + 1,
          saved: Boolean(s?.saved),
          note: sanitizeNote(s?.note || defaultSlots[idx].note),
        }))
      : defaultSlots;
    const ultimateClaimed = Array.isArray(parsed.ultimateClaimed)
      ? parsed.ultimateClaimed.filter((x) => typeof x === 'string')
      : [];
    return {
      wainkCount: waink,
      animalCount: animals,
      slots,
      ultimateClaimed,
      balconyDone: Boolean(parsed.balconyDone),
    };
  } catch {
    return {
      wainkCount: 0,
      animalCount: 0,
      slots: defaultSlots,
      ultimateClaimed: [],
      balconyDone: false,
    };
  }
}

export default function Gta6PlatinumUltimateDeck({
  soundEnabled = true,
  spoilerChapter = 1,
  initialPreset = null,
  presetKey = '',
}) {
  const [subTab, setSubTab] = useState(() =>
    initialPreset?.subTab === 'ultimate' ? 'ultimate' : 'platinum'
  );
  const [state, setState] = useState(loadPlatinumState);

  useEffect(() => {
    if (initialPreset?.subTab === 'ultimate' || initialPreset?.subTab === 'platinum') {
      setSubTab(initialPreset.subTab);
    }
  }, [presetKey, initialPreset?.subTab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PLATINUM_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage limits
    }
  }, [state]);

  const adjustCounter = (field, maxVal, delta) => {
    playSwitchTick(soundEnabled, delta > 0 ? 780 : 580);
    triggerHaptic(25);
    setState((prev) => ({
      ...prev,
      [field]: Math.max(0, Math.min(maxVal, (Number(prev[field]) || 0) + delta)),
    }));
  };

  const toggleSlot = (slotNum) => {
    playSwitchTick(soundEnabled, 720);
    triggerHaptic(25);
    setState((prev) => ({
      ...prev,
      slots: prev.slots.map((s) => (s.slot === slotNum ? { ...s, saved: !s.saved } : s)),
    }));
  };

  const updateSlotNote = (slotNum, nextText) => {
    const clean = sanitizeNote(nextText);
    setState((prev) => ({
      ...prev,
      slots: prev.slots.map((s) => (s.slot === slotNum ? { ...s, note: clean } : s)),
    }));
  };

  const toggleUltimateClaim = (id) => {
    playSwitchTick(soundEnabled, 740);
    triggerHaptic(25);
    setState((prev) => ({
      ...prev,
      ultimateClaimed: prev.ultimateClaimed.includes(id)
        ? prev.ultimateClaimed.filter((x) => x !== id)
        : [...prev.ultimateClaimed, id],
    }));
  };

  const savedSlotsCount = state.slots.filter((s) => s.saved).length;

  return (
    <section className="deck-panel" aria-label="GTA VI Platinum Collectibles, 15 Save Slots & Ultimate Claims">
      <div className="deck-body-pad">
        {/* Chapter 1 Missable Trophy Alert */}
        <div className="money-stop-banner missable-alert" role="alert">
          <AlertTriangle size={20} color="#FF5964" aria-hidden="true" />
          <div style={{ flex: '1 1 280px' }}>
            <strong>
              MISSABLE WARNING ({GTA6_PLATINUM_MISSABLES.chapter}): "{GTA6_PLATINUM_MISSABLES.trophyName}"
            </strong>
            <p>{GTA6_PLATINUM_MISSABLES.warning}</p>
          </div>
          <button
            type="button"
            aria-pressed={state.balconyDone}
            className={`subtle-pill-btn tactile-press ${state.balconyDone ? 'challenge-done' : ''}`}
            onClick={() => {
              playSwitchTick(soundEnabled, 760);
              triggerHaptic(25);
              setState((prev) => ({ ...prev, balconyDone: !prev.balconyDone }));
            }}
          >
            {state.balconyDone ? <Check size={13} aria-hidden="true" /> : null}
            <span>{state.balconyDone ? 'Balcony Done' : 'Mark Balcony Done'}</span>
          </button>
        </div>

        {/* Subtabs */}
        <div className="filter-row" role="tablist" aria-label="Platinum and Ultimate Views">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'platinum'}
            className={`filter-pill tactile-press ${subTab === 'platinum' ? 'active' : ''}`}
            onClick={() => {
              playSwitchTick(soundEnabled, 700);
              triggerHaptic(25);
              setSubTab('platinum');
            }}
          >
            <Award size={13} aria-hidden="true" />
            <span>Platinum &amp; Collectibles</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'ultimate'}
            className={`filter-pill tactile-press ${subTab === 'ultimate' ? 'active' : ''}`}
            onClick={() => {
              playSwitchTick(soundEnabled, 700);
              triggerHaptic(25);
              setSubTab('ultimate');
            }}
          >
            <Anchor size={13} aria-hidden="true" />
            <span>$99.99 Ultimate Edition Checklist ({state.ultimateClaimed.length}/4)</span>
          </button>
        </div>

        {subTab === 'platinum' ? (
          <div>
            {/* Thumb-Tap Collectibles Counters (WAiNK 0/200 & Animals 0/100) */}
            <div className="collectible-counters-grid">
              {GTA6_COLLECTIBLE_TARGETS.map((col) => {
                const field = col.id === 'waink' ? 'wainkCount' : 'animalCount';
                const current = Number(state[field]) || 0;
                const pct = Math.min(100, Math.round((current / col.target) * 100));
                return (
                  <SpotlightPanel key={col.id} className="collectible-card">
                    <div className="collectible-head">
                      <div>
                        <span className="section-label">{col.label.toUpperCase()}</span>
                        <p className="cheat-meta-sub">{col.hint}</p>
                      </div>
                      <strong className="mono collectible-count-big">
                        {current} / {col.target}
                      </strong>
                    </div>

                    <div className="gs-rbx-gate-track" aria-hidden="true" style={{ margin: '10px 0' }}>
                      <div className="gs-rbx-gate-fill eligible" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="thumb-counter-row">
                      <button
                        type="button"
                        aria-label={`Decrement ${col.label}`}
                        className="thumb-counter-btn tactile-press"
                        onClick={() => adjustCounter(field, col.target, -1)}
                      >
                        <Minus size={16} aria-hidden="true" />
                        <span>-1</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Increment ${col.label} by 1`}
                        className="thumb-counter-btn primary tactile-press"
                        onClick={() => adjustCounter(field, col.target, 1)}
                      >
                        <Plus size={18} aria-hidden="true" />
                        <span>+1 Tap</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Increment ${col.label} by 5`}
                        className="thumb-counter-btn tactile-press"
                        onClick={() => adjustCounter(field, col.target, 5)}
                      >
                        <Plus size={14} aria-hidden="true" />
                        <span>+5</span>
                      </button>
                    </div>
                  </SpotlightPanel>
                );
              })}
            </div>

            {/* Interactive 15-Save-Slot Tracker */}
            <div className="section-label" style={{ marginTop: '18px' }}>
              <Save size={13} aria-hidden="true" />
              <span>15-SAVE-SLOT TRACKER ({savedSlotsCount} / 15 ROTATION SLOTS LOGGED)</span>
            </div>

            <div className="save-slot-grid">
              {state.slots.map((slot) => (
                <div key={slot.slot} className={`save-slot-row ${slot.saved ? 'logged' : ''}`}>
                  <button
                    type="button"
                    aria-pressed={slot.saved}
                    className={`save-slot-check mono tactile-press ${slot.saved ? 'done' : ''}`}
                    onClick={() => toggleSlot(slot.slot)}
                  >
                    {slot.saved ? <Check size={13} aria-hidden="true" /> : null}
                    <span>#{String(slot.slot).padStart(2, '0')}</span>
                  </button>
                  <input
                    type="text"
                    aria-label={`Save Slot ${slot.slot} checkpoint note`}
                    className="deck-input no-icon save-slot-input"
                    value={slot.note}
                    maxLength={64}
                    onChange={(e) => updateSlotNote(slot.slot, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <SpotlightPanel className="robbery-alert-strip" style={{ marginBottom: '12px' }}>
              <Anchor size={16} color="#FF5964" aria-hidden="true" />
              <span>
                <strong>$99.99 Ultimate Edition Rule:</strong> The flagship <strong>Shizu Typhoon Squalo</strong> speedboat unlocks strictly in <strong>Chapter 4</strong> at the Keys dock, and bonus cash should be claimed in <strong>Chapter 2+</strong> after the Ch. 1 wallet reset.
              </span>
            </SpotlightPanel>

            <div className="cheats-list-grid">
              {GTA6_ULTIMATE_CLAIMS.map((claim) => {
                const claimed = state.ultimateClaimed.includes(claim.id);
                return (
                  <SpoilerGuard
                    key={claim.id}
                    currentChapter={spoilerChapter}
                    minChapter={claim.minChapter}
                    label={`${claim.title} (${claim.exclusiveBadge})`}
                    soundEnabled={soundEnabled}
                  >
                    <article className={`robbery-tier-card ${claimed ? 'cleared' : ''}`}>
                      <div className="cheat-card-top">
                        <div>
                          <span className="mono money-ch-pill">{claim.exclusiveBadge}</span>
                          <h3 className="robbery-tier-title">{claim.title}</h3>
                        </div>
                        <button
                          type="button"
                          aria-pressed={claimed}
                          className={`subtle-pill-btn tactile-press ${claimed ? 'challenge-done' : ''}`}
                          onClick={() => toggleUltimateClaim(claim.id)}
                        >
                          {claimed ? <Check size={13} aria-hidden="true" /> : null}
                          <span>{claimed ? 'Claimed' : 'Mark Claimed'}</span>
                        </button>
                      </div>
                      <p className="cheat-card-effect">{claim.detail}</p>
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

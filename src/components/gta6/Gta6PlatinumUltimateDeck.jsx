import React, { useEffect, useState } from 'react';
import {
  Award,
  AlertTriangle,
  Check,
  Plus,
  Minus,
  Anchor,
  Save,
  Share2,
  Link2,
} from 'lucide-react';
import {
  GTA6_PLATINUM_MISSABLES,
  GTA6_SAVE_SLOT_TEMPLATES,
  GTA6_COLLECTIBLE_TARGETS,
  GTA6_ULTIMATE_CLAIMS,
  SPOILER_CHAPTERS,
} from '../../data/games/gta6LaunchTools.js';
import { SpoilerGuard } from './Gta6SpoilerShieldBar.jsx';
import WakeLockToggle from './WakeLockToggle.jsx';
import { SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { playSwitchTick, triggerHaptic } from '../../utils/soundHaptics.js';
import {
  decodePlatinumShareHash,
  encodePlatinumShareHash,
  extractCountsFromPlatinumState,
  hasLocalPlatinumProgress,
} from '../../utils/platinumHashShare.js';
import {
  renderPlatinumProgressCard9x16Canvas,
  shareOrDownloadCanvas,
} from '../../utils/canvasCards.js';
import { copyTextReliably } from '../../utils/clipboard.js';

const PLATINUM_STORAGE_KEY = 'unpause_gta6_platinum_v1';

function sanitizeNote(str) {
  return String(str || '').replace(/[<>]/g, '').slice(0, 64);
}

function clampCounter(raw, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

function buildDefaultSlots() {
  return GTA6_SAVE_SLOT_TEMPLATES.map((t) => ({
    slot: t.slot,
    group: t.group,
    saved: false,
    note: t.defaultLabel,
  }));
}

function loadPlatinumState() {
  const defaultSlots = buildDefaultSlots();
  if (typeof window === 'undefined') {
    return {
      wainkCount: 0,
      animalCount: 0,
      flamingosCount: 0,
      stuntsCount: 0,
      cardsCount: 0,
      slots: defaultSlots,
      ultimateClaimed: [],
      balconyDone: false,
    };
  }
  try {
    const raw = window.localStorage.getItem(PLATINUM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const slots =
      Array.isArray(parsed.slots) && parsed.slots.length === 15
        ? parsed.slots.map((s, idx) => ({
            slot: idx + 1,
            group: defaultSlots[idx].group,
            saved: Boolean(s?.saved),
            note: sanitizeNote(s?.note || defaultSlots[idx].note),
          }))
        : defaultSlots;
    const ultimateClaimed = Array.isArray(parsed.ultimateClaimed)
      ? parsed.ultimateClaimed.filter((x) => typeof x === 'string')
      : [];
    return {
      wainkCount: clampCounter(parsed.wainkCount, 200),
      animalCount: clampCounter(parsed.animalCount, 100),
      flamingosCount: clampCounter(parsed.flamingosCount, 100),
      stuntsCount: clampCounter(parsed.stuntsCount, 300),
      cardsCount: clampCounter(parsed.cardsCount, 15),
      slots,
      ultimateClaimed,
      balconyDone: Boolean(parsed.balconyDone),
    };
  } catch {
    return {
      wainkCount: 0,
      animalCount: 0,
      flamingosCount: 0,
      stuntsCount: 0,
      cardsCount: 0,
      slots: defaultSlots,
      ultimateClaimed: [],
      balconyDone: false,
    };
  }
}

function countsMatch(localState, decoded) {
  const cur = extractCountsFromPlatinumState(localState);
  return (
    cur.waink === decoded.waink &&
    cur.wildlife === decoded.wildlife &&
    cur.flamingos === decoded.flamingos &&
    cur.stunts === decoded.stunts &&
    cur.cards === decoded.cards
  );
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
  const [sharedPreview, setSharedPreview] = useState(null);
  const [shareToast, setShareToast] = useState('');
  const [isExporting9x16, setIsExporting9x16] = useState(false);

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

  // Safely decode #s=... hash links without silently overwriting existing local progress
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const evaluateHash = () => {
      const decoded = decodePlatinumShareHash(window.location.hash);
      if (!decoded) return;
      if (hasLocalPlatinumProgress(state)) {
        if (!countsMatch(state, decoded)) {
          setSharedPreview(decoded);
        }
      } else {
        setState((prev) => ({
          ...prev,
          wainkCount: decoded.waink,
          animalCount: decoded.wildlife,
          flamingosCount: decoded.flamingos,
          stuntsCount: decoded.stunts,
          cardsCount: decoded.cards,
        }));
      }
    };
    evaluateHash();
    window.addEventListener('hashchange', evaluateHash);
    return () => window.removeEventListener('hashchange', evaluateHash);
  }, []); // Run once on mount + react to external hashchange

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onHash = () => {
      const decoded = decodePlatinumShareHash(window.location.hash);
      if (!decoded) return;
      setSharedPreview((prevPreview) => {
        if (hasLocalPlatinumProgress(state) && !countsMatch(state, decoded)) {
          return decoded;
        }
        return prevPreview;
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [state]);

  const stripShareHashFromUrl = () => {
    if (typeof window === 'undefined') return;
    try {
      if (window.location.hash.startsWith('#s=')) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`
        );
      }
    } catch {
      // Ignore history restrictions
    }
  };

  const handleKeepMine = () => {
    playSwitchTick(soundEnabled, 680);
    setSharedPreview(null);
    stripShareHashFromUrl();
    setShareToast('Kept your saved progress on this device.');
  };

  const handleReplaceWithShared = () => {
    if (!sharedPreview) return;
    playSwitchTick(soundEnabled, 820);
    triggerHaptic(25);
    setState((prev) => ({
      ...prev,
      wainkCount: sharedPreview.waink,
      animalCount: sharedPreview.wildlife,
      flamingosCount: sharedPreview.flamingos,
      stuntsCount: sharedPreview.stunts,
      cardsCount: sharedPreview.cards,
    }));
    setSharedPreview(null);
    stripShareHashFromUrl();
    setShareToast('Replaced local counts with shared progress link.');
  };

  const adjustCounter = (field, maxVal, delta) => {
    playSwitchTick(soundEnabled, delta > 0 ? 780 : 580);
    triggerHaptic(25);
    if (sharedPreview) {
      setSharedPreview(null);
      stripShareHashFromUrl();
    }
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

  const handleCopyShareLink = async () => {
    const activeSource = sharedPreview
      ? {
          waink: sharedPreview.waink,
          wildlife: sharedPreview.wildlife,
          flamingos: sharedPreview.flamingos,
          stunts: sharedPreview.stunts,
          cards: sharedPreview.cards,
        }
      : state;
    const hash = encodePlatinumShareHash(activeSource);
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://playunpause.com';
    const path =
      typeof window !== 'undefined' && window.location?.pathname && window.location.pathname !== '/'
        ? window.location.pathname
        : '/gta-6/platinum';
    const url = `${origin}${path}${hash}`;
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
      } catch {
        // Ignore history restrictions
      }
    }
    const ok = await copyTextReliably(url);
    playSwitchTick(soundEnabled, 840);
    triggerHaptic(25);
    setShareToast(
      ok
        ? 'Zero-login #s= progress link copied to clipboard.'
        : `Copy share link: ${url}`
    );
  };

  const handleExport9x16Card = async () => {
    setIsExporting9x16(true);
    playSwitchTick(soundEnabled, 880);
    triggerHaptic(25);

    const chapterObj =
      SPOILER_CHAPTERS.find((c) => c.id === Number(spoilerChapter)) || SPOILER_CHAPTERS[0];
    const spoilerLabel = `Spoiler Shield: ${chapterObj.label}`;

    const counterRows = GTA6_COLLECTIBLE_TARGETS.map((col) => {
      const val = sharedPreview ? sharedPreview[col.id] ?? 0 : Number(state[col.field]) || 0;
      return {
        label: col.label,
        current: val,
        target: col.target,
        hint: col.hint,
      };
    });

    const canvas = await renderPlatinumProgressCard9x16Canvas({
      spoilerLabel,
      savedSlots: state.slots.filter((s) => s.saved).length,
      balconyDone: state.balconyDone,
      counters: counterRows,
    });

    if (!canvas) {
      setIsExporting9x16(false);
      setShareToast('Canvas export unavailable in this browser.');
      return;
    }

    const res = await shareOrDownloadCanvas(
      canvas,
      'unpause-gta6-platinum-9x16.png',
      'GTA VI 100% Progress Card'
    );
    setIsExporting9x16(false);
    setShareToast(
      res.method === 'shared'
        ? '9:16 Progress Card shared cleanly.'
        : '9:16 PNG Progress Card (1080×1920) downloaded.'
    );
  };

  const savedSlotsCount = state.slots.filter((s) => s.saved).length;
  const chapterSlots = state.slots.filter((s) => s.group !== 'freeroam');
  const freeRoamSlots = state.slots.filter((s) => s.group === 'freeroam');

  return (
    <section className="deck-panel" aria-label="GTA VI Platinum Collectibles, 15 Save Slots & Ultimate Claims">
      <div className="deck-body-pad">
        {/* Shared #s= Non-Destructive Banner */}
        {sharedPreview && (
          <div className="shared-preview-banner" role="region" aria-label="Shared progress link preview">
            <div className="shared-preview-copy">
              <strong>Viewing shared progress:</strong>
              <span className="mono">
                WAiNK {sharedPreview.waink}/200 · Wildlife {sharedPreview.wildlife}/100 · Flamingos {sharedPreview.flamingos}/100 · Stunts {sharedPreview.stunts}/300 · Cards {sharedPreview.cards}/15
              </span>
            </div>
            <div className="shared-preview-actions">
              <button
                type="button"
                className="subtle-pill-btn tactile-press"
                onClick={handleKeepMine}
              >
                Keep Mine
              </button>
              <button
                type="button"
                className="primary-coral-btn tactile-press"
                style={{ minHeight: '38px', padding: '0 12px', fontSize: '0.8rem' }}
                onClick={handleReplaceWithShared}
              >
                Replace With Shared
              </button>
            </div>
          </div>
        )}

        {/* Chapter 1 Missable Trophy Alert */}
        <div className="money-stop-banner missable-alert" role="alert">
          <AlertTriangle size={20} color="#FF5964" aria-hidden="true" />
          <div style={{ flex: '1 1 280px' }}>
            <strong>
              MISSABLE WATCH ({GTA6_PLATINUM_MISSABLES.chapter}): "{GTA6_PLATINUM_MISSABLES.trophyName}"
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

        {/* Subtabs & Second-Screen Action Bar */}
        <div className="cheat-controls-row">
          <div className="filter-row" role="tablist" aria-label="Platinum and Ultimate Views" style={{ marginBottom: 0 }}>
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
              <span>100% Menu &amp; 15 Saves</span>
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
              <span>$99.99 Ultimate Checklist ({state.ultimateClaimed.length}/4)</span>
            </button>
          </div>

          <div className="dpad-stage-actions">
            <WakeLockToggle soundEnabled={soundEnabled} />
            <button
              type="button"
              className="subtle-pill-btn tactile-press"
              onClick={handleCopyShareLink}
            >
              <Link2 size={14} aria-hidden="true" />
              <span>Copy Share Link</span>
            </button>
            <button
              type="button"
              className="primary-coral-btn tactile-press"
              style={{ minHeight: '40px', padding: '0 14px', fontSize: '0.82rem' }}
              disabled={isExporting9x16}
              onClick={handleExport9x16Card}
            >
              <Share2 size={14} aria-hidden="true" />
              <span>{isExporting9x16 ? 'Rendering 9:16…' : 'Export 9:16 PNG Progress Card'}</span>
            </button>
          </div>
        </div>

        {shareToast && (
          <div className="inline-status-note ok mono" role="status" style={{ marginBottom: '12px' }}>
            {shareToast}
          </div>
        )}

        {subTab === 'platinum' ? (
          <div>
            {/* 5 Hidden In-Game 100% Completion Counters (48px+ Thumb Targets) */}
            <div className="collectible-counters-grid">
              {GTA6_COLLECTIBLE_TARGETS.map((col) => {
                const current = sharedPreview
                  ? sharedPreview[col.id] ?? 0
                  : Number(state[col.field]) || 0;
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

                    <div className="gs-rbx-gate-track" aria-hidden="true" style={{ margin: '10px 0', width: '100%' }}>
                      <div className="gs-rbx-gate-fill eligible" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="thumb-counter-row" style={{ width: '100%' }}>
                      <button
                        type="button"
                        aria-label={`Decrement ${col.label} by 1`}
                        className="thumb-counter-btn tactile-press"
                        onClick={() => adjustCounter(col.field, col.target, -1)}
                      >
                        <Minus size={16} aria-hidden="true" />
                        <span>-1</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Increment ${col.label} by 1`}
                        className="thumb-counter-btn primary tactile-press"
                        onClick={() => adjustCounter(col.field, col.target, 1)}
                      >
                        <Plus size={18} aria-hidden="true" />
                        <span>+1</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Increment ${col.label} by 5`}
                        className="thumb-counter-btn tactile-press"
                        onClick={() => adjustCounter(col.field, col.target, 5)}
                      >
                        <Plus size={14} aria-hidden="true" />
                        <span>+5</span>
                      </button>
                    </div>
                  </SpotlightPanel>
                );
              })}
            </div>

            {/* 15-Slot Manual Save Planner (10 Chapter Start/End + 5 Free-Roam) */}
            <div className="section-label" style={{ marginTop: '18px' }}>
              <Save size={13} aria-hidden="true" />
              <span>15-SLOT MANUAL SAVE PLANNER ({savedSlotsCount} / 15 ROTATION SLOTS LOGGED)</span>
            </div>

            <p className="cheat-meta-sub" style={{ marginBottom: '10px' }}>
              10 Chapter Start/End slots + 5 Free-Roam slots saved locally in your browser. Protects against 1 overwriting autosave &amp; no mission replay.
            </p>

            <div className="mono gs-micro-label" style={{ marginBottom: '6px' }}>
              CHAPTER START / END SLOTS (SLOTS 01–10)
            </div>
            <div className="save-slot-grid" style={{ marginBottom: '14px' }}>
              {chapterSlots.map((slot) => (
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
                    aria-label={`Chapter Save Slot ${slot.slot} note`}
                    className="deck-input no-icon save-slot-input"
                    value={slot.note}
                    maxLength={64}
                    onChange={(e) => updateSlotNote(slot.slot, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="mono gs-micro-label" style={{ marginBottom: '6px' }}>
              FREE-ROAM &amp; BACKUP SLOTS (SLOTS 11–15)
            </div>
            <div className="save-slot-grid">
              {freeRoamSlots.map((slot) => (
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
                    aria-label={`Free-Roam Save Slot ${slot.slot} note`}
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
                <strong>$99.99 Ultimate Edition Rule:</strong> The flagship <strong>Shitzu Squalo</strong> speedboat unlocks strictly in <strong>Chapter 4</strong> at the Keys dock, and bonus cash should be claimed in <strong>Chapter 2+</strong> after the Ch. 1 wallet reset.
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

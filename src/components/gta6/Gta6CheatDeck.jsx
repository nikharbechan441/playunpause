import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Gamepad2,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  Sparkles,
  Trophy,
  Smartphone,
} from 'lucide-react';
import {
  GTA6_CHEAT_META,
  GTA6_CONFIRMED_CHEATS,
} from '../../data/games/gta6LaunchTools.js';
import { SpoilerGuard } from './Gta6SpoilerShieldBar.jsx';
import { SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { playSwitchTick, playUnlockChime, triggerHaptic } from '../../utils/soundHaptics.js';

const CHALLENGE_STORAGE_KEY = 'unpause_gta6_cheat_challenges_v1';

const PITCH_BY_TOKEN = {
  'Phone ↑': 580,
  'L1 + R1': 640,
  'LB + RB': 640,
  '↑': 760,
  '↓': 620,
  '←': 680,
  '→': 720,
  '✕': 840,
  A: 840,
  '○': 880,
  B: 880,
  '□': 800,
  X: 800,
  '△': 920,
  Y: 920,
  L1: 660,
  LB: 660,
  R1: 700,
  RB: 700,
  L2: 600,
  LT: 600,
  R2: 740,
  RT: 740,
};

function loadCheckedChallenges() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CHALLENGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export default function Gta6CheatDeck({
  soundEnabled = true,
  spoilerChapter = 1,
  initialPreset = null,
  presetKey = '',
}) {
  const [platform, setPlatform] = useState(() =>
    initialPreset?.cheatPlatform === 'xbox' ? 'xbox' : 'ps5'
  );
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedCheatId, setSelectedCheatId] = useState(
    () => GTA6_CONFIRMED_CHEATS[0].id
  );
  const [activeTokenIdx, setActiveTokenIdx] = useState(-1);
  const [activeTapToken, setActiveTapToken] = useState('');
  const [tapLog, setTapLog] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [checkedChallenges, setCheckedChallenges] = useState(loadCheckedChallenges);

  const timersRef = useRef([]);

  const clearAnimTimers = () => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  };

  useEffect(() => () => clearAnimTimers(), []);

  useEffect(() => {
    if (initialPreset?.cheatPlatform) {
      setPlatform(initialPreset.cheatPlatform === 'xbox' ? 'xbox' : 'ps5');
    }
  }, [presetKey, initialPreset?.cheatPlatform]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(checkedChallenges));
    } catch {
      // Ignore storage restrictions
    }
  }, [checkedChallenges]);

  const filteredCheats = useMemo(() => {
    if (categoryFilter === 'All') return GTA6_CONFIRMED_CHEATS;
    return GTA6_CONFIRMED_CHEATS.filter((c) => c.category === categoryFilter);
  }, [categoryFilter]);

  const selectedCheat = useMemo(
    () =>
      GTA6_CONFIRMED_CHEATS.find((c) => c.id === selectedCheatId) || GTA6_CONFIRMED_CHEATS[0],
    [selectedCheatId]
  );

  const activeCombo =
    platform === 'xbox' ? selectedCheat.xboxCombo : selectedCheat.ps5Combo;

  const firePadToken = (token) => {
    playSwitchTick(soundEnabled, PITCH_BY_TOKEN[token] || 720);
    triggerHaptic(25);
    setActiveTapToken(token);
    setTapLog((prev) => [...prev.slice(-11), token]);
    clearAnimTimers();
    const t = setTimeout(() => setActiveTapToken(''), 240);
    timersRef.current.push(t);
  };

  const handlePlayCombo = () => {
    clearAnimTimers();
    setIsAnimating(true);
    setActiveTapToken('');
    setActiveTokenIdx(-1);

    activeCombo.forEach((tok, idx) => {
      const id = setTimeout(() => {
        setActiveTokenIdx(idx);
        setActiveTapToken(tok);
        playSwitchTick(soundEnabled, PITCH_BY_TOKEN[tok] || 700 + idx * 20);
        triggerHaptic(25);
        if (idx === activeCombo.length - 1) {
          const doneId = setTimeout(() => {
            setIsAnimating(false);
            setActiveTapToken('');
            playUnlockChime(soundEnabled);
          }, 340);
          timersRef.current.push(doneId);
        }
      }, idx * 240);
      timersRef.current.push(id);
    });
  };

  const toggleChallenge = (cheatId) => {
    playSwitchTick(soundEnabled, 740);
    triggerHaptic(25);
    setCheckedChallenges((prev) =>
      prev.includes(cheatId) ? prev.filter((id) => id !== cheatId) : [...prev, cheatId]
    );
  };

  const activeArrowToken =
    activeTokenIdx >= 0 ? activeCombo[activeTokenIdx] : activeTapToken;

  const faceButtons =
    platform === 'xbox'
      ? [
          { token: 'Y', hint: 'Top' },
          { token: 'B', hint: 'Right' },
          { token: 'A', hint: 'Bottom' },
          { token: 'X', hint: 'Left' },
          { token: 'LB', hint: 'Shoulder L' },
          { token: 'RB', hint: 'Shoulder R' },
          { token: 'LT', hint: 'Trigger L' },
          { token: 'RT', hint: 'Trigger R' },
        ]
      : [
          { token: '△', hint: 'Triangle' },
          { token: '○', hint: 'Circle' },
          { token: '✕', hint: 'Cross' },
          { token: '□', hint: 'Square' },
          { token: 'L1', hint: 'Shoulder L' },
          { token: 'R1', hint: 'Shoulder R' },
          { token: 'L2', hint: 'Trigger L' },
          { token: 'R2', hint: 'Trigger R' },
        ];

  const categories = ['All', ...GTA6_CHEAT_META.categories.map((c) => c.name)];

  return (
    <section className="deck-panel" aria-label="GTA VI Haptic D-Pad Cheat Deck">
      <div className="deck-body-pad">
        {/* Trophy & Save Warning Banner */}
        <div className="cheat-warning-banner" role="alert">
          <Trophy size={18} color="#FF5964" aria-hidden="true" />
          <div>
            <strong>TROPHY / ACHIEVEMENT &amp; SAVE DISABLE WARNING</strong>
            <p>{GTA6_CHEAT_META.warning}</p>
          </div>
        </div>

        {/* 61-Cheat Trigger & Unlock Catch Summary */}
        <div className="cheat-meta-grid">
          <SpotlightPanel className="cheat-meta-card">
            <div className="section-label">UNIVERSAL ACTIVATION TRIGGER</div>
            <div className="mono cheat-trigger-big">
              <Smartphone size={15} aria-hidden="true" />
              <span>
                {platform === 'xbox'
                  ? GTA6_CHEAT_META.triggerNote.xbox
                  : GTA6_CHEAT_META.triggerNote.ps5}
              </span>
            </div>
            <p className="cheat-meta-sub">
              Hold bumper triggers while Phone is raised on foot, then dial the D-Pad combo.
            </p>
          </SpotlightPanel>

          <SpotlightPanel className="cheat-meta-card">
            <span className="section-label">
              61 TOTAL CHEATS · UNLOCK CATCH ({checkedChallenges.length} / {GTA6_CONFIRMED_CHEATS.length} CONFIRMED CLEARED)
            </span>
            <p className="cheat-meta-sub" style={{ marginTop: '4px' }}>
              <strong>{GTA6_CHEAT_META.unlockCatch}</strong> All {GTA6_CHEAT_META.totalCount} cheats span 4 categories below.
            </p>
            <div className="cheat-cat-pills">
              {GTA6_CHEAT_META.categories.map((cat) => (
                <span key={cat.name} className="mono cheat-cat-badge">
                  {cat.name}: {cat.count}
                </span>
              ))}
            </div>
          </SpotlightPanel>
        </div>

        {/* Platform + Category Controls */}
        <div className="cheat-controls-row">
          <div className="filter-row" role="group" aria-label="Controller Platform">
            <button
              type="button"
              aria-pressed={platform === 'ps5'}
              className={`filter-pill tactile-press ${platform === 'ps5' ? 'active' : ''}`}
              onClick={() => {
                playSwitchTick(soundEnabled, 700);
                triggerHaptic(25);
                setPlatform('ps5');
                setActiveTokenIdx(-1);
              }}
            >
              PS5 DualSense
            </button>
            <button
              type="button"
              aria-pressed={platform === 'xbox'}
              className={`filter-pill tactile-press ${platform === 'xbox' ? 'active' : ''}`}
              onClick={() => {
                playSwitchTick(soundEnabled, 700);
                triggerHaptic(25);
                setPlatform('xbox');
                setActiveTokenIdx(-1);
              }}
            >
              Xbox Controller
            </button>
          </div>

          <div className="filter-row" role="group" aria-label="Cheat category filter">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={categoryFilter === cat}
                className={`filter-pill tactile-press ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => {
                  playSwitchTick(soundEnabled, 680);
                  setCategoryFilter(cat);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <SpoilerGuard
          currentChapter={spoilerChapter}
          minChapter={selectedCheat.minChapter}
          label={`${selectedCheat.name} Post-Story Cheat`}
          soundEnabled={soundEnabled}
        >
          {/* Interactive Haptic D-Pad Simulator */}
          <SpotlightPanel className="dpad-stage">
            <div className="dpad-stage-head">
              <div>
                <div className="section-label">
                  <Gamepad2 size={13} aria-hidden="true" />
                  <span>INTERACTIVE HAPTIC D-PAD SIMULATOR · {selectedCheat.name.toUpperCase()}</span>
                </div>
                <p className="dpad-effect-line">{selectedCheat.effect}</p>
              </div>
              <div className="dpad-stage-actions">
                <button
                  type="button"
                  className="primary-coral-btn tactile-press"
                  onClick={handlePlayCombo}
                  disabled={isAnimating}
                >
                  <Play size={14} aria-hidden="true" />
                  <span>{isAnimating ? 'Playing Sequence…' : 'Animate Combo'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn tactile-press"
                  onClick={() => {
                    clearAnimTimers();
                    setIsAnimating(false);
                    setActiveTokenIdx(-1);
                    setActiveTapToken('');
                    setTapLog([]);
                  }}
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Active Token Sequence Strip */}
            <div className="combo-token-strip" aria-live="polite">
              {activeCombo.map((tok, idx) => {
                const isLit = activeTokenIdx === idx;
                const isDone = activeTokenIdx > idx;
                return (
                  <span
                    key={`${selectedCheat.id}-${idx}`}
                    className={`combo-step-chip mono ${isLit ? 'lit' : isDone ? 'done' : ''}`}
                  >
                    {tok}
                  </span>
                );
              })}
            </div>

            {/* Dual Touch D-Pad + Shoulder/Face Grid */}
            <div className="controller-sim-grid">
              <div className="dpad-cross-box" role="group" aria-label="Directional D-Pad">
                <button
                  type="button"
                  aria-label="D-Pad Up"
                  className={`dpad-btn dpad-up tactile-press ${activeArrowToken === '↑' || activeArrowToken === 'Phone ↑' ? 'active-glow' : ''}`}
                  onClick={() => firePadToken('↑')}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="D-Pad Left"
                  className={`dpad-btn dpad-left tactile-press ${activeArrowToken === '←' ? 'active-glow' : ''}`}
                  onClick={() => firePadToken('←')}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Raise Phone Up + Bumpers"
                  className={`dpad-btn dpad-center mono tactile-press ${activeArrowToken === 'Phone ↑' || activeArrowToken === 'L1 + R1' || activeArrowToken === 'LB + RB' ? 'active-glow' : ''}`}
                  onClick={() => firePadToken('Phone ↑')}
                >
                  PHONE
                </button>
                <button
                  type="button"
                  aria-label="D-Pad Right"
                  className={`dpad-btn dpad-right tactile-press ${activeArrowToken === '→' ? 'active-glow' : ''}`}
                  onClick={() => firePadToken('→')}
                >
                  →
                </button>
                <button
                  type="button"
                  aria-label="D-Pad Down"
                  className={`dpad-btn dpad-down tactile-press ${activeArrowToken === '↓' ? 'active-glow' : ''}`}
                  onClick={() => firePadToken('↓')}
                >
                  ↓
                </button>
              </div>

              <div className="controller-face-grid" role="group" aria-label="Controller Action & Shoulder Buttons">
                {faceButtons.map((btn) => (
                  <button
                    key={btn.token}
                    type="button"
                    aria-label={`${btn.token} button`}
                    className={`dpad-face-btn mono tactile-press ${
                      activeArrowToken === btn.token ||
                      ((btn.token === 'L1' || btn.token === 'R1') && activeArrowToken === 'L1 + R1') ||
                      ((btn.token === 'LB' || btn.token === 'RB') && activeArrowToken === 'LB + RB')
                        ? 'active-glow'
                        : ''
                    }`}
                    onClick={() => firePadToken(btn.token)}
                  >
                    <strong>{btn.token}</strong>
                    <span>{btn.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {tapLog.length > 0 && (
              <div className="mono dpad-tap-log">
                Input buffer: {tapLog.join(' · ')}
              </div>
            )}
          </SpotlightPanel>
        </SpoilerGuard>

        {/* Confirmed Cheats Grid with localStorage Challenge Checkboxes */}
        <div className="section-label" style={{ marginTop: '18px' }}>
          <Sparkles size={13} aria-hidden="true" />
          <span>CONFIRMED LAUNCH CODES ({filteredCheats.length} SHOWN · 61 IN GAME)</span>
        </div>

        <div className="cheats-list-grid">
          {filteredCheats.map((cheat) => {
            const isSelected = cheat.id === selectedCheat.id;
            const isChallengeCleared = checkedChallenges.includes(cheat.id);
            const combo = platform === 'xbox' ? cheat.xboxCombo : cheat.ps5Combo;
            return (
              <article
                key={cheat.id}
                className={`cheat-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="cheat-card-top">
                  <button
                    type="button"
                    className="cheat-select-btn tactile-press"
                    onClick={() => {
                      clearAnimTimers();
                      setIsAnimating(false);
                      setActiveTokenIdx(-1);
                      setSelectedCheatId(cheat.id);
                      playSwitchTick(soundEnabled, 720);
                      triggerHaptic(25);
                    }}
                  >
                    <strong>{cheat.name}</strong>
                    <span className="mono cheat-card-cat">{cheat.category}</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={isChallengeCleared}
                    className={`subtle-pill-btn tactile-press ${isChallengeCleared ? 'challenge-done' : ''}`}
                    onClick={() => toggleChallenge(cheat.id)}
                  >
                    {isChallengeCleared ? <Check size={13} aria-hidden="true" /> : null}
                    <span>{isChallengeCleared ? 'Challenge Done' : 'Unlock Check'}</span>
                  </button>
                </div>

                <p className="cheat-card-effect">{cheat.effect}</p>

                <SpoilerGuard
                  currentChapter={spoilerChapter}
                  minChapter={cheat.minChapter}
                  label={cheat.name}
                  soundEnabled={soundEnabled}
                >
                  <div className="mono cheat-combo-inline">{combo.join(' · ')}</div>
                  <div className="cheat-challenge-note">{cheat.challenge}</div>
                </SpoilerGuard>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

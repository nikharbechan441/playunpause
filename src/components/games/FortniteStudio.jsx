import React, { useEffect, useState } from 'react';
import { Zap, CheckCircle2, Circle } from 'lucide-react';
import { AnimatedValue, SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { NumericField, PinButton } from './GameStudioDock.jsx';

const FORTNITE_DAILY_XP_STORAGE_KEY = 'unpause_fn_daily_xp_v1';

const DAILY_XP_TASKS = [
  { id: 'br-dailies', label: 'BR Dailies +60K', xp: 60000 },
  { id: 'creative-cap', label: 'Creative +300K', xp: 300000 },
  { id: 'lego-session', label: 'LEGO +120K', xp: 120000 },
];

function getUtcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function readUtcDailyChecklist(utcDate) {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(FORTNITE_DAILY_XP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.utcDate !== utcDate) {
      return [];
    }
    const validIds = new Set(DAILY_XP_TASKS.map((t) => t.id));
    return Array.isArray(parsed.checkedIds)
      ? parsed.checkedIds.filter((id) => typeof id === 'string' && validIds.has(id))
      : [];
  } catch {
    return [];
  }
}

const PASS_MILESTONES = [
  { lvl: 1, label: 'Lv 1 Start', sub: 'Season Drop' },
  { lvl: 100, label: 'Lv 100 Pass', sub: 'Tier 100 Outfit' },
  { lvl: 140, label: 'Lv 140 V-Bucks', sub: '1,500 V-Bucks' },
  { lvl: 200, label: 'Lv 200 Max', sub: 'Super Styles' },
];

export default function FortniteStudio({
  soundEnabled,
  playTick,
  onPinSnapshot,
  fnCurLvl,
  setFnCurLvl,
  fnTargetLvl,
  setFnTargetLvl,
  fnDaysLeft,
  setFnDaysLeft,
  fnIncludeDailies,
  setFnIncludeDailies,
  fnIncludeCreative,
  setFnIncludeCreative,
  fnIncludeLego,
  setFnIncludeLego,
  fortniteResult,
}) {
  const utcDate = getUtcDateKey();
  const [checkedDailyIds, setCheckedDailyIds] = useState(() => readUtcDailyChecklist(utcDate));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        FORTNITE_DAILY_XP_STORAGE_KEY,
        JSON.stringify({ utcDate, checkedIds: checkedDailyIds })
      );
    } catch {
      // Ignore storage write errors cleanly
    }
  }, [utcDate, checkedDailyIds]);

  const bankedDailyXp = DAILY_XP_TASKS.reduce(
    (sum, task) => (checkedDailyIds.includes(task.id) ? sum + task.xp : sum),
    0
  );

  const toggleDailyTask = (taskId) => {
    playTick?.(soundEnabled, 740);
    setCheckedDailyIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const curRailPct = Math.min(100, Math.max(0, ((fnCurLvl - 1) / 199) * 100));
  const tgtRailPct = Math.min(100, Math.max(0, ((fnTargetLvl - 1) / 199) * 100));

  const dailyTotalDenominator = Math.max(
    1,
    fortniteResult.xpPerDay,
    fortniteResult.passiveXpPerDay + fortniteResult.activeBrXpNeededPerDay
  );
  const dailyBonusShare = fnIncludeDailies ? (60000 / dailyTotalDenominator) * 100 : 0;
  const creativeShare = fnIncludeCreative ? (300000 / dailyTotalDenominator) * 100 : 0;
  const legoShare = fnIncludeLego ? (120000 / dailyTotalDenominator) * 100 : 0;
  const activeBrShare = Math.min(
    100,
    (fortniteResult.activeBrXpNeededPerDay / dailyTotalDenominator) * 100
  );

  return (
    <div className="gs-studio-stack gs-fn-pass">
      {/* SEASON BATTLE PASS MILESTONE RAIL */}
      <SpotlightPanel className="gs-hero-instrument gs-fn-rail-card">
        <div className="gs-cod-top-row">
          <div className="gs-studio-identity">
            <span className="gs-kicker-badge">
              <Zap size={13} aria-hidden="true" />
              <span>BATTLE PASS SEASON PROGRESSION TRACK</span>
            </span>
            <h2 className="gs-bench-heading">
              {fortniteResult.alreadyDone
                ? `Level ${fnTargetLvl} Milestone Reached`
                : `${fortniteResult.xpPerDay.toLocaleString('en-US')} XP / Day Schedule`}
            </h2>
          </div>

          <PinButton
            label="Pin XP Plan"
            onClick={() =>
              onPinSnapshot(
                `Level ${fnCurLvl} → ${fnTargetLvl}`,
                fortniteResult.alreadyDone
                  ? 'Target Reached'
                  : `${fortniteResult.xpPerDay.toLocaleString('en-US')} XP/day (~${fortniteResult.estMatchesPerDay} BR matches)`
              )
            }
          />
        </div>

        <div className="gs-mc-coord-hero" aria-live="polite">
          <div>
            <span className="mono gs-micro-label">
              {fortniteResult.alreadyDone
                ? 'SEASON TARGET CLEARED'
                : `PACE ACROSS ${fnDaysLeft} REMAINING DAYS`}
            </span>
            <div className="gs-hero-big mono gs-txt-teal">
              {fortniteResult.alreadyDone ? (
                '0 XP Remaining'
              ) : (
                <>
                  <AnimatedValue value={fortniteResult.xpPerDay} suffix=" XP / day" />
                </>
              )}
            </div>
          </div>
          <div className="gs-pill-cluster">
            <span className="gs-verdict-chip mono">
              {fortniteResult.alreadyDone
                ? `Lv ${fnCurLvl} ≥ ${fnTargetLvl}`
                : `${fortniteResult.levelsPerDay} Lv/day · ~${fortniteResult.estMatchesPerDay} BR matches`}
            </span>
          </div>
        </div>

        {/* Interactive Lv 1 -> 200 Rail */}
        <div className="gs-fn-rail-wrap">
          <div className="gs-fn-rail-track" aria-hidden="true">
            <div className="gs-fn-rail-cur" style={{ width: `${curRailPct}%` }} />
            <div className="gs-fn-rail-target-mark" style={{ left: `${tgtRailPct}%` }} />
          </div>
          <div className="gs-fn-milestones" role="group" aria-label="Target Battle Pass tier">
            {PASS_MILESTONES.filter((m) => m.lvl > 1).map((m) => {
              const active = fnTargetLvl === m.lvl;
              const cleared = fnCurLvl >= m.lvl;
              return (
                <button
                  key={m.lvl}
                  type="button"
                  aria-pressed={active}
                  className={`gs-fn-stop-btn ${active ? 'active' : ''} ${cleared ? 'cleared' : ''}`}
                  onClick={() => {
                    playTick?.(soundEnabled, 740);
                    setFnTargetLvl(m.lvl);
                  }}
                >
                  <strong>{m.label}</strong>
                  <span className="mono">{m.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SpotlightPanel>

      {/* MULTI-SOURCE XP SYNTHESIZER */}
      <SpotlightPanel className="gs-work-card">
        <div className="mg-field-grid">
          <div className="mg-field">
            <label htmlFor="fn-cur">Current Battle Pass Level</label>
            <NumericField
              id="fn-cur"
              min={1}
              max={200}
              fallback={44}
              className="deck-input no-icon mono"
              value={fnCurLvl}
              onCommit={setFnCurLvl}
            />
          </div>
          <div className="mg-field">
            <label htmlFor="fn-days">Days Left in Season</label>
            <NumericField
              id="fn-days"
              min={1}
              max={120}
              fallback={28}
              className="deck-input no-icon mono"
              value={fnDaysLeft}
              onCommit={setFnDaysLeft}
            />
          </div>
          <div className="mg-stat-mini">
            <span>Levels / Total XP Left</span>
            <strong>
              <AnimatedValue value={fortniteResult.levelsLeft} suffix=" Lvls" /> ·{' '}
              {(fortniteResult.totalXpLeft / 1000000).toFixed(2)}M XP
            </strong>
          </div>
        </div>

        {/* Stacked Daily XP Synthesizer Bar */}
        <div className="gs-fn-xp-synth">
          <div className="gs-card-topbar">
            <span className="mono gs-micro-label">DAILY XP SOURCE STACKER</span>
            <span className="mono gs-micro-label">
              Passive: {fortniteResult.passiveXpPerDay.toLocaleString('en-US')} XP/day
            </span>
          </div>
          <div className="gs-fn-stack-bar" aria-hidden="true">
            {dailyBonusShare > 0 && (
              <span className="gs-fn-seg br-daily" style={{ width: `${Math.min(100, dailyBonusShare)}%` }} />
            )}
            {creativeShare > 0 && (
              <span className="gs-fn-seg uefn" style={{ width: `${Math.min(100, creativeShare)}%` }} />
            )}
            {legoShare > 0 && (
              <span className="gs-fn-seg lego" style={{ width: `${Math.min(100, legoShare)}%` }} />
            )}
            {activeBrShare > 0 && (
              <span className="gs-fn-seg active-br" style={{ width: `${Math.min(100, activeBrShare)}%` }} />
            )}
          </div>

          <div className="gs-fn-source-grid">
            <button
              type="button"
              aria-pressed={fnIncludeDailies}
              className={`gs-fn-source-card br-daily ${fnIncludeDailies ? 'active' : ''}`}
              onClick={() => {
                playTick?.(soundEnabled, 700);
                setFnIncludeDailies((v) => !v);
              }}
            >
              <strong>BR 3× Daily Bonus</strong>
              <span className="mono">+60,000 XP / day</span>
            </button>
            <button
              type="button"
              aria-pressed={fnIncludeCreative}
              className={`gs-fn-source-card uefn ${fnIncludeCreative ? 'active' : ''}`}
              onClick={() => {
                playTick?.(soundEnabled, 700);
                setFnIncludeCreative((v) => !v);
              }}
            >
              <strong>UEFN Creative Cap</strong>
              <span className="mono">+300,000 XP / day</span>
            </button>
            <button
              type="button"
              aria-pressed={fnIncludeLego}
              className={`gs-fn-source-card lego ${fnIncludeLego ? 'active' : ''}`}
              onClick={() => {
                playTick?.(soundEnabled, 700);
                setFnIncludeLego((v) => !v);
              }}
            >
              <strong>LEGO / Festival</strong>
              <span className="mono">+120,000 XP / day</span>
            </button>
          </div>
        </div>

        <div className="mg-stat-mini-grid">
          <div className="mg-stat-mini">
            <span>Active BR Grind Needed</span>
            <strong>
              <AnimatedValue value={fortniteResult.activeBrXpNeededPerDay} suffix=" XP/day" />
            </strong>
          </div>
          <div className="mg-stat-mini">
            <span>Est. Matches / Day</span>
            <strong>
              ~<AnimatedValue value={fortniteResult.estMatchesPerDay} suffix=" Matches" />
            </strong>
          </div>
        </div>
      </SpotlightPanel>

      {/* TODAY'S UTC DAILY XP CHECKLIST (LOCAL-ONLY, ZERO MINOR DATA) */}
      <SpotlightPanel className="gs-work-card">
        <div className="gs-card-topbar">
          <h3 className="mg-subcard-title">Today&apos;s UTC Daily XP Checklist ({utcDate})</h3>
          <span className="district-pill mono">
            {bankedDailyXp.toLocaleString('en-US')} / 480,000 XP
          </span>
        </div>

        <div className="gs-daily-xp-row" role="group" aria-label="Today's UTC Daily XP Checklist">
          {DAILY_XP_TASKS.map((task) => {
            const done = checkedDailyIds.includes(task.id);
            return (
              <button
                key={task.id}
                type="button"
                aria-pressed={done}
                className={`filter-pill ${done ? 'active' : ''}`}
                onClick={() => toggleDailyTask(task.id)}
              >
                {done ? (
                  <CheckCircle2 size={15} aria-hidden="true" />
                ) : (
                  <Circle size={15} aria-hidden="true" />
                )}
                <span>{task.label}</span>
              </button>
            );
          })}
        </div>
      </SpotlightPanel>
    </div>
  );
}

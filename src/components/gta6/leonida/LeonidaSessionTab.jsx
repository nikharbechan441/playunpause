import React from 'react';
import { ArrowUpRight, Check, Lock } from 'lucide-react';
import {
  LEONIDA_LAUNCH_PILLS,
  LEONIDA_PACE_MODES,
} from '../../../data/games/leonidaV2Data.js';
import { computeFinishDate, computeTrackerStats } from '../../../utils/leonidaState.js';

export default function LeonidaSessionTab({
  state,
  onJumpToPill,
  onAdjustCount,
  onSetCount,
  onToggleBalcony,
  onSelectPace,
  onChangeHoursPerDay,
  onOpenSlotModal,
}) {
  const stats = computeTrackerStats(state.counts);
  const finish = computeFinishDate({
    pace: state.pace,
    chapter: state.chapter,
    hoursPerDay: state.hoursPerDay,
  });
  const savedCount = state.saves.filter((s) => s.saved).length;

  return (
    <>
      {/* 1. Tonight's Launch Check */}
      <section className="lh-card" aria-labelledby="lh-launch-check-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-launch-check-heading" className="lh-card-title">
              Tonight&apos;s Launch Check
            </h2>
            <p className="lh-card-sub">
              Four single-player checks before rolling out in Leonida — click any pill to jump straight to it.
            </p>
          </div>
          <span className="lh-badge teal">OUT NOW · PATCH 01.002.002 / 1.0.2.2</span>
        </div>

        <div className="lh-launch-pills-grid">
          {LEONIDA_LAUNCH_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              className="lh-launch-pill lh-pressable"
              onClick={() => onJumpToPill(pill)}
            >
              <span>{pill.label}</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      {/* 2. True 100% Tracker Card */}
      <section id="leonida-tracker-section" className="lh-card" aria-labelledby="lh-tracker-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-tracker-heading" className="lh-card-title">
              True 100% Tracker
            </h2>
            <p className="lh-card-sub">
              In-game 100% menu stays hidden until story credits, but every scan &amp; stunt counts now.
            </p>
          </div>
          <span className="lh-badge gold lh-num">{stats.totalPct}% COMPLETE</span>
        </div>

        <div className="lh-missable-strip">
          <span>
            <strong>0 permanently missable trophies</strong> for Platinum (55 trophies · Gold &ldquo;A Long Road&rdquo; for 100%) ·{' '}
            <strong>Ch. 1 Point of No Return:</strong> Save manually after <em>Recalibration</em> before <em>Tourist Trap</em> (bank wallet cash in Family Savings, loot Donnie&apos;s H&amp;L .38 Revolver &amp; Aviators in <em>Don Gone</em>, finish Shirley&apos;s Favors, &amp; do Ch. 1 Balcony Meditation early).
          </span>
          <button
            type="button"
            aria-pressed={state.balconyDone}
            className={`lh-btn lh-pressable ${state.balconyDone ? 'primary-teal' : 'active-gold'}`}
            onClick={onToggleBalcony}
          >
            {state.balconyDone ? (
              <>
                <Check size={14} aria-hidden="true" />
                <span>Collected</span>
              </>
            ) : (
              <span>Mark Done</span>
            )}
          </button>
        </div>

        <div className="lh-tracker-split">
          <div className="lh-ring-box" aria-label={`True 100% completion: ${stats.totalPct} percent`}>
            <svg className="lh-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="lh-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF5A5F" />
                  <stop offset="50%" stopColor="#F5A623" />
                  <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#1B1E27"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="url(#lh-ring-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="314.16"
                strokeDashoffset={stats.dashOffset}
                className="lh-ring-progress"
              />
            </svg>
            <div className="lh-ring-center">
              <span className="lh-ring-pct lh-num">{stats.totalPct}%</span>
              <span className="lh-ring-sub">5 Targets</span>
            </div>
          </div>

          <div className="lh-tracker-rows">
            {stats.rows.map((row) => (
              <div key={row.key} className="lh-tracker-row">
                <div className="lh-tracker-row-top">
                  <div className="lh-tracker-label-col">
                    <div className="lh-tracker-name">
                      {row.label}:{' '}
                      <span className="lh-num">
                        {row.value}/{row.target}
                      </span>
                    </div>
                    <div className="lh-tracker-detail">{row.detail}</div>
                  </div>

                  <div className="lh-tracker-controls">
                    <button
                      type="button"
                      className="lh-couch-btn lh-pressable lh-num"
                      aria-label={`Decrease ${row.label} by 1`}
                      onClick={() => onAdjustCount(row.key, -1)}
                    >
                      -1
                    </button>
                    {typeof onSetCount === 'function' && (
                      <input
                        type="number"
                        min="0"
                        max={row.target}
                        value={row.value}
                        aria-label={`${row.label} count`}
                        className="lh-tracker-direct-input lh-num"
                        onChange={(e) => onSetCount(row.key, e.target.value)}
                      />
                    )}
                    <button
                      type="button"
                      className="lh-couch-btn lh-pressable lh-num"
                      aria-label={`Increase ${row.label} by 1`}
                      onClick={() => onAdjustCount(row.key, 1)}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      className="lh-couch-btn lh-pressable lh-num"
                      aria-label={`Increase ${row.label} by 5`}
                      onClick={() => onAdjustCount(row.key, 5)}
                    >
                      +5
                    </button>
                  </div>
                </div>
                <div className="lh-progress-track" aria-hidden="true">
                  <div className="lh-progress-fill-teal" style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lh-pacer-bar">
          <div className="lh-pacer-controls">
            <span className="lh-badge">Chapter Pacer</span>
            {LEONIDA_PACE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={state.pace === m.id}
                className={`lh-btn lh-pressable lh-num ${state.pace === m.id ? 'active-gold' : ''}`}
                onClick={() => onSelectPace(m.id)}
              >
                {m.label} ({m.badge})
              </button>
            ))}
            <label htmlFor="lh-hours-per-day" className="lh-card-sub" style={{ margin: 0 }}>
              Hrs/day:
            </label>
            <input
              id="lh-hours-per-day"
              type="number"
              min="0.5"
              max="16"
              step="0.5"
              className="lh-num-input lh-num"
              value={state.hoursPerDay}
              onChange={(e) => onChangeHoursPerDay(e.target.value)}
            />
          </div>
          <div className="lh-badge teal lh-num">
            Est. Finish: {finish.formattedDate} ({finish.remHrs}h left)
          </div>
        </div>
      </section>

      {/* 3. 15-Slot Save Guard */}
      <section className="lh-card" aria-labelledby="lh-saves-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-saves-heading" className="lh-card-title">
              15-Slot Save Guard
            </h2>
            <p className="lh-card-sub">
              Click any manual slot below to rename (up to 32 chars) or mark it SAVED before critical chapters.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span className="lh-badge teal lh-num">{savedCount}/15 SAVED</span>
            <span className="lh-badge coral">No Mission Replay · 1 Overwriting Autosave</span>
          </div>
        </div>

        <div className="lh-save-grid">
          {state.saves.map((slot) => (
            <button
              key={slot.slot}
              type="button"
              className={`lh-save-slot-btn lh-pressable ${slot.saved ? 'saved' : ''}`}
              onClick={() => onOpenSlotModal(slot)}
            >
              <div className="lh-save-slot-top lh-num">
                <span>#{String(slot.slot).padStart(2, '0')}</span>
                <span>{slot.saved ? 'SAVED' : 'OPEN'}</span>
              </div>
              <span className="lh-save-slot-label">{slot.label}</span>
              {slot.saved && (
                <span className="lh-badge teal" style={{ padding: '2px 5px', fontSize: '0.66rem' }}>
                  <Lock size={10} aria-hidden="true" /> Protected
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

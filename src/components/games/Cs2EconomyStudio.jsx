import React from 'react';
import { Shield, Users } from 'lucide-react';
import { CS2_LOSS_LADDER } from '../../utils/gameMath.js';
import { AnimatedValue, SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { NumericField, PinButton } from './GameStudioDock.jsx';

export default function Cs2EconomyStudio({
  soundEnabled,
  playTick,
  onPinSnapshot,
  csCash,
  setCsCash,
  csLossLevel,
  setCsLossLevel,
  csSide,
  setCsSide,
  csBombPlanted,
  setCsBombPlanted,
  csTeamCash,
  setCsTeamCash,
  csResult,
  csSquadStats,
}) {
  const fullNeed = csResult.fullBuyNeed;

  return (
    <div className="gs-studio-stack gs-cs2-board" data-cs2-side={csSide}>
      {/* TACTICAL SIDE & IGL BUY CALLOUT HUD */}
      <SpotlightPanel className="gs-hero-instrument gs-cs2-callout-hud">
        <div className="gs-cod-top-row">
          <div className="gs-pill-cluster" role="group" aria-label="CS2 Faction Side">
            <button
              type="button"
              aria-pressed={csSide === 'CT'}
              className={`gs-faction-btn ct ${csSide === 'CT' ? 'active' : ''}`}
              onClick={() => {
                playTick?.(soundEnabled, 700);
                setCsSide('CT');
              }}
            >
              <span>COUNTER-TERRORIST</span>
              <small className="mono">$5,100 Full · $4,300 Core</small>
            </button>
            <button
              type="button"
              aria-pressed={csSide === 'T'}
              className={`gs-faction-btn t ${csSide === 'T' ? 'active' : ''}`}
              onClick={() => {
                playTick?.(soundEnabled, 700);
                setCsSide('T');
              }}
            >
              <span>TERRORIST</span>
              <small className="mono">$4,700 Full · $3,700 Core</small>
            </button>
            {csSide === 'T' && (
              <button
                type="button"
                aria-pressed={csBombPlanted}
                className={`filter-pill ${csBombPlanted ? 'active' : ''}`}
                onClick={() => {
                  playTick?.(soundEnabled, 760);
                  setCsBombPlanted((v) => !v);
                }}
              >
                Bomb Plant (+$800)
              </button>
            )}
          </div>

          <PinButton
            label="Pin Round"
            onClick={() =>
              onPinSnapshot(
                `${csSide} $${csCash} (Loss Lv ${csLossLevel})`,
                `${csResult.callout} | Next Loss $${csResult.nextBonusOnLoss}`
              )
            }
          />
        </div>

        <div className="gs-cs2-banner-grid">
          <div>
            <span className="mono gs-micro-label">
              {csSide}-SIDE IGL RECOMMENDATION (TARGET ${fullNeed.toLocaleString('en-US')})
            </span>
            <div className="gs-cs2-callout-title">{csResult.callout}</div>
          </div>
          <div className="gs-cs2-budget-pill mono">
            <span>Max Safe Eco Spend</span>
            <strong>
              $<AnimatedValue value={csResult.maxSafeSpendForNextFullBuy} />
            </strong>
          </div>
        </div>
      </SpotlightPanel>

      {/* MR12 5-RUNG ANIMATED LOSS-BONUS LADDER */}
      <SpotlightPanel className="gs-work-card gs-cs2-ladder-card">
        <div className="gs-card-topbar">
          <h3 className="mg-subcard-title">
            <Shield size={16} aria-hidden="true" />
            <span>MR12 Loss-Bonus Ladder (-1 Step on Round Win)</span>
          </h3>
          <button
            type="button"
            className="subtle-pill-btn"
            onClick={() => {
              playTick?.(soundEnabled, 640);
              setCsLossLevel((l) => Math.max(0, l - 1));
            }}
          >
            Simulate Round Win (-1)
          </button>
        </div>

        <div className="gs-cs2-ladder" role="group" aria-label="CS2 loss bonus tier">
          {CS2_LOSS_LADDER.map((bonus, lvl) => {
            const active = csLossLevel === lvl;
            const nextIfLose = lvl === csResult.nextIfLossLvl && lvl !== csLossLevel;
            return (
              <button
                key={lvl}
                type="button"
                aria-pressed={active}
                className={`gs-ladder-rung ${active ? 'active' : ''} ${nextIfLose ? 'next-loss' : ''}`}
                style={{ '--rung-h': `${42 + lvl * 14}%` }}
                onClick={() => {
                  playTick?.(soundEnabled, 740);
                  setCsLossLevel(lvl);
                }}
              >
                <div className="gs-rung-bar" aria-hidden="true" />
                <span className="mono gs-rung-lvl">LV {lvl}</span>
                <strong className="mono">${bonus.toLocaleString('en-US')}</strong>
                {active && <span className="gs-rung-tag mono">NOW</span>}
                {nextIfLose && <span className="gs-rung-tag next mono">NEXT LOSS</span>}
              </button>
            );
          })}
        </div>

        <div className="mg-field-grid">
          <div className="mg-field">
            <label htmlFor="cs-cash">Your Bank ($0–$16,000)</label>
            <NumericField
              id="cs-cash"
              min={0}
              max={16000}
              step={100}
              fallback={0}
              className="deck-input no-icon mono"
              value={csCash}
              onCommit={setCsCash}
            />
          </div>
          <div className="mg-stat-mini">
            <span>Next Loss Guarantee</span>
            <strong>
              +$<AnimatedValue value={csResult.nextBonusOnLoss} />
            </strong>
          </div>
          <div className="mg-stat-mini">
            <span>Bank If Full Save</span>
            <strong>
              $<AnimatedValue value={csResult.cashIfSaveAll} />
            </strong>
          </div>
        </div>
      </SpotlightPanel>

      {/* 5-PLAYER SQUAD BANK & RIFLE DROP MATRIX */}
      <SpotlightPanel className="gs-work-card gs-cs2-squad-card">
        <div className="gs-card-topbar">
          <h3 className="mg-subcard-title">
            <Users size={16} aria-hidden="true" />
            <span>5-Player Squad Bank &amp; Rifle Drop Matrix</span>
          </h3>
          <span className="district-pill mono">
            {csSquadStats.canBuyCount}/5 Core Buy · {csSquadStats.dropsAvailable} Rifle Drops
          </span>
        </div>

        <div className="gs-cs2-squad-bars">
          {csTeamCash.map((val, i) => {
            const safeVal = Math.min(16000, Math.max(0, Number(val || 0)));
            const fillPct = Math.min(100, Math.round((safeVal / 16000) * 100));
            const thresholdPct = Math.min(100, Math.round((csSquadStats.need / 16000) * 100));
            const ready = safeVal >= csSquadStats.need;
            return (
              <div key={i} className={`gs-cs2-player-col ${ready ? 'ready' : 'short'}`}>
                <div className="gs-cs2-bar-well" aria-hidden="true">
                  <div className="gs-cs2-bar-fill" style={{ height: `${fillPct}%` }} />
                  <div className="gs-cs2-threshold-line" style={{ bottom: `${thresholdPct}%` }} />
                </div>
                <label htmlFor={`cs-p-${i}`} className="mono">
                  P{i + 1} $
                </label>
                <NumericField
                  id={`cs-p-${i}`}
                  step={100}
                  min={0}
                  max={16000}
                  fallback={0}
                  className="deck-input no-icon mono gs-cs2-player-input"
                  value={val}
                  onCommit={(num) =>
                    setCsTeamCash((prev) => prev.map((c, idx) => (idx === i ? num : c)))
                  }
                />
              </div>
            );
          })}
        </div>
      </SpotlightPanel>
    </div>
  );
}

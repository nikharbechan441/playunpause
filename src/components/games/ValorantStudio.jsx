import React from 'react';
import { Target, Shield, TrendingUp } from 'lucide-react';
import { VAL_WEAPONS, VAL_ARMOR } from '../../utils/gameMath.js';
import {
  AnimatedValue,
  SegmentedSpringTabs,
  SpotlightPanel,
} from '../../utils/motionPrimitives.jsx';
import { NumericField, PinButton } from './GameStudioDock.jsx';

export default function ValorantStudio({
  game,
  soundEnabled,
  playTick,
  onPinSnapshot,
  valCreds,
  setValCreds,
  valWeaponCost,
  setValWeaponCost,
  valArmorCost,
  setValArmorCost,
  valUtilCost,
  setValUtilCost,
  valLossStreak,
  setValLossStreak,
  valCurRr,
  setValCurRr,
  valWr,
  setValWr,
  valWinRr,
  setValWinRr,
  valLossRr,
  setValLossRr,
  valResult,
  valRrResult,
  valMode,
  setValMode,
}) {
  // 3900 Next-Round Guarantee Gauge (Vandal 2900 + Heavy 1000)
  const guaranteePct = Math.min(100, Math.round((valResult.nextRoundMinOnLoss / 5000) * 100));
  const targetMarkPct = Math.round((3900 / 5000) * 100);

  // SVG RR Arc calculations
  const rrRadius = 56;
  const rrCirc = 2 * Math.PI * rrRadius;
  const rrOffset = rrCirc * (1 - Math.min(100, Math.max(0, valCurRr)) / 100);

  return (
    <div className="gs-studio-stack gs-val-protocol">
      <SpotlightPanel className="gs-hero-instrument gs-val-header">
        <div className="gs-cod-top-row">
          <div className="gs-studio-identity">
            <span className="gs-kicker-badge">
              <Target size={13} aria-hidden="true" />
              <span>VALORANT PROTOCOL // BUY &amp; RR TERMINAL</span>
            </span>
            <h2 className="gs-bench-heading">
              {valMode === 'buy' ? 'Round Buy Economy Matrix' : 'Ranked RR Climb Telemetry'}
            </h2>
          </div>

          <SegmentedSpringTabs
            ariaLabel="Valorant Studio Tabs"
            value={valMode}
            onChange={(next) => {
              playTick?.(soundEnabled, 690);
              setValMode(next);
            }}
            options={[
              { id: 'buy', label: 'Buy Matrix', icon: Shield },
              { id: 'rr', label: 'RR Climb Sim', icon: TrendingUp },
            ]}
          />
        </div>

        {valMode === 'buy' ? (
          <div className="gs-val-guarantee-panel" aria-live="polite">
            <div className="gs-mc-coord-hero">
              <div>
                <span className="mono gs-micro-label">
                  {!valResult.canAfford
                    ? `OVER BUDGET BY ${(valResult.totalBuy - valCreds).toLocaleString('en-US')} CREDS`
                    : 'NEXT ROUND MINIMUM IF LOST'}
                </span>
                <div
                  className={`gs-hero-big mono ${
                    !valResult.canAfford
                      ? 'gs-txt-coral'
                      : valResult.nextRoundReady
                        ? 'gs-txt-teal'
                        : 'gs-txt-gold'
                  }`}
                >
                  {!valResult.canAfford ? (
                    <>
                      Short <AnimatedValue value={valResult.totalBuy - valCreds} suffix=" Creds" />
                    </>
                  ) : (
                    <>
                      <AnimatedValue value={valResult.nextRoundMinOnLoss} suffix=" Creds" />
                    </>
                  )}
                </div>
              </div>

              <div className="gs-pill-cluster">
                <span
                  className={`gs-verdict-chip mono ${
                    !valResult.canAfford
                      ? 'lose'
                      : valResult.nextRoundReady
                        ? 'win'
                        : 'warn'
                  }`}
                >
                  {!valResult.canAfford
                    ? `Save floor: ${valResult.nextRoundMinOnLoss.toLocaleString('en-US')}`
                    : valResult.nextRoundReady
                      ? '3,900 Full Buy Locked'
                      : 'Short on Vandal + Heavy'}
                </span>
                <PinButton
                  label="Pin Buy"
                  onClick={() =>
                    onPinSnapshot(
                      `${valCreds} Creds Buy`,
                      `Spend ${valResult.totalBuy} | Left ${valResult.leftover} | Next Min ${valResult.nextRoundMinOnLoss}`
                    )
                  }
                />
              </div>
            </div>

            <div className="gs-val-cred-meter">
              <div className="gs-val-cred-track" aria-hidden="true">
                <div
                  className={`gs-val-cred-fill ${valResult.nextRoundReady ? 'ready' : 'warn'}`}
                  style={{ width: `${guaranteePct}%` }}
                />
                <span className="gs-val-3900-mark" style={{ left: `${targetMarkPct}%` }} />
              </div>
              <div className="gs-mc-y-labels mono">
                <span>Spend Now: {valResult.totalBuy.toLocaleString('en-US')}</span>
                <span>Leftover: {valResult.leftover.toLocaleString('en-US')}</span>
                <span>3,900 Guarantee</span>
                <span>Max Safe Spend: {valResult.maxSafeSpendNow.toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="gs-val-rr-hero" aria-live="polite">
            <svg viewBox="0 0 140 140" className="gs-rr-arc-svg" role="img" aria-label={`Current RR ${valCurRr} of 100`}>
              <circle
                cx="70"
                cy="70"
                r={rrRadius}
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="10"
              />
              <circle
                cx="70"
                cy="70"
                r={rrRadius}
                fill="none"
                stroke={game.accentColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={rrCirc}
                strokeDashoffset={rrOffset}
                transform="rotate(-90 70 70)"
                className="gs-ring-progress"
              />
              <text x="70" y="66" textAnchor="middle" className="gs-svg-big mono" fill="currentColor">
                {valCurRr}
              </text>
              <text x="70" y="84" textAnchor="middle" className="gs-svg-sub mono" fill="var(--ink-muted)">
                / 100 RR
              </text>
            </svg>
            <div className="gs-val-rr-copy">
              <span className="mono gs-micro-label">PROJECTED RANK-UP VELOCITY</span>
              <div className="gs-hero-big mono">
                {valRrResult.positiveClimb ? (
                  <>
                    ~<AnimatedValue value={valRrResult.matchesToPromote} suffix=" Matches" />
                  </>
                ) : (
                  'Flat / Negative EV'
                )}
              </div>
              <p className="gs-val-ev-note mono">
                Expected Value: {valRrResult.evPerMatch >= 0 ? '+' : ''}
                {valRrResult.evPerMatch} RR / match · Need {valRrResult.rrNeeded} RR to Promote
              </p>
            </div>
          </div>
        )}
      </SpotlightPanel>

      {valMode === 'buy' ? (
        <SpotlightPanel className="gs-work-card gs-val-buy-grid-card">
          <div className="gs-val-two-col">
            <div>
              <h3 className="mg-field-label">Select Weapon Buy</h3>
              <div className="gs-val-card-grid" role="group" aria-label="Valorant Weapons">
                {VAL_WEAPONS.map((w) => {
                  const selected = valWeaponCost === w.cost;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      aria-pressed={selected}
                      className={`gs-val-item-btn ${selected ? 'active' : ''}`}
                      onClick={() => {
                        playTick?.(soundEnabled, 740);
                        setValWeaponCost(w.cost);
                      }}
                    >
                      <strong>{w.name}</strong>
                      <span className="mono">{w.cost.toLocaleString('en-US')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mg-field-label">Armor &amp; Loss Streak</h3>
              <div className="gs-val-armor-grid" role="group" aria-label="Valorant Shield Tiers">
                {VAL_ARMOR.map((a) => {
                  const selected = valArmorCost === a.cost;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={selected}
                      className={`gs-val-item-btn ${selected ? 'active' : ''}`}
                      onClick={() => {
                        playTick?.(soundEnabled, 720);
                        setValArmorCost(a.cost);
                      }}
                    >
                      <strong>{a.name}</strong>
                      <span className="mono">{a.cost} Creds</span>
                    </button>
                  );
                })}
              </div>

              <div className="mg-field-grid two-col gs-val-num-row">
                <div className="mg-field">
                  <label htmlFor="val-creds">Current Credits</label>
                  <NumericField
                    id="val-creds"
                    min={0}
                    max={9000}
                    step={50}
                    fallback={0}
                    className="deck-input no-icon mono"
                    value={valCreds}
                    onCommit={setValCreds}
                  />
                </div>
                <div className="mg-field">
                  <label htmlFor="val-util">Ability Spend</label>
                  <NumericField
                    id="val-util"
                    min={0}
                    max={1200}
                    step={50}
                    fallback={0}
                    className="deck-input no-icon mono"
                    value={valUtilCost}
                    onCommit={setValUtilCost}
                  />
                </div>
              </div>

              <div className="filter-row gs-val-streak-row">
                {[
                  { streak: 0, label: '0 Losses (1,900)' },
                  { streak: 1, label: '1 Loss (2,400)' },
                  { streak: 2, label: '2+ Losses (2,900)' },
                ].map((opt) => (
                  <button
                    key={opt.streak}
                    type="button"
                    aria-pressed={valLossStreak === opt.streak}
                    className={`filter-pill ${valLossStreak === opt.streak ? 'active' : ''}`}
                    onClick={() => {
                      playTick?.(soundEnabled, 680);
                      setValLossStreak(opt.streak);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SpotlightPanel>
      ) : (
        <SpotlightPanel className="gs-work-card">
          <div className="mg-field-grid">
            <div className="mg-field">
              <label htmlFor="val-cur-rr">Current RR (0–99)</label>
              <NumericField
                id="val-cur-rr"
                min={0}
                max={99}
                fallback={0}
                className="deck-input no-icon mono"
                value={valCurRr}
                onCommit={setValCurRr}
              />
            </div>
            <div className="mg-field">
              <label htmlFor="val-wr">Win Rate %</label>
              <NumericField
                id="val-wr"
                min={1}
                max={99}
                fallback={50}
                className="deck-input no-icon mono"
                value={valWr}
                onCommit={setValWr}
              />
            </div>
            <div className="mg-field">
              <label htmlFor="val-wrr">Avg +RR Win / -RR Loss</label>
              <div className="gs-dual-inputs">
                <NumericField
                  id="val-wrr"
                  min={5}
                  max={50}
                  fallback={18}
                  aria-label="Avg win RR"
                  className="deck-input no-icon mono"
                  value={valWinRr}
                  onCommit={setValWinRr}
                />
                <NumericField
                  min={5}
                  max={50}
                  fallback={16}
                  aria-label="Avg loss RR"
                  className="deck-input no-icon mono"
                  value={valLossRr}
                  onCommit={setValLossRr}
                />
              </div>
            </div>
          </div>
        </SpotlightPanel>
      )}
    </div>
  );
}

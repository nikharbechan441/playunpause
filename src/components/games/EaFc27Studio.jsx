import React from 'react';
import { Trophy, Users, TrendingUp } from 'lucide-react';
import { clampNum, parseSafeNum } from '../../utils/gameMath.js';
import {
  AnimatedValue,
  SegmentedSpringTabs,
  SpotlightPanel,
} from '../../utils/motionPrimitives.jsx';
import { NumericField, PinButton } from './GameStudioDock.jsx';

const PITCH_POSITIONS = [
  // Row 0: Attackers
  { idx: 0, pos: 'LW', row: 'atk' },
  { idx: 1, pos: 'ST', row: 'atk' },
  { idx: 2, pos: 'RW', row: 'atk' },
  // Row 1: Midfield
  { idx: 3, pos: 'LCM', row: 'mid' },
  { idx: 4, pos: 'CAM', row: 'mid' },
  { idx: 5, pos: 'RCM', row: 'mid' },
  // Row 2: Defense
  { idx: 6, pos: 'LB', row: 'def' },
  { idx: 7, pos: 'LCB', row: 'def' },
  { idx: 8, pos: 'RCB', row: 'def' },
  { idx: 9, pos: 'RB', row: 'def' },
  // Row 3: GK
  { idx: 10, pos: 'GK', row: 'gk' },
];

const QUICK_TIERS = [
  { label: '50K Card', buy: 46000, sell: 53000 },
  { label: '100K Meta', buy: 92000, sell: 105000 },
  { label: '250K Icon', buy: 225000, sell: 255000 },
  { label: '500K Promo', buy: 460000, sell: 525000 },
];

export default function EaFc27Studio({
  game,
  soundEnabled,
  playTick,
  onPinSnapshot,
  eaBuyCoins,
  setEaBuyCoins,
  eaSellCoins,
  setEaSellCoins,
  eaQty,
  setEaQty,
  sbcRatings,
  setSbcRatings,
  eaTaxResult,
  eaSbcResult,
  fcTab,
  setFcTab,
}) {
  const safeBuyCoins = clampNum(Math.round(parseSafeNum(eaBuyCoins, 0)), 0, 15000000);
  const safeSellCoins = clampNum(Math.round(parseSafeNum(eaSellCoins, 0)), 0, 15000000);
  const grossSell = Math.max(1, safeSellCoins);
  const costPct = Math.min(100, Math.round((safeBuyCoins / grossSell) * 100));
  const taxPct = Math.min(100 - costPct, Math.round((eaTaxResult.taxPerCard / grossSell) * 100));
  const profitPct = Math.max(0, 100 - costPct - taxPct);

  const applySbcTemplate = (template) => {
    playTick?.(soundEnabled, 740);
    setSbcRatings(template);
  };

  return (
    <div className="gs-studio-stack gs-fc-pitch-suite">
      <SpotlightPanel className="gs-hero-instrument gs-fc-header">
        <div className="gs-cod-top-row">
          <div className="gs-studio-identity">
            <span className="gs-kicker-badge">
              <Trophy size={13} aria-hidden="true" />
              <span>ULTIMATE TEAM TRANSFER &amp; PITCH LAB</span>
            </span>
            <h2 className="gs-bench-heading">
              {fcTab === 'tax'
                ? '5% EA Transfer Tax & Price-Step Sniping'
                : '4-3-3 Formation 11-Player SBC Solver'}
            </h2>
          </div>

          <SegmentedSpringTabs
            ariaLabel="EA FC 27 Tools"
            value={fcTab}
            onChange={(next) => {
              playTick?.(soundEnabled, 690);
              setFcTab(next);
            }}
            options={[
              { id: 'tax', label: '5% Tax Flipper', icon: TrendingUp },
              { id: 'sbc', label: '4-3-3 SBC Pitch', icon: Users },
            ]}
          />
        </div>

        {fcTab === 'tax' ? (
          <div className="gs-mc-coord-hero" aria-live="polite">
            <div>
              <span className="mono gs-micro-label">
                NET PROFIT ({eaQty}x CARDS AFTER 5% TAX)
              </span>
              <div
                className={`gs-hero-big mono ${
                  eaTaxResult.totalProfit >= 0 ? 'gs-txt-teal' : 'gs-txt-coral'
                }`}
              >
                {eaTaxResult.totalProfit >= 0 ? '+' : ''}
                <AnimatedValue value={eaTaxResult.totalProfit} suffix=" Coins" /> (
                {eaTaxResult.roiPct}%)
              </div>
            </div>
            <div className="gs-pill-cluster">
              <span className="gs-verdict-chip mono">
                Min Legal Sell: <AnimatedValue value={eaTaxResult.minBreakEvenSnapped} />
              </span>
              <PinButton
                label="Pin Flip"
                onClick={() =>
                  onPinSnapshot(
                    `Buy ${Number(eaBuyCoins).toLocaleString('en-US')}`,
                    `Min Sell ${eaTaxResult.minBreakEvenSnapped.toLocaleString('en-US')} | Batch Profit ${eaTaxResult.totalProfit.toLocaleString('en-US')}`
                  )
                }
              />
            </div>
          </div>
        ) : (
          <div className="gs-mc-coord-hero" aria-live="polite">
            <div>
              <span className="mono gs-micro-label">EXACT EXCESS-RULE SQUAD RATING</span>
              <div className="gs-hero-big mono gs-txt-teal">
                <AnimatedValue value={eaSbcResult.rating} suffix=" OVR" />{' '}
                <span className="gs-fc-excess-note">
                  (Float {eaSbcResult.exactFloat} · Mean {eaSbcResult.avgFloat})
                </span>
              </div>
            </div>
            <PinButton
              label="Pin Squad"
              onClick={() =>
                onPinSnapshot(
                  `SBC ${eaSbcResult.rating} OVR`,
                  `Float ${eaSbcResult.exactFloat} · [${sbcRatings.join(', ')}]`
                )
              }
            />
          </div>
        )}
      </SpotlightPanel>

      {fcTab === 'tax' ? (
        <SpotlightPanel className="gs-work-card gs-fc-tax-card">
          <div className="filter-row">
            {QUICK_TIERS.map((tier) => (
              <button
                key={tier.label}
                type="button"
                className="filter-pill"
                onClick={() => {
                  playTick?.(soundEnabled, 740);
                  setEaBuyCoins(tier.buy);
                  setEaSellCoins(tier.sell);
                }}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* 3-Segment Coin Split Bar */}
          <div className="gs-fc-coin-split">
            <div className="gs-fc-split-bar" aria-hidden="true">
              <span className="gs-split-cost" style={{ width: `${costPct}%` }} />
              <span className="gs-split-tax" style={{ width: `${taxPct}%` }} />
              <span className="gs-split-net" style={{ width: `${profitPct}%` }} />
            </div>
            <div className="gs-mc-y-labels mono">
              <span>Buy Principal: {safeBuyCoins.toLocaleString('en-US')}</span>
              <span>5% EA Tax Burn: -{eaTaxResult.taxPerCard.toLocaleString('en-US')}</span>
              <span>
                Net/Card: {eaTaxResult.profitPerCard >= 0 ? '+' : ''}
                {eaTaxResult.profitPerCard.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          <div className="mg-field-grid">
            <div className="mg-field">
              <label htmlFor="ea-buy">Buy Price (Coins)</label>
              <NumericField
                id="ea-buy"
                min={150}
                max={15000000}
                step={500}
                fallback={185000}
                className="deck-input no-icon mono"
                value={eaBuyCoins}
                onCommit={setEaBuyCoins}
              />
            </div>
            <div className="mg-field">
              <label htmlFor="ea-sell">Planned List Price</label>
              <NumericField
                id="ea-sell"
                min={200}
                max={15000000}
                step={500}
                fallback={215000}
                className="deck-input no-icon mono"
                value={eaSellCoins}
                onCommit={setEaSellCoins}
              />
            </div>
            <div className="mg-field">
              <label htmlFor="ea-qty">Batch Qty</label>
              <div className="stepper-input-row">
                <button
                  type="button"
                  className="calc-stepper-btn"
                  aria-label="Decrease batch quantity"
                  onClick={() => setEaQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <NumericField
                  id="ea-qty"
                  min={1}
                  max={100}
                  fallback={1}
                  className="deck-input no-icon mono"
                  value={eaQty}
                  onCommit={setEaQty}
                />
                <button
                  type="button"
                  className="calc-stepper-btn"
                  aria-label="Increase batch quantity"
                  onClick={() => setEaQty((q) => Math.min(100, q + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="mg-stat-mini-grid">
            <div className="mg-stat-mini">
              <span>EA 5% Tax / Card</span>
              <strong>-<AnimatedValue value={eaTaxResult.taxPerCard} /></strong>
            </div>
            <div className="mg-stat-mini">
              <span>Max Safe Snipe Bid</span>
              <strong><AnimatedValue value={eaTaxResult.maxSafeBuyGivenSell} /></strong>
            </div>
            <div className="mg-stat-mini">
              <span>Exact Floor (Pre-Snap)</span>
              <strong><AnimatedValue value={eaTaxResult.minBreakEvenExact} /></strong>
            </div>
          </div>
        </SpotlightPanel>
      ) : (
        <SpotlightPanel className="gs-work-card gs-fc-pitch-card">
          <div className="filter-row">
            <button
              type="button"
              className="filter-pill"
              onClick={() => applySbcTemplate([85, 85, 85, 85, 85, 85, 85, 85, 85, 84, 84])}
            >
              85 OVR Formula (9×85 + 2×84)
            </button>
            <button
              type="button"
              className="filter-pill"
              onClick={() => applySbcTemplate([87, 87, 86, 86, 86, 85, 85, 85, 85, 85, 85])}
            >
              86 OVR Formula (2×87 + 3×86 + 6×85)
            </button>
            <button
              type="button"
              className="filter-pill"
              onClick={() => applySbcTemplate([89, 88, 88, 88, 87, 87, 86, 86, 86, 86, 86])}
            >
              87 OVR Meta
            </button>
          </div>

          {/* 4-3-3 INTERACTIVE FOOTBALL PITCH */}
          <div className="gs-fc-pitch-board" aria-label="4-3-3 SBC Pitch Formation">
            {['atk', 'mid', 'def', 'gk'].map((rowName) => (
              <div key={rowName} className={`gs-fc-pitch-row row-${rowName}`}>
                {PITCH_POSITIONS.filter((p) => p.row === rowName).map(({ idx, pos }) => {
                  const val = sbcRatings[idx] ?? 84;
                  const cardTier = val >= 88 ? 'special' : val >= 83 ? 'gold' : 'silver';
                  return (
                    <div key={idx} className={`gs-fut-card ${cardTier}`}>
                      <label htmlFor={`sbc-slot-${idx}`} className="gs-fut-pos mono">
                        {pos} · #{idx + 1}
                      </label>
                      <NumericField
                        id={`sbc-slot-${idx}`}
                        min={45}
                        max={99}
                        fallback={val}
                        className="deck-input no-icon mono gs-fut-input"
                        value={val}
                        onCommit={(v) =>
                          setSbcRatings((prev) => prev.map((r, i) => (i === idx ? v : r)))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </SpotlightPanel>
      )}
    </div>
  );
}

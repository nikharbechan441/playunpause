import React from 'react';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { ROBLOX_RATES, clampNum, parseSafeNum } from '../../utils/gameMath.js';
import { AnimatedValue, SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { NumericField, PinButton } from './GameStudioDock.jsx';

const formatUsd = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function RobloxStudio({
  soundEnabled,
  playTick,
  onPinSnapshot,
  rbxGross,
  setRbxGross,
  rbxRateId,
  setRbxRateId,
  rbxGroupSplit,
  setRbxGroupSplit,
  rbxDesiredNet,
  setRbxDesiredNet,
  rbxResult,
  reverseGamepassPrice,
}) {
  const safeGross = rbxResult.gross;
  const safeSplit = clampNum(Math.round(parseSafeNum(rbxGroupSplit, 100)), 1, 100);
  const safeDesiredNet = clampNum(Math.round(parseSafeNum(rbxDesiredNet, 30000)), 1, 15000000);
  const gatePct = Math.min(100, Math.round((rbxResult.creatorNetRobux / 30000) * 100));
  const afterFeePct = safeGross > 0 ? Math.round((rbxResult.afterMarketFee / safeGross) * 100) : 70;
  const creatorKeepPct =
    safeGross > 0 ? Math.round((rbxResult.creatorNetRobux / safeGross) * 100) : Math.round(70 * (safeSplit / 100));

  return (
    <div className="gs-studio-stack gs-rbx-studio">
      {/* DEVEX 30K GATE & CASHOUT HERO */}
      <SpotlightPanel className="gs-hero-instrument gs-rbx-banner">
        <div className="gs-cod-top-row">
          <div className="gs-studio-identity">
            <span className="gs-kicker-badge">
              <Sparkles size={13} aria-hidden="true" />
              <span>ROBLOX CREATOR STUDIO // DEVEX CASHOUT PIPELINE</span>
            </span>
            <h2 className="gs-bench-heading">
              {rbxResult.eligible
                ? `$${formatUsd(rbxResult.usdPayout)} USD DevEx Payout`
                : `Need +${rbxResult.shortfallForMin.toLocaleString('en-US')} Earned R$ for DevEx`}
            </h2>
          </div>

          <PinButton
            label="Pin Target"
            onClick={() =>
              onPinSnapshot(
                `${safeGross.toLocaleString('en-US')} R$ Gross`,
                rbxResult.eligible
                  ? `$${formatUsd(rbxResult.usdPayout)} USD (${rbxResult.creatorNetRobux.toLocaleString('en-US')} Net R$)`
                  : `Locked (${rbxResult.shortfallForMin.toLocaleString('en-US')} R$ short of 30K)`
              )
            }
          />
        </div>

        <div className="gs-mc-coord-hero" aria-live="polite">
          <div>
            <span className="mono gs-micro-label">
              {rbxResult.eligible
                ? 'ELIGIBLE 30,000+ EARNED ROBUX CASHOUT'
                : '30,000 EARNED ROBUX MINIMUM GATE PROGRESS'}
            </span>
            <div
              className={`gs-hero-big mono ${
                rbxResult.eligible ? 'gs-txt-teal' : 'gs-txt-gold'
              }`}
            >
              $<AnimatedValue value={rbxResult.usdPayout} format={formatUsd} suffix=" USD" />
            </div>
          </div>
          <div className="gs-pill-cluster">
            <span className={`gs-verdict-chip mono ${rbxResult.eligible ? 'win' : 'warn'}`}>
              Net Earned: <AnimatedValue value={rbxResult.creatorNetRobux} suffix=" R$" /> ({gatePct}% of 30K)
            </span>
          </div>
        </div>

        {/* 30,000 R$ Gate Meter */}
        <div className="gs-rbx-gate-meter">
          <div className="gs-rbx-gate-track" aria-hidden="true">
            <div
              className={`gs-rbx-gate-fill ${rbxResult.eligible ? 'eligible' : 'locked'}`}
              style={{ width: `${gatePct}%` }}
            />
          </div>
          {!rbxResult.eligible && (
            <div className="gs-rbx-gate-warn">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>
                Requires <strong>30,000 net earned R$</strong> to unlock Tipalti DevEx transfer (
                <strong>{rbxResult.shortfallForMin.toLocaleString('en-US')} R$ remaining</strong>).
              </span>
            </div>
          )}
        </div>
      </SpotlightPanel>

      {/* 4-STAGE WATERFALL PIPELINE */}
      <SpotlightPanel className="gs-work-card gs-rbx-waterfall-card">
        <div className="gs-rbx-waterfall" aria-label="Robux to USD deduction waterfall">
          <div className="gs-wf-stage">
            <span className="mono gs-micro-label">1. GROSS SALES</span>
            <strong className="mono">
              <AnimatedValue value={safeGross} suffix=" R$" />
            </strong>
            <div className="gs-wf-bar">
              <span style={{ width: '100%' }} />
            </div>
          </div>
          <ArrowRight size={15} className="gs-wf-arrow" aria-hidden="true" />
          <div className="gs-wf-stage">
            <span className="mono gs-micro-label">2. AFTER 30% FEE</span>
            <strong className="mono">
              <AnimatedValue value={rbxResult.afterMarketFee} suffix=" R$" />
            </strong>
            <div className="gs-wf-bar">
              <span style={{ width: `${afterFeePct}%` }} />
            </div>
          </div>
          <ArrowRight size={15} className="gs-wf-arrow" aria-hidden="true" />
          <div className="gs-wf-stage">
            <span className="mono gs-micro-label">3. GROUP ({safeSplit}%)</span>
            <strong className="mono">
              <AnimatedValue value={rbxResult.creatorNetRobux} suffix=" R$" />
            </strong>
            <div className="gs-wf-bar">
              <span style={{ width: `${creatorKeepPct}%` }} />
            </div>
          </div>
          <ArrowRight size={15} className="gs-wf-arrow" aria-hidden="true" />
          <div className="gs-wf-stage payout">
            <span className="mono gs-micro-label">4. USD VALUE</span>
            <strong className="mono gs-txt-teal">
              $<AnimatedValue value={rbxResult.usdPayout} format={formatUsd} />
            </strong>
            <span className="mono gs-wf-rate">${rbxResult.rate} / R$</span>
          </div>
        </div>

        {/* Rate Tier Selector Pills */}
        <div className="filter-row" role="group" aria-label="DevEx tier rate">
          {ROBLOX_RATES.map((rate) => {
            const active = rbxRateId === rate.id;
            return (
              <button
                key={rate.id}
                type="button"
                aria-pressed={active}
                className={`filter-pill ${active ? 'active' : ''}`}
                onClick={() => {
                  playTick?.(soundEnabled, 720);
                  setRbxRateId(rate.id);
                }}
              >
                {rate.label}
              </button>
            );
          })}
        </div>

        <div className="mg-field-grid">
          <div className="mg-field">
            <label htmlFor="rbx-gross">Gross Gamepass Sales (R$)</label>
            <NumericField
              id="rbx-gross"
              min={0}
              max={50000000}
              step={5000}
              fallback={0}
              className="deck-input no-icon mono"
              value={rbxGross}
              onCommit={setRbxGross}
            />
          </div>
          <div className="mg-field">
            <label htmlFor="rbx-split">Your Group Share (%)</label>
            <NumericField
              id="rbx-split"
              min={1}
              max={100}
              fallback={100}
              emptyFallback={100}
              className="deck-input no-icon mono"
              value={rbxGroupSplit}
              onCommit={setRbxGroupSplit}
            />
          </div>
          <div className="mg-field">
            <label htmlFor="rbx-target">Reverse Net Goal (R$)</label>
            <NumericField
              id="rbx-target"
              min={1}
              max={15000000}
              step={1000}
              fallback={30000}
              className="deck-input no-icon mono"
              value={rbxDesiredNet}
              onCommit={setRbxDesiredNet}
            />
          </div>
        </div>

        {/* Creator Store Price Tag Card */}
        <div className="gs-rbx-pass-tag">
          <div>
            <span className="mono gs-micro-label">CREATOR STORE GAMEPASS STICKER PRICE</span>
            <p className="gs-rbx-tag-sub">
              To pocket <strong>{safeDesiredNet.toLocaleString('en-US')} R$</strong> after
              30% Marketplace cut &amp; {safeSplit}% group split:
            </p>
          </div>
          <div className="gs-rbx-price-badge mono">
            List At: <AnimatedValue value={reverseGamepassPrice} suffix=" R$" />
          </div>
        </div>

        <p className="gs-rbx-legal-note">
          Informational estimate only — not financial advice or a payout guarantee. Actual DevEx
          rates, tax withholding, and 13+ eligibility are governed solely by Roblox Corp. Zero data
          is collected on minors.
        </p>
      </SpotlightPanel>
    </div>
  );
}

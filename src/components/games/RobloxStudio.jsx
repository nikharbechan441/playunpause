import React, { useState } from 'react';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import {
  ROBLOX_RATES,
  ROBLOX_WITHHOLDING_TIERS,
  clampNum,
  parseSafeNum,
} from '../../utils/gameMath.js';
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
  rbxMode = 'net',
  setRbxMode = null,
  rbxWithholdingPct = 0,
  setRbxWithholdingPct = null,
  rbxPaypalFee = false,
  setRbxPaypalFee = null,
  rbxResult,
  reverseGamepassPrice,
}) {
  const [showDeductions, setShowDeductions] = useState(
    () => Boolean(rbxWithholdingPct > 0 || rbxPaypalFee)
  );
  const isNetMode = rbxMode === 'net';
  const hasDeductionsActive =
    showDeductions || rbxResult.withholdingPct > 0 || rbxResult.includePaypalFee;
  const displayUsd = hasDeductionsActive ? rbxResult.netPayoutUsd : rbxResult.usdPayout;
  const safeGross = rbxResult.gross;
  const safeSplit = clampNum(Math.round(parseSafeNum(rbxGroupSplit, 100)), 1, 100);
  const safeDesiredNet = clampNum(Math.round(parseSafeNum(rbxDesiredNet, 30000)), 1, 15000000);
  const gatePct = Math.min(100, Math.round((rbxResult.creatorNetRobux / 30000) * 100));
  const afterFeePct = safeGross > 0 ? Math.round((rbxResult.afterMarketFee / safeGross) * 100) : isNetMode ? 100 : 70;
  const creatorKeepPct =
    safeGross > 0
      ? Math.round((rbxResult.creatorNetRobux / safeGross) * 100)
      : isNetMode
        ? 100
        : Math.round(70 * (safeSplit / 100));

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
                ? `$${formatUsd(displayUsd)} USD DevEx Payout`
                : `Need +${rbxResult.shortfallForMin.toLocaleString('en-US')} Earned R$ for DevEx`}
            </h2>
          </div>

          <PinButton
            label="Pin Target"
            onClick={() =>
              onPinSnapshot(
                `${safeGross.toLocaleString('en-US')} R$ ${isNetMode ? 'Earned' : 'Gross'}`,
                rbxResult.eligible
                  ? `$${formatUsd(displayUsd)} USD (${rbxResult.creatorNetRobux.toLocaleString('en-US')} Net R$)`
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
              $<AnimatedValue value={displayUsd} format={formatUsd} suffix=" USD" />
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
            <span className="mono gs-micro-label">{isNetMode ? '1. EARNED BALANCE' : '1. GROSS SALES'}</span>
            <strong className="mono">
              <AnimatedValue value={safeGross} suffix=" R$" />
            </strong>
            <div className="gs-wf-bar">
              <span style={{ width: '100%' }} />
            </div>
          </div>
          <ArrowRight size={15} className="gs-wf-arrow" aria-hidden="true" />
          <div className="gs-wf-stage">
            <span className="mono gs-micro-label">{isNetMode ? '2. NO 30% CUT (NET)' : '2. AFTER 30% FEE'}</span>
            <strong className="mono">
              <AnimatedValue value={rbxResult.afterMarketFee} suffix=" R$" />
            </strong>
            <div className="gs-wf-bar">
              <span style={{ width: `${afterFeePct}%` }} />
            </div>
          </div>
          <ArrowRight size={15} className="gs-wf-arrow" aria-hidden="true" />
          <div className="gs-wf-stage">
            <span className="mono gs-micro-label">
              {isNetMode ? '3. DEVEX BALANCE (100%)' : `3. GROUP (${safeSplit}%)`}
            </span>
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
              $<AnimatedValue value={displayUsd} format={formatUsd} />
            </strong>
            <span className="mono gs-wf-rate">${rbxResult.rate} / R$</span>
          </div>
        </div>

        {/* Input Mode Switch */}
        {typeof setRbxMode === 'function' && (
          <div className="filter-row" role="group" aria-label="Robux input mode">
            <button
              type="button"
              aria-pressed={isNetMode}
              className={`filter-pill ${isNetMode ? 'active' : ''}`}
              onClick={() => {
                playTick?.(soundEnabled, 720);
                setRbxMode('net');
              }}
            >
              Already Earned Robux
            </button>
            <button
              type="button"
              aria-pressed={!isNetMode}
              className={`filter-pill ${!isNetMode ? 'active' : ''}`}
              onClick={() => {
                playTick?.(soundEnabled, 700);
                setRbxMode('gross');
              }}
            >
              Gross Player Spend (-30% cut)
            </button>
          </div>
        )}

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
            <label htmlFor="rbx-gross">
              {isNetMode ? 'Net Earned Robux (R$)' : 'Gross Gamepass Sales (R$)'}
            </label>
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

        {/* Optional 2026 Payout Deductions (Default OFF) */}
        {typeof setRbxWithholdingPct === 'function' && typeof setRbxPaypalFee === 'function' && (
          <div className="rbx-deductions-panel">
            <div className="cheat-controls-row" style={{ marginBottom: showDeductions ? '10px' : 0 }}>
              <button
                type="button"
                aria-expanded={showDeductions}
                className={`subtle-pill-btn ${hasDeductionsActive ? 'challenge-done' : ''}`}
                onClick={() => {
                  playTick?.(soundEnabled, 700);
                  if (showDeductions) {
                    setShowDeductions(false);
                    setRbxWithholdingPct(0);
                    setRbxPaypalFee(false);
                  } else {
                    setShowDeductions(true);
                  }
                }}
              >
                <span>
                  {showDeductions
                    ? 'Optional Payout Deductions: Shown (Tap to Reset OFF)'
                    : 'Optional Payout Deductions (Nov 2026 Withholding / PayPal Fee — OFF)'}
                </span>
              </button>
            </div>

            {showDeductions && (
              <div className="rbx-deductions-body">
                <div className="mono gs-micro-label" style={{ marginBottom: '6px' }}>
                  NOV 1, 2026 ROYALTY WITHHOLDING TIER
                </div>
                <div className="filter-row" role="group" aria-label="Nov 1, 2026 Royalty Withholding">
                  {ROBLOX_WITHHOLDING_TIERS.map((pct) => {
                    const active = rbxWithholdingPct === pct;
                    const label = pct === 24 ? '24% Backup' : `${pct}%`;
                    return (
                      <button
                        key={pct}
                        type="button"
                        aria-pressed={active}
                        className={`filter-pill ${active ? 'active' : ''}`}
                        onClick={() => {
                          playTick?.(soundEnabled, 720);
                          setRbxWithholdingPct(pct);
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={Boolean(rbxPaypalFee)}
                    className={`filter-pill ${rbxPaypalFee ? 'active' : ''}`}
                    onClick={() => {
                      playTick?.(soundEnabled, 740);
                      setRbxPaypalFee((v) => !v);
                    }}
                  >
                    PayPal Fee (min($21, $1 + 2%)) {rbxPaypalFee ? '(On)' : '(Off)'}
                  </button>
                </div>

                <div className="rbx-deductions-breakdown mono">
                  <span>Gross DevEx: ${formatUsd(rbxResult.grossUsd)}</span>
                  <span>Withholding ({rbxResult.withholdingPct}%): -${formatUsd(rbxResult.withholdingUsd)}</span>
                  <span>PayPal Fee: -${formatUsd(rbxResult.paypalFeeUsd)}</span>
                  <strong className="gs-txt-teal">Est. Net Payout: ${formatUsd(rbxResult.netPayoutUsd)}</strong>
                </div>
              </div>
            )}
          </div>
        )}

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

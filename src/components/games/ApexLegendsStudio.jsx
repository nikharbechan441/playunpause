import React from 'react';
import { Flame, Award } from 'lucide-react';
import { APEX_RANK_TIERS, clampNum, parseSafeNum } from '../../utils/gameMath.js';
import {
  AnimatedValue,
  SegmentedSpringTabs,
  SpotlightPanel,
} from '../../utils/motionPrimitives.jsx';
import { NumericField, PinButton } from './GameStudioDock.jsx';

export default function ApexLegendsStudio({
  game,
  soundEnabled,
  playTick,
  onPinSnapshot,
  apexLevel,
  setApexLevel,
  apexPrestige,
  setApexPrestige,
  apexBpPacks,
  setApexBpPacks,
  apexPurchasedPacks,
  setApexPurchasedPacks,
  apexCurRp,
  setApexCurRp,
  apexTargetTier,
  setApexTargetTier,
  apexAvgRp,
  setApexAvgRp,
  apexLevelPacks,
  apexTotalOpened,
  apexRemaining,
  apexLifetimePacks,
  apexRpResult,
  apexMode,
  setApexMode,
}) {
  // 500-Pack Multi-Segment Radial Reactor Ring
  const r = 74;
  const circ = 2 * Math.PI * r;
  const freeSeg = clampNum(apexLevelPacks, 0, 500);
  const safeBp = clampNum(Math.round(parseSafeNum(apexBpPacks, 0)), 0, 300);
  const safeBought = clampNum(Math.round(parseSafeNum(apexPurchasedPacks, 0)), 0, 500);
  const totalLifetime = apexLifetimePacks ?? (apexLevelPacks + safeBp + safeBought);
  const bpSeg = Math.max(0, Math.min(Math.max(0, 500 - freeSeg), safeBp));
  const boughtSeg = Math.max(0, Math.min(Math.max(0, 500 - freeSeg - bpSeg), safeBought));

  const freeLen = (freeSeg / 500) * circ;
  const bpLen = (bpSeg / 500) * circ;
  const boughtLen = (boughtSeg / 500) * circ;
  const pctTotal = Math.round((clampNum(apexTotalOpened, 0, 500) / 500) * 100);

  return (
    <div className="gs-studio-stack gs-apex-lab">
      <SpotlightPanel className="gs-hero-instrument gs-apex-header">
        <div className="gs-cod-top-row">
          <div className="gs-studio-identity">
            <span className="gs-kicker-badge">
              <Flame size={13} aria-hidden="true" />
              <span>APEX GAMES // HEIRLOOM REACTOR &amp; RANKED RP</span>
            </span>
            <h2 className="gs-bench-heading">
              {apexMode === 'pity'
                ? '500-Pack Heirloom Shard Pity Reactor'
                : 'Ranked RP Tier Climb Planner'}
            </h2>
          </div>

          <SegmentedSpringTabs
            ariaLabel="Apex Legends Modules"
            value={apexMode}
            onChange={(next) => {
              playTick?.(soundEnabled, 690);
              setApexMode(next);
            }}
            options={[
              { id: 'pity', label: '500-Pack Pity', icon: Flame },
              { id: 'ranked', label: 'Ranked RP', icon: Award },
            ]}
          />
        </div>

        <div className="gs-apex-hero-layout" aria-live="polite">
          {/* Animated SVG Reactor Ring */}
          <svg
            viewBox="0 0 180 180"
            className="gs-apex-ring-svg"
            role="img"
            aria-label={`${apexTotalOpened} of 500 Apex Packs opened toward Heirloom guarantee`}
          >
            <circle cx="90" cy="90" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="14" />
            {/* Free Level Packs Segment */}
            <circle
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke="#2CE5B5"
              strokeWidth="14"
              strokeDasharray={`${freeLen} ${circ}`}
              transform="rotate(-90 90 90)"
              className="gs-ring-progress"
            />
            {/* Battle Pass Packs Segment */}
            <circle
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="14"
              strokeDasharray={`${bpLen} ${circ}`}
              strokeDashoffset={-freeLen}
              transform="rotate(-90 90 90)"
              className="gs-ring-progress"
            />
            {/* Purchased Packs Segment */}
            <circle
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={game.accentColor}
              strokeWidth="14"
              strokeDasharray={`${boughtLen} ${circ}`}
              strokeDashoffset={-(freeLen + bpLen)}
              transform="rotate(-90 90 90)"
              className="gs-ring-progress"
            />
            <text x="90" y="84" textAnchor="middle" className="gs-svg-big mono" fill="currentColor">
              {pctTotal}%
            </text>
            <text x="90" y="104" textAnchor="middle" className="gs-svg-sub mono" fill="var(--ink-muted)">
              {apexTotalOpened}/500
            </text>
          </svg>

          <div className="gs-apex-hero-meta">
            <span className="mono gs-micro-label">GUARANTEED 150 HEIRLOOM SHARDS STATUS</span>
            <div className="gs-hero-big mono">
              {apexRemaining === 0 ? (
                <span className="gs-txt-teal">
                  {totalLifetime > 500
                    ? `500/500 Pity Cap (${totalLifetime} Lifetime)`
                    : 'HEIRLOOM GUARANTEED!'}
                </span>
              ) : (
                <>
                  <AnimatedValue value={apexRemaining} suffix=" Packs Remaining" />
                </>
              )}
            </div>

            <div className="gs-apex-legend mono">
              <span className="gs-apx-dot free">Level/Prestige: {apexLevelPacks}</span>
              <span className="gs-apx-dot bp">BP/Quests: {safeBp}</span>
              <span className="gs-apx-dot bought">Purchased: {safeBought}</span>
            </div>

            <PinButton
              label="Pin Pity"
              onClick={() =>
                onPinSnapshot(
                  `Prestige ${apexPrestige} · Lv ${apexLevel}`,
                  `${apexTotalOpened}/500 Opened (${apexRemaining} to Shards)`
                )
              }
            />
          </div>
        </div>
      </SpotlightPanel>

      {apexMode === 'pity' ? (
        <SpotlightPanel className="gs-work-card">
          <h3 className="mg-field-label">Select Account Prestige Tier (0–3)</h3>
          <div className="filter-row" role="group" aria-label="Account Prestige Tier">
            {[
              { tier: 0, label: 'Tier 0 (Lv 1–500)', sub: 'Max 199 free' },
              { tier: 1, label: 'Prestige 1 (501–1000)', sub: '+115 packs' },
              { tier: 2, label: 'Prestige 2 (1001–1500)', sub: '+115 packs' },
              { tier: 3, label: 'Prestige 3 (1501–2000)', sub: '544 Cumulative' },
            ].map((item) => {
              const active = apexPrestige === item.tier;
              return (
                <button
                  key={item.tier}
                  type="button"
                  aria-pressed={active}
                  className={`filter-pill ${active ? 'active' : ''}`}
                  onClick={() => {
                    playTick?.(soundEnabled, 740);
                    setApexPrestige(item.tier);
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mg-field-grid">
            <div className="mg-field">
              <label htmlFor="apx-lvl">Level Within Tier (1–500)</label>
              <NumericField
                id="apx-lvl"
                min={1}
                max={500}
                fallback={1}
                className="deck-input no-icon mono"
                value={apexLevel}
                onCommit={setApexLevel}
              />
            </div>
            <div className="mg-field">
              <label htmlFor="apx-bp">Battle Pass + Quest Packs</label>
              <NumericField
                id="apx-bp"
                min={0}
                max={300}
                fallback={0}
                className="deck-input no-icon mono"
                value={apexBpPacks}
                onCommit={setApexBpPacks}
              />
            </div>
            <div className="mg-field">
              <label htmlFor="apx-buy">Purchased Store Packs</label>
              <NumericField
                id="apx-buy"
                min={0}
                max={500}
                fallback={0}
                className="deck-input no-icon mono"
                value={apexPurchasedPacks}
                onCommit={setApexPurchasedPacks}
              />
            </div>
          </div>
        </SpotlightPanel>
      ) : (
        <SpotlightPanel className="gs-work-card">
          <div className="gs-card-topbar">
            <h3 className="mg-subcard-title">Ranked RP Tier Climb Track</h3>
            <span className="district-pill mono">
              {apexRpResult.alreadyReached
                ? 'Target Reached'
                : apexRpResult.matchesNeeded !== null
                  ? `~${apexRpResult.matchesNeeded} Matches (${apexRpResult.rpGap.toLocaleString('en-US')} RP Gap)`
                  : 'Need Positive Avg Net RP'}
            </span>
          </div>

          <div className="gs-apex-tier-ladder" role="group" aria-label="Target Ranked Tier">
            {APEX_RANK_TIERS.map((tier) => {
              const isTarget = apexTargetTier === tier.id;
              const passed = apexCurRp >= tier.thresholdRp;
              return (
                <button
                  key={tier.id}
                  type="button"
                  aria-pressed={isTarget}
                  className={`gs-apex-tier-btn ${isTarget ? 'active' : ''} ${passed ? 'passed' : ''}`}
                  onClick={() => {
                    playTick?.(soundEnabled, 720);
                    setApexTargetTier(tier.id);
                  }}
                >
                  <strong>{tier.name}</strong>
                  <span className="mono">{(tier.thresholdRp / 1000).toFixed(0)}K RP</span>
                  <small className="mono">-{tier.entryCost} Entry</small>
                </button>
              );
            })}
          </div>

          <div className="mg-field-grid">
            <div className="mg-field">
              <label htmlFor="apx-rp">Current Ranked RP</label>
              <NumericField
                id="apx-rp"
                min={0}
                max={40000}
                step={200}
                fallback={0}
                className="deck-input no-icon mono"
                value={apexCurRp}
                onCommit={setApexCurRp}
              />
            </div>
            <div className="mg-field">
              <label htmlFor="apx-avg">Avg Net RP / Match</label>
              <NumericField
                id="apx-avg"
                min={-100}
                max={400}
                step={5}
                fallback={0}
                className="deck-input no-icon mono"
                value={apexAvgRp}
                onCommit={setApexAvgRp}
              />
            </div>
          </div>
        </SpotlightPanel>
      )}
    </div>
  );
}

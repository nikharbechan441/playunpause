import React from 'react';
import { Crosshair, ArrowLeftRight, Shield, Award } from 'lucide-react';
import { COD_MW4_WEAPONS } from '../../data/games/allGames.js';
import {
  AnimatedValue,
  SegmentedSpringTabs,
  SpotlightPanel,
} from '../../utils/motionPrimitives.jsx';
import { NumericField, PinButton } from './GameStudioDock.jsx';

const PLATE_PRESETS = [
  { hp: 300, plates: 3, label: '3 Plates', sub: '300 HP BR' },
  { hp: 250, plates: 2, label: '2 Plates', sub: '250 HP' },
  { hp: 200, plates: 1, label: '1 Plate', sub: '200 HP' },
  { hp: 100, plates: 0, label: 'MP Core', sub: '100 HP' },
];

export default function CodWarzoneStudio({
  game,
  soundEnabled,
  playTick,
  onPinSnapshot,
  weaponAId,
  setWeaponAId,
  weaponBId,
  setWeaponBId,
  customDmg,
  setCustomDmg,
  customRpm,
  setCustomRpm,
  useCustomStats,
  setUseCustomStats,
  codOpenBolt,
  setCodOpenBolt,
  codHp,
  setCodHp,
  codHeadshots,
  setCodHeadshots,
  camoClassCount,
  setCamoClassCount,
  camoMatchesPerGun,
  setCamoMatchesPerGun,
  weaponAObj,
  weaponBObj,
  ttkA,
  ttkB,
  camoRemainingGuns,
  camoMatchesLeft,
  studioMode,
  setStudioMode,
}) {
  const maxTtkScale = Math.max(ttkA.ttkMs, ttkB.ttkMs, 950);
  const boltDelayA = codOpenBolt && !useCustomStats ? weaponAObj.openBoltMs : 0;
  const boltDelayB = codOpenBolt ? weaponBObj.openBoltMs : 0;

  const pctA = Math.min(100, (ttkA.ttkMs / maxTtkScale) * 100);
  const pctB = Math.min(100, (ttkB.ttkMs / maxTtkScale) * 100);
  const boltPctA = Math.min(pctA, (boltDelayA / maxTtkScale) * 100);
  const boltPctB = Math.min(pctB, (boltDelayB / maxTtkScale) * 100);

  const aWins = ttkA.ttkMs <= ttkB.ttkMs;
  const deltaMs = Math.abs(ttkB.ttkMs - ttkA.ttkMs);
  const activeRpmA = useCustomStats ? customRpm : weaponAObj.rpm;
  const activeDmgA = useCustomStats ? customDmg : weaponAObj.damage;
  const nameA = useCustomStats ? `Custom (${activeDmgA} DMG)` : weaponAObj.name;

  const handleSwapWeapons = () => {
    playTick?.(soundEnabled, 740);
    setUseCustomStats(false);
    setWeaponAId(weaponBId);
    setWeaponBId(weaponAId);
    setCustomDmg(weaponBObj.damage);
    setCustomRpm(weaponBObj.rpm);
  };

  return (
    <div className="gs-studio-stack gs-cod-bench">
      {/* TOP BALLISTICS MODE & PLATE BAR */}
      <SpotlightPanel className="gs-hero-instrument gs-cod-range-header">
        <div className="gs-cod-top-row">
          <div className="gs-studio-identity">
            <span className="gs-kicker-badge">
              <Crosshair size={13} aria-hidden="true" />
              <span>FIRING RANGE BALLISTICS BENCH</span>
            </span>
            <h2 className="gs-bench-heading">
              {studioMode === 'duel'
                ? 'Time-To-Kill Duel Telemetry'
                : '33-Weapon Mastery Camo Matrix'}
            </h2>
          </div>

          <SegmentedSpringTabs
            ariaLabel="Warzone Studio Modules"
            value={studioMode}
            onChange={(next) => {
              playTick?.(soundEnabled, 680);
              setStudioMode(next);
            }}
            options={[
              { id: 'duel', label: 'TTK Duel Lab', icon: Crosshair },
              { id: 'camo', label: 'Camo Matrix (33)', icon: Award },
            ]}
          />
        </div>

        {/* Interactive Armor Plate Rig */}
        {studioMode === 'duel' ? (
          <div className="gs-plate-rig" role="group" aria-label="Target Armor Plates">
            {PLATE_PRESETS.map((tier) => {
              const active = codHp === tier.hp;
              return (
                <button
                  key={tier.hp}
                  type="button"
                  aria-pressed={active}
                  className={`gs-plate-btn ${active ? 'active' : ''}`}
                  onClick={() => {
                    playTick?.(soundEnabled, 720);
                    setCodHp(tier.hp);
                  }}
                >
                  <div className="gs-plate-bars" aria-hidden="true">
                    {[0, 1, 2].map((slotIdx) => (
                      <span
                        key={slotIdx}
                        className={`gs-armor-seg ${slotIdx < tier.plates ? 'filled' : 'empty'}`}
                      />
                    ))}
                  </div>
                  <div className="gs-plate-copy">
                    <strong>{tier.label}</strong>
                    <span className="mono">{tier.sub}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="gs-camo-banner-summary">
            <div>
              <span className="mono gs-micro-label">MASTERY CAMO PROGRESS</span>
              <div className="gs-hero-big mono">
                <AnimatedValue value={camoClassCount} /> / 33 Weapons Complete
              </div>
            </div>
            <div className="gs-camo-eta-pill mono">
              ~<AnimatedValue value={camoMatchesLeft} /> Matches Left ({camoRemainingGuns} guns)
            </div>
          </div>
        )}
      </SpotlightPanel>

      {studioMode === 'duel' ? (
        <SpotlightPanel className="gs-work-card gs-cod-duel-card">
          <div className="gs-card-topbar">
            <div className="gs-pill-cluster">
              <button
                type="button"
                aria-pressed={codOpenBolt}
                className={`filter-pill ${codOpenBolt ? 'active' : ''}`}
                onClick={() => {
                  playTick?.(soundEnabled, 700);
                  setCodOpenBolt((v) => !v);
                }}
              >
                Open-Bolt Trigger Delay: {codOpenBolt ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={handleSwapWeapons}
              >
                <ArrowLeftRight size={13} aria-hidden="true" />
                <span>Swap A ↔ B</span>
              </button>
            </div>
            <PinButton
              label="Pin TTK"
              onClick={() =>
                onPinSnapshot(
                  `${nameA} @ ${codHp}HP`,
                  `${ttkA.ttkMs} ms (${ttkA.shotsToKill} shots vs ${weaponBObj.name} ${ttkB.ttkMs} ms)`
                )
              }
            />
          </div>

          {/* ANIMATED MILLISECOND DUEL RACE LANES */}
          <div className="gs-ttk-race-stage" aria-live="polite">
            <div className="gs-ttk-winner-strip">
              <span className="mono gs-micro-label">
                {nameA.toUpperCase()} VS {weaponBObj.name.toUpperCase()} · {codHp} HP · {codHeadshots} HS
              </span>
              <span className={`gs-verdict-chip mono ${aWins ? 'win' : 'lose'}`}>
                {deltaMs === 0
                  ? 'Dead Heat (0 ms)'
                  : aWins
                    ? `${nameA} wins by ${deltaMs} ms`
                    : `${weaponBObj.name} faster by ${deltaMs} ms`}
              </span>
            </div>

            {/* Lane A */}
            <div className={`gs-ttk-lane ${aWins ? 'leading' : ''}`}>
              <div className="gs-ttk-lane-head">
                <span className="gs-lane-tag mono">A</span>
                <strong>{nameA}</strong>
                <span className="mono gs-lane-metric">
                  <AnimatedValue value={ttkA.ttkMs} suffix=" ms" /> · {ttkA.shotsToKill} shots ·{' '}
                  <AnimatedValue value={ttkA.dps} suffix=" DPS" />
                </span>
              </div>
              <div className="gs-ttk-track" aria-hidden="true">
                {boltPctA > 0 && (
                  <div
                    className="gs-ttk-bolt-seg"
                    style={{ width: `${boltPctA}%` }}
                    title={`Open-bolt delay +${boltDelayA}ms`}
                  />
                )}
                <div
                  className="gs-ttk-fire-seg a"
                  style={{ width: `${Math.max(4, pctA - boltPctA)}%` }}
                >
                  <span className="gs-shot-pips">
                    {Array.from({ length: Math.min(ttkA.shotsToKill, 16) }, (_, idx) => (
                      <span
                        key={idx}
                        className={`gs-shot-pip ${idx < codHeadshots ? 'head' : 'body'}`}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </div>

            {/* Lane B */}
            <div className={`gs-ttk-lane ${!aWins ? 'leading' : ''}`}>
              <div className="gs-ttk-lane-head">
                <span className="gs-lane-tag b mono">B</span>
                <strong>{weaponBObj.name}</strong>
                <span className="mono gs-lane-metric">
                  <AnimatedValue value={ttkB.ttkMs} suffix=" ms" /> · {ttkB.shotsToKill} shots ·{' '}
                  <AnimatedValue value={ttkB.dps} suffix=" DPS" />
                </span>
              </div>
              <div className="gs-ttk-track" aria-hidden="true">
                {boltPctB > 0 && (
                  <div
                    className="gs-ttk-bolt-seg"
                    style={{ width: `${boltPctB}%` }}
                    title={`Open-bolt delay +${boltDelayB}ms`}
                  />
                )}
                <div
                  className="gs-ttk-fire-seg b"
                  style={{ width: `${Math.max(4, pctB - boltPctB)}%` }}
                >
                  <span className="gs-shot-pips">
                    {Array.from({ length: Math.min(ttkB.shotsToKill, 16) }, (_, idx) => (
                      <span
                        key={idx}
                        className={`gs-shot-pip ${idx < codHeadshots ? 'head' : 'body'}`}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </div>

            <div className="gs-ttk-legend mono">
              <span>Gold pips = headshots ({codHeadshots})</span>
              <span>Amber block = open-bolt delay</span>
              <span>Shot cadence: {ttkA.fireIntervalMs} ms / rd</span>
            </div>
          </div>

          {/* LOADOUT & HEADSHOT TUNING CONTROLS */}
          <div className="mg-field-grid two-col">
            <div className="mg-field">
              <label htmlFor="cod-weap-a">Weapon A Blueprint</label>
              <select
                id="cod-weap-a"
                className="deck-input no-icon"
                value={weaponAId}
                onChange={(e) => {
                  const w = COD_MW4_WEAPONS.find((x) => x.id === e.target.value);
                  setWeaponAId(e.target.value);
                  if (w) {
                    setCustomDmg(w.damage);
                    setCustomRpm(w.rpm);
                    setUseCustomStats(false);
                  }
                }}
              >
                {COD_MW4_WEAPONS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} · {w.rpm} RPM / {w.damage} DMG
                  </option>
                ))}
              </select>
            </div>

            <div className="mg-field">
              <label htmlFor="cod-weap-b">Compare vs Weapon B</label>
              <select
                id="cod-weap-b"
                className="deck-input no-icon"
                value={weaponBId}
                onChange={(e) => setWeaponBId(e.target.value)}
              >
                {COD_MW4_WEAPONS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} · {w.rpm} RPM / {w.damage} DMG
                  </option>
                ))}
              </select>
            </div>

            <div className="mg-field">
              <label htmlFor="cod-hp-select">Target Armor / HP</label>
              <select
                id="cod-hp-select"
                className="deck-input no-icon"
                value={codHp}
                onChange={(e) => setCodHp(Number(e.target.value))}
              >
                <option value={300}>300 HP · 3 Plates</option>
                <option value={250}>250 HP · 2 Plates</option>
                <option value={200}>200 HP · 1 Plate</option>
                <option value={100}>100 HP · Multiplayer Core</option>
              </select>
            </div>

            <div className="mg-field">
              <label htmlFor="cod-hs-select">Headshot Accuracy</label>
              <select
                id="cod-hs-select"
                className="deck-input no-icon"
                value={codHeadshots}
                onChange={(e) => setCodHeadshots(Number(e.target.value))}
              >
                <option value={0}>0 Headshots · Body Only</option>
                <option value={1}>1 Headshot + Body</option>
                <option value={2}>2 Headshots + Body</option>
                <option value={3}>3 Headshots</option>
                <option value={4}>4 Headshots</option>
                <option value={5}>5 Headshots</option>
                <option value={6}>6 Headshots</option>
                <option value={7}>7 Headshots</option>
                <option value={8}>8 Headshots</option>
              </select>
            </div>
          </div>

          <div className="slider-pair-grid gs-cod-sliders">
            <div>
              <div className="meter-labels">
                <label htmlFor="cod-custom-rpm">Custom Weapon A RPM</label>
                <strong className="mono">{activeRpmA} RPM</strong>
              </div>
              <input
                id="cod-custom-rpm"
                type="range"
                min={300}
                max={1200}
                step={1}
                value={activeRpmA}
                style={{ '--pct': `${Math.round(((activeRpmA - 300) / 900) * 100)}%` }}
                onChange={(e) => {
                  setUseCustomStats(true);
                  setCustomRpm(Number(e.target.value));
                }}
              />
            </div>
            <div>
              <div className="meter-labels">
                <label htmlFor="cod-custom-dmg">Custom Damage / Bullet</label>
                <strong className="mono">{activeDmgA} DMG</strong>
              </div>
              <input
                id="cod-custom-dmg"
                type="range"
                min={20}
                max={90}
                step={1}
                value={activeDmgA}
                style={{ '--pct': `${Math.round(((activeDmgA - 20) / 70) * 100)}%` }}
                onChange={(e) => {
                  setUseCustomStats(true);
                  setCustomDmg(Number(e.target.value));
                }}
              />
            </div>
          </div>
        </SpotlightPanel>
      ) : (
        <SpotlightPanel className="gs-work-card gs-cod-camo-card">
          <div className="gs-card-topbar">
            <h3 className="mg-subcard-title">
              <Shield size={16} color={game.accentColor} aria-hidden="true" />
              <span>Interactive 33-Weapon Mastery Grid (Click to Set Completed Count)</span>
            </h3>
            <span className="district-pill mono">{camoRemainingGuns} Left</span>
          </div>

          <div className="gs-camo-matrix" role="group" aria-label="33 weapon mastery progress grid">
            {Array.from({ length: 33 }, (_, i) => {
              const num = i + 1;
              const unlocked = num <= camoClassCount;
              return (
                <button
                  key={num}
                  type="button"
                  aria-pressed={unlocked}
                  className={`gs-camo-tile mono ${unlocked ? 'unlocked' : ''}`}
                  aria-label={`Set ${num} weapons completed`}
                  onClick={() => {
                    playTick?.(soundEnabled, 760);
                    setCamoClassCount(unlocked && num === camoClassCount ? num - 1 : num);
                  }}
                >
                  {num}
                </button>
              );
            })}
          </div>

          <div className="mg-field-grid">
            <div className="mg-field">
              <label htmlFor="camo-done">Weapons Finished (0–33)</label>
              <NumericField
                id="camo-done"
                min={0}
                max={33}
                fallback={21}
                className="deck-input no-icon mono"
                value={camoClassCount}
                onCommit={setCamoClassCount}
              />
            </div>
            <div className="mg-field">
              <label htmlFor="camo-pace">Avg Matches / Weapon</label>
              <NumericField
                id="camo-pace"
                min={1}
                max={30}
                fallback={6}
                className="deck-input no-icon mono"
                value={camoMatchesPerGun}
                onCommit={setCamoMatchesPerGun}
              />
            </div>
            <div className="mg-stat-mini">
              <span>Remaining Matches</span>
              <strong>
                <AnimatedValue value={camoMatchesLeft} suffix=" Matches" />
              </strong>
            </div>
          </div>
        </SpotlightPanel>
      )}
    </div>
  );
}

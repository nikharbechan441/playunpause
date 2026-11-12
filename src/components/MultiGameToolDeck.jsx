import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Zap,
  TrendingUp,
  Crosshair,
  Shield,
  DollarSign,
  Compass,
  Sparkles,
  RotateCcw,
  Bookmark,
  Trash2,
  Lock,
} from 'lucide-react';
import { playSwitchTick } from '../utils/soundHaptics.js';

export default function MultiGameToolDeck({
  game,
  isPro,
  onOpenProModal,
  soundEnabled,
  savedPins = [],
  onSavePin,
  onRemovePin,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [pinNotice, setPinNotice] = useState('');

  const flashCopied = (key) => {
    playSwitchTick(soundEnabled, 840);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCardSpotlight = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const copyToClipboard = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    flashCopied(key);
  };

  const handlePinSnapshot = (label, value) => {
    if (!onSavePin) return;
    if (!isPro && savedPins.length >= 1) {
      playSwitchTick(soundEnabled, 660);
      setPinNotice('Free tier holds 1 quick pin. Unlock All-Access ($6.99) for unlimited cloud-synced pins across Phone + PC.');
      onOpenProModal();
      return;
    }
    playSwitchTick(soundEnabled, 820);
    onSavePin({
      id: `${game.id}-${Date.now().toString(36)}`,
      gameId: game.id,
      label,
      value,
    });
    setPinNotice('Pinned to your companion deck.');
    setTimeout(() => setPinNotice(''), 2200);
  };

  // --- 1. Minecraft Tool States ---
  const [owX, setOwX] = useState(1280);
  const [owY, setOwY] = useState(64);
  const [owZ, setOwZ] = useState(-840);

  const netherCoords = useMemo(() => {
    const x = Math.round((Number(owX) || 0) / 8);
    const y = Number.isFinite(Number(owY)) ? Number(owY) : 64;
    const z = Math.round((Number(owZ) || 0) / 8);
    return { x, y, z };
  }, [owX, owY, owZ]);

  // --- 2. Fortnite Tool States ---
  const [currentLevel, setCurrentLevel] = useState(45);
  const [targetLevel, setTargetLevel] = useState(100);
  const [daysRemaining, setDaysRemaining] = useState(32);

  const fortnitePace = useMemo(() => {
    const levelsNeeded = Math.max(0, targetLevel - currentLevel);
    const totalXpNeeded = levelsNeeded * 80000;
    const dailyXp = daysRemaining > 0 ? Math.round(totalXpNeeded / daysRemaining) : totalXpNeeded;
    const brMatchesDaily = Math.ceil(dailyXp / 16000);
    return { levelsNeeded, totalXpNeeded, dailyXp, brMatchesDaily };
  }, [currentLevel, targetLevel, daysRemaining]);

  // --- 3. Call of Duty Tool States ---
  const [camosFinished, setCamosFinished] = useState(12);
  const [headshotsPerMatch, setHeadshotsPerMatch] = useState(7);
  const [weaponRpm, setWeaponRpm] = useState(750);
  const [bulletDamage, setBulletDamage] = useState(38);

  const codMath = useMemo(() => {
    const totalWeapons = 33;
    const weaponsRemaining = Math.max(0, totalWeapons - camosFinished);
    const headshotsRemaining = weaponsRemaining * 100;
    const matchesNeeded = Math.ceil(headshotsRemaining / Math.max(1, headshotsPerMatch));
    const hoursNeeded = Math.round((matchesNeeded * 10) / 60);

    const shotsToKill = Math.ceil(300 / Math.max(1, bulletDamage));
    const timeBetweenShotsMs = (60 / Math.max(100, weaponRpm)) * 1000;
    const ttkMs = Math.round((shotsToKill - 1) * timeBetweenShotsMs);

    return { weaponsRemaining, headshotsRemaining, matchesNeeded, hoursNeeded, shotsToKill, ttkMs };
  }, [camosFinished, headshotsPerMatch, weaponRpm, bulletDamage]);

  // --- 4. EA Sports FC 25 Tool States ---
  const [fcBuyPrice, setFcBuyPrice] = useState(105000);
  const [fcPlayerPrice, setFcPlayerPrice] = useState(120000);

  const fcTaxMath = useMemo(() => {
    const buy = Math.max(0, Number(fcBuyPrice) || 0);
    const price = Math.max(0, Number(fcPlayerPrice) || 0);
    const tax = Math.round(price * 0.05);
    const net = price - tax;
    const profit = net - buy;
    const breakEven = Math.round(price * 0.95);
    return { buy, price, tax, net, profit, breakEven };
  }, [fcBuyPrice, fcPlayerPrice]);

  // --- 5. Roblox Tool States ---
  const [robuxAmount, setRobuxAmount] = useState(100000);
  const robloxMath = useMemo(() => {
    const robux = Math.max(0, Number(robuxAmount) || 0);
    const after30PctTax = Math.round(robux * 0.7);
    const devexUsd = (robux * 0.0038).toFixed(2);
    const gamepassNetDevexUsd = (after30PctTax * 0.0038).toFixed(2);
    return { robux, after30PctTax, devexUsd, gamepassNetDevexUsd };
  }, [robuxAmount]);

  // --- 6. Counter-Strike 2 Tool States ---
  const [csLossStreak, setCsLossStreak] = useState(3);
  const [csCurrentBank, setCsCurrentBank] = useState(1650);
  const csEconomyMath = useMemo(() => {
    const bonuses = [1400, 1900, 2400, 2900, 3400];
    const lossStreakClamped = Math.min(4, Math.max(0, csLossStreak));
    const nextRoundCash = bonuses[lossStreakClamped];
    const bank = Math.max(0, Math.min(16000, Number(csCurrentBank) || 0));
    const projectedTotal = Math.min(16000, bank + nextRoundCash);
    let callout = 'Call Full Eco (Save to $2,000+)';
    if (bank >= 4500) {
      callout = 'Full Buy Now (Rifle + Head Armor + Utility)';
    } else if (projectedTotal >= 4500) {
      callout = 'Full Eco Now → Guaranteed Full Buy Next Round';
    } else if (bank >= 2700) {
      callout = 'Half-Buy / Pistols (Keep $2,000 Floor)';
    }
    return { nextRoundCash, bank, projectedTotal, callout };
  }, [csLossStreak, csCurrentBank]);

  // --- 7. Valorant Tool States ---
  const [valCurrentRr, setValCurrentRr] = useState(62);
  const [valAvgGain, setValAvgGain] = useState(19);
  const valRankMath = useMemo(() => {
    const rr = Math.max(0, Math.min(99, Number(valCurrentRr) || 0));
    const gain = Math.max(10, Math.min(35, Number(valAvgGain) || 19));
    const rrToRankUp = 100 - rr;
    const netWins = Math.ceil(rrToRankUp / gain);
    return { rr, gain, rrToRankUp, netWins };
  }, [valCurrentRr, valAvgGain]);

  // --- 8. Apex Legends Tool States ---
  const [apexPacksOpened, setApexPacksOpened] = useState(185);
  const apexPityMath = useMemo(() => {
    const opened = Math.max(0, Math.min(500, Number(apexPacksOpened) || 0));
    const remaining = 500 - opened;
    const pct = Math.round((opened / 500) * 100);
    const coinsCost = remaining * 100;
    const approxUsd = ((coinsCost / 1000) * 10).toFixed(0);
    return { opened, remaining, pct, coinsCost, approxUsd };
  }, [apexPacksOpened]);

  // --- 9. GTA Online Tool States ---
  const [cayoPrimaryTarget, setCayoPrimaryTarget] = useState(1300000);
  const [cayoSecondaryLoot, setCayoSecondaryLoot] = useState(450000);
  const [cayoCrewMembers, setCayoCrewMembers] = useState(2);
  const [cayoHostPct, setCayoHostPct] = useState(70);

  const cayoMath = useMemo(() => {
    const gross = Math.max(0, Number(cayoPrimaryTarget) || 0) + Math.max(0, Number(cayoSecondaryLoot) || 0);
    const pavelCut = Math.round(gross * 0.02);
    const fencingFee = Math.round(gross * 0.1);
    const netPool = gross - pavelCut - fencingFee;
    const effectiveHostPct = cayoCrewMembers === 1 ? 100 : cayoHostPct;
    const hostPayout = Math.round((netPool * effectiveHostPct) / 100);
    const crewPayoutEach =
      cayoCrewMembers > 1
        ? Math.round((netPool * (100 - effectiveHostPct)) / (cayoCrewMembers - 1) / 100)
        : 0;

    return { gross, pavelCut, fencingFee, netPool, effectiveHostPct, hostPayout, crewPayoutEach };
  }, [cayoPrimaryTarget, cayoSecondaryLoot, cayoCrewMembers, cayoHostPct]);

  const gamePins = savedPins.filter((p) => p.gameId === game.id);
  const metaRows = Array.isArray(game.proMetaRows) ? game.proMetaRows : [];

  const renderSideMetaDeck = () => (
    <aside className="meta-side-stack" aria-label="Pro Meta benchmarks and saved targets">
      <div className="pro-meta-card">
        <div className="pro-meta-header">
          <h3>{game.proMetaTitle || `${game.shortTitle} Pro Meta Reference`}</h3>
          <span className="game-audience-pill">{isPro ? 'Pro Unlocked' : 'Live Meta'}</span>
        </div>

        {metaRows.length > 0 && (
          <div className="pro-meta-row">
            <div className="pro-meta-row-label">{metaRows[0].label}</div>
            <div className="pro-meta-row-val">{metaRows[0].val}</div>
          </div>
        )}

        {metaRows.length > 1 && (
          isPro ? (
            metaRows.slice(1).map((row) => (
              <div key={row.label} className="pro-meta-row">
                <div className="pro-meta-row-label">{row.label}</div>
                <div className="pro-meta-row-val">{row.val}</div>
              </div>
            ))
          ) : (
            <div className="pro-meta-locked-wrap">
              <div className="pro-meta-locked-blur" aria-hidden="true">
                {metaRows.slice(1).map((row) => (
                  <div key={row.label} className="pro-meta-row">
                    <div className="pro-meta-row-label">{row.label}</div>
                    <div className="pro-meta-row-val">{row.val}</div>
                  </div>
                ))}
              </div>
              <div className="pro-meta-unlock-cta">
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 6 }}>
                  Unlock full S-Tier Meta tables + Phone/PC Sync
                </div>
                <button type="button" className="subtle-pill-btn" onClick={onOpenProModal}>
                  <Lock size={13} color="var(--coral)" />
                  <span>Unlock All 10 Games ($6.99)</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="pin-deck-card">
        <div className="pro-meta-header" style={{ marginBottom: 6 }}>
          <h3 style={{ fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Bookmark size={16} color={game.accentColor} />
            <span>Pinned {game.shortTitle} Targets</span>
          </h3>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ink-muted)' }}>
            {isPro ? 'Cloud Synced' : `${savedPins.length}/1 Free Pin`}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ink-secondary)', lineHeight: 1.48 }}>
          Save portal coords, flip prices, or squad splits here so they stay ready on your phone while you play.
        </p>

        {pinNotice && (
          <p style={{ margin: '8px 0 0', fontSize: '0.78rem', fontWeight: 600, color: 'var(--teal-dark)' }}>
            {pinNotice}
          </p>
        )}

        {gamePins.length === 0 ? (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px dashed var(--border-strong)',
              fontSize: '0.78rem',
              color: 'var(--ink-muted)',
            }}
          >
            No {game.shortTitle} targets pinned yet. Click <strong>Pin Target</strong> on the calculator to save one.
          </div>
        ) : (
          gamePins.map((pin) => (
            <div key={pin.id} className="pin-item-row">
              <div style={{ minWidth: 0 }}>
                <div className="pin-item-label">{pin.label}</div>
                <div className="pin-item-val">{pin.value}</div>
              </div>
              {onRemovePin && (
                <button
                  type="button"
                  className="calc-reset-btn"
                  aria-label={`Remove ${pin.label}`}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 680);
                    onRemovePin(pin.id);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );

  return (
    <div className="multigame-deck-wrapper">
      {/* Game Header Banner */}
      <div className="game-lead-banner" style={{ borderColor: game.accentColor }}>
        <div className="game-lead-info">
          <div className="game-badge-row">
            <span className="game-genre-tag">{game.genre}</span>
            <span className="game-audience-pill">{game.audienceBadge}</span>
          </div>
          <h1 className="game-headline">{game.fullTitle}</h1>
          <p className="game-lead-tagline">{game.tagline}</p>
        </div>

        <div className="game-lead-pass-pill">
          <div className="pass-pill-header">
            <Sparkles size={15} color={game.accentColor} />
            <span>Universal Companion Pass</span>
          </div>
          <div className="pass-pill-desc">
            One-time $6.99 unlocks Pro Meta tables &amp; passwordless Phone + PC sync across all 10 games.
          </div>
          <button
            type="button"
            className="game-pass-cta-btn"
            style={{ background: game.accentColor }}
            onClick={onOpenProModal}
          >
            {isPro ? 'All-Access Pass Active' : 'Get All-Access Pass ($6.99 · One-Time)'}
          </button>
        </div>
      </div>

      {/* 1. MINECRAFT: NETHER PORTAL 8:1 LINKER */}
      {game.id === 'minecraft' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <Compass size={19} color="#10B981" />
                <h2>Nether Portal Linker (Exact 8:1 Math)</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setOwX(1280);
                  setOwY(64);
                  setOwZ(-840);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Enter your Overworld base coordinates to get exact Nether frame placement and avoid 128-block portal link collisions.
            </p>

            <div className="coord-input-trio">
              <label>
                <span>Overworld X</span>
                <input
                  type="number"
                  value={owX}
                  onChange={(e) => setOwX(Number(e.target.value))}
                  className="deck-input no-icon"
                />
              </label>
              <label>
                <span>Overworld Y (Altitude)</span>
                <input
                  type="number"
                  value={owY}
                  onChange={(e) => setOwY(Number(e.target.value))}
                  className="deck-input no-icon"
                />
              </label>
              <label>
                <span>Overworld Z</span>
                <input
                  type="number"
                  value={owZ}
                  onChange={(e) => setOwZ(Number(e.target.value))}
                  className="deck-input no-icon"
                />
              </label>
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#10B981' }}>
              <div className="result-label">Build Nether Portal at exact coordinates</div>
              <div className="result-number" style={{ color: '#059669' }}>
                X: {netherCoords.x} &nbsp; Y: {netherCoords.y} &nbsp; Z: {netherCoords.z}
              </div>
              <div className="result-detail">
                1 Nether block equals 8 Overworld blocks on X and Z. Match Y altitude ({netherCoords.y}) so portals within 16 Nether blocks never cross-link.
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `Nether Portal Frame → X: ${netherCoords.x}, Y: ${netherCoords.y}, Z: ${netherCoords.z} (Overworld ${owX}, ${owY}, ${owZ})`,
                      'minecraft'
                    )
                  }
                >
                  {copiedKey === 'minecraft' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedKey === 'minecraft' ? 'Copied Coordinates' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `Overworld (${owX}, ${owZ}) → Nether`,
                      `X: ${netherCoords.x} · Y: ${netherCoords.y} · Z: ${netherCoords.z}`
                    )
                  }
                >
                  <Bookmark size={13} color="#10B981" />
                  <span>Pin Target</span>
                </button>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}

      {/* 2. FORTNITE: BATTLE PASS DAILY XP CALCULATOR */}
      {game.id === 'fortnite' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <Zap size={19} color="#0284C7" />
                <h2>Battle Pass Season Pace &amp; Level 100/200 Calculator</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setCurrentLevel(45);
                  setTargetLevel(100);
                  setDaysRemaining(32);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Calculate exact daily XP targets and match pace needed to hit Tier 100 or Super Level 200 before season downtime.
            </p>

            <div className="slider-pair-grid">
              <label>
                <div className="label-with-value">
                  <span>Current Battle Pass Level</span>
                  <strong>Level {currentLevel}</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(Number(e.target.value))}
                />
              </label>

              <label>
                <div className="label-with-value">
                  <span>Days Left in Season</span>
                  <strong>{daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'}</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={90}
                  value={daysRemaining}
                  onChange={(e) => setDaysRemaining(Number(e.target.value))}
                />
              </label>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="label-with-value">
                <span>Season Target Tier</span>
                <strong>Level {targetLevel}</strong>
              </div>
              <div className="preset-toggle-row">
                <button
                  type="button"
                  className={`subtab-btn ${targetLevel === 100 ? 'active' : ''}`}
                  onClick={() => setTargetLevel(100)}
                >
                  Tier 100 (Main Pass)
                </button>
                <button
                  type="button"
                  className={`subtab-btn ${targetLevel === 150 ? 'active' : ''}`}
                  onClick={() => setTargetLevel(150)}
                >
                  Level 150 (All V-Bucks)
                </button>
                <button
                  type="button"
                  className={`subtab-btn ${targetLevel === 200 ? 'active' : ''}`}
                  onClick={() => setTargetLevel(200)}
                >
                  Level 200 (Super Styles)
                </button>
              </div>
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#0284C7' }}>
              <div className="result-label">Daily XP target to finish on time</div>
              <div className="result-number" style={{ color: '#0284C7' }}>
                {fortnitePace.dailyXp.toLocaleString()} XP / day
              </div>
              <div className="result-detail">
                <strong>{fortnitePace.levelsNeeded} levels</strong> remaining ({fortnitePace.totalXpNeeded.toLocaleString()} XP over {daysRemaining} days) — roughly <strong>{fortnitePace.brMatchesDaily} Zero Build/BR matches per day</strong> including Daily Bonus Goals.
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `Fortnite Pace (Lvl ${currentLevel} → ${targetLevel} in ${daysRemaining}d): ${fortnitePace.dailyXp.toLocaleString()} XP/day (~${fortnitePace.brMatchesDaily} matches/day)`,
                      'fortnite'
                    )
                  }
                >
                  {copiedKey === 'fortnite' ? <Check size={14} color="#0284C7" /> : <Copy size={14} />}
                  <span>{copiedKey === 'fortnite' ? 'Copied Pace' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `Lvl ${currentLevel} → ${targetLevel} (${daysRemaining}d left)`,
                      `${fortnitePace.dailyXp.toLocaleString()} XP / day`
                    )
                  }
                >
                  <Bookmark size={13} color="#0284C7" />
                  <span>Pin Target</span>
                </button>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}

      {/* 3. CALL OF DUTY: CAMO MASTERY & WARZONE 3-PLATE TTK */}
      {game.id === 'cod-warzone' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <Crosshair size={19} color="#EF4444" />
                <h2>Dark Matter Camo Pace &amp; 3-Plate Armor TTK</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setCamosFinished(12);
                  setHeadshotsPerMatch(7);
                  setWeaponRpm(750);
                  setBulletDamage(38);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Track headshot pace across all 33 weapons and simulate exact Time-to-Kill against 300 HP fully plated Warzone enemies.
            </p>

            <div className="slider-pair-grid">
              <label>
                <div className="label-with-value">
                  <span>Weapons Completed (of 33)</span>
                  <strong>{camosFinished} / 33</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={33}
                  value={camosFinished}
                  onChange={(e) => setCamosFinished(Number(e.target.value))}
                />
              </label>

              <label>
                <div className="label-with-value">
                  <span>Avg. Headshots per Match</span>
                  <strong>{headshotsPerMatch} HS</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={25}
                  value={headshotsPerMatch}
                  onChange={(e) => setHeadshotsPerMatch(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#EF4444' }}>
              <div className="result-label">Dark Matter mastery finish line</div>
              <div className="result-number" style={{ color: '#DC2626' }}>
                {codMath.matchesNeeded} Matches (~{codMath.hoursNeeded} hrs)
              </div>
              <div className="result-detail">
                {codMath.headshotsRemaining.toLocaleString()} headshots left across {codMath.weaponsRemaining} weapons. Hardcore Face Off Stakeout cuts match count by ~2.4×.
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `BO6 Dark Matter (${camosFinished}/33 done): ${codMath.matchesNeeded} matches left · Warzone TTK (${weaponRpm} RPM / ${bulletDamage} DMG): ${codMath.ttkMs} ms (${codMath.shotsToKill} shots)`,
                      'cod'
                    )
                  }
                >
                  {copiedKey === 'cod' ? <Check size={14} color="#EF4444" /> : <Copy size={14} />}
                  <span>{copiedKey === 'cod' ? 'Copied Loadout Math' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `${weaponRpm} RPM / ${bulletDamage} DMG @ 300 HP`,
                      `${codMath.ttkMs} ms TTK (${codMath.shotsToKill} shots)`
                    )
                  }
                >
                  <Bookmark size={13} color="#EF4444" />
                  <span>Pin TTK</span>
                </button>
              </div>
            </div>

            <div className="sub-calc-box">
              <h3
                style={{
                  margin: '0 0 8px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  letterSpacing: '-0.015em',
                  color: 'var(--ink-primary)',
                }}
              >
                Warzone 3-Plate Armor TTK Simulator (300 HP Total)
              </h3>
              <div className="slider-pair-grid">
                <label>
                  <div className="label-with-value">
                    <span>Fire Rate (RPM)</span>
                    <strong>{weaponRpm} RPM</strong>
                  </div>
                  <input
                    type="range"
                    min={300}
                    max={1200}
                    step={25}
                    value={weaponRpm}
                    onChange={(e) => setWeaponRpm(Number(e.target.value))}
                  />
                </label>
                <label>
                  <div className="label-with-value">
                    <span>Damage per Bullet</span>
                    <strong>{bulletDamage} DMG</strong>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={120}
                    value={bulletDamage}
                    onChange={(e) => setBulletDamage(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="mini-stat-banner">
                <span>Shots to Down: <strong>{codMath.shotsToKill} bullets</strong></span>
                <span>Open-Bolt TTK: <strong style={{ color: '#DC2626' }}>{codMath.ttkMs} ms</strong></span>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}

      {/* 4. EA SPORTS FC 25: 5% EA TAX & SNIPING PROFIT */}
      {game.id === 'ea-fc-25' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <TrendingUp size={19} color="#0077B6" />
                <h2>5% EA Transfer Tax &amp; Sniping Profit Calculator</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setFcBuyPrice(105000);
                  setFcPlayerPrice(120000);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Check your exact net coin payout, live flip profit after the 5% Ultimate Team fee, and maximum break-even buy price.
            </p>

            <div className="slider-pair-grid">
              <label>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                  Buy / Snipe Price (Coins)
                </span>
                <input
                  type="number"
                  step={500}
                  value={fcBuyPrice}
                  onChange={(e) => setFcBuyPrice(Number(e.target.value))}
                  className="deck-input no-icon"
                />
              </label>

              <label>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                  Target Sale Price (Coins)
                </span>
                <input
                  type="number"
                  step={500}
                  value={fcPlayerPrice}
                  onChange={(e) => setFcPlayerPrice(Number(e.target.value))}
                  className="deck-input no-icon"
                />
              </label>
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#0077B6' }}>
              <div className="result-label">Net coins &amp; flip profit after 5% EA tax</div>
              <div
                className="result-number"
                style={{ color: fcTaxMath.profit >= 0 ? '#008577' : '#E63946' }}
              >
                {fcTaxMath.profit >= 0 ? '+' : ''}
                {fcTaxMath.profit.toLocaleString()} Coins Profit
              </div>
              <div className="result-detail">
                After-tax payout: <strong>{fcTaxMath.net.toLocaleString()} Coins</strong> (5% EA tax: -{fcTaxMath.tax.toLocaleString()}). Maximum break-even buy price: <strong>{fcTaxMath.breakEven.toLocaleString()} Coins</strong>.
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `FC 25 Flip (Buy ${fcTaxMath.buy.toLocaleString()} → Sell ${fcTaxMath.price.toLocaleString()}): ${fcTaxMath.profit >= 0 ? '+' : ''}${fcTaxMath.profit.toLocaleString()} Coins net after 5% EA tax`,
                      'fc25'
                    )
                  }
                >
                  {copiedKey === 'fc25' ? <Check size={14} color="#0077B6" /> : <Copy size={14} />}
                  <span>{copiedKey === 'fc25' ? 'Copied Trade Math' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `Sell @ ${fcTaxMath.price.toLocaleString()} (Max Buy ${fcTaxMath.breakEven.toLocaleString()})`,
                      `${fcTaxMath.profit >= 0 ? '+' : ''}${fcTaxMath.profit.toLocaleString()} Coins net`
                    )
                  }
                >
                  <Bookmark size={13} color="#0077B6" />
                  <span>Pin Flip</span>
                </button>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}

      {/* 5. ROBLOX: DEVEX USD CASHOUT & 30% MARKET TAX */}
      {game.id === 'roblox' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <DollarSign size={19} color="#0891B2" />
                <h2>Roblox DevEx Cashout &amp; 30% Marketplace Fee Calculator</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setRobuxAmount(100000);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Convert earned Robux into USD at the published DevEx rate ($0.0038/R$) and see net creator earnings after the 30% Gamepass fee.
            </p>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                Robux Amount (R$)
              </span>
              <input
                type="number"
                step={5000}
                value={robuxAmount}
                onChange={(e) => setRobuxAmount(Number(e.target.value))}
                className="deck-input no-icon"
              />
            </label>

            <div className="preset-toggle-row" style={{ marginBottom: 14 }}>
              {[30000, 100000, 250000, 1000000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`subtab-btn ${robuxAmount === preset ? 'active' : ''}`}
                  onClick={() => setRobuxAmount(preset)}
                >
                  {preset >= 1000000 ? '1M R$' : `${preset / 1000}k R$`}
                </button>
              ))}
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#0891B2' }}>
              <div className="result-label">Published DevEx USD cashout ($0.0038 / R$)</div>
              <div className="result-number" style={{ color: '#0891B2' }}>
                ${Number(robloxMath.devexUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
              <div className="result-detail">
                If sold via Gamepass (30% fee), you keep <strong>{robloxMath.after30PctTax.toLocaleString()} R$</strong> (worth <strong>${Number(robloxMath.gamepassNetDevexUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong> in DevEx; 30,000 R$ minimum payout threshold).
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `Roblox ${robloxMath.robux.toLocaleString()} R$ → $${robloxMath.devexUsd} USD DevEx (After 30% Gamepass tax: ${robloxMath.after30PctTax.toLocaleString()} R$ / $${robloxMath.gamepassNetDevexUsd})`,
                      'roblox'
                    )
                  }
                >
                  {copiedKey === 'roblox' ? <Check size={14} color="#0891B2" /> : <Copy size={14} />}
                  <span>{copiedKey === 'roblox' ? 'Copied DevEx Math' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `${robloxMath.robux.toLocaleString()} Earned R$`,
                      `$${robloxMath.devexUsd} USD DevEx`
                    )
                  }
                >
                  <Bookmark size={13} color="#0891B2" />
                  <span>Pin Target</span>
                </button>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}

      {/* 6. COUNTER-STRIKE 2: LOSS STREAK & BUY ECONOMY */}
      {game.id === 'cs2' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <Shield size={19} color="#D97706" />
                <h2>CS2 Loss Streak Bonus &amp; Team Buy Call Calculator</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setCsLossStreak(3);
                  setCsCurrentBank(1650);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Call clean team saves or full buys in MR12 premier matches using exact consecutive loss income and current bank floor.
            </p>

            <div className="slider-pair-grid">
              <label>
                <div className="label-with-value">
                  <span>Consecutive Rounds Lost</span>
                  <strong>{csLossStreak} {csLossStreak === 1 ? 'Loss' : 'Losses'}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={csLossStreak}
                  onChange={(e) => setCsLossStreak(Number(e.target.value))}
                />
              </label>

              <label>
                <div className="label-with-value">
                  <span>Lowest Teammate Cash</span>
                  <strong>${csEconomyMath.bank.toLocaleString()}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8000}
                  step={50}
                  value={csCurrentBank}
                  onChange={(e) => setCsCurrentBank(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#B45309' }}>
              <div className="result-label">Next round loss bonus &amp; IGL call</div>
              <div className="result-number" style={{ color: '#B45309' }}>
                +${csEconomyMath.nextRoundCash.toLocaleString()} → ${csEconomyMath.projectedTotal.toLocaleString()}
              </div>
              <div className="result-detail">
                <strong>IGL Call: {csEconomyMath.callout}.</strong> Loss ladder: $1,400 → $1,900 → $2,400 → $2,900 → $3,400 cap. Full Rifle + Head Armor + Utility requires ~$4,500–$4,900.
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `CS2 Economy (${csLossStreak} losses, $${csEconomyMath.bank} bank): +$${csEconomyMath.nextRoundCash} next round ($${csEconomyMath.projectedTotal} total) — ${csEconomyMath.callout}`,
                      'cs2'
                    )
                  }
                >
                  {copiedKey === 'cs2' ? <Check size={14} color="#D97706" /> : <Copy size={14} />}
                  <span>{copiedKey === 'cs2' ? 'Copied Economy Call' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `Loss Streak ${csLossStreak} ($${csEconomyMath.bank} bank)`,
                      `$${csEconomyMath.projectedTotal.toLocaleString()} next round`
                    )
                  }
                >
                  <Bookmark size={13} color="#D97706" />
                  <span>Pin Call</span>
                </button>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}

      {/* 7. VALORANT: RR LADDER TO NEXT RANK */}
      {game.id === 'valorant' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <Crosshair size={19} color="#E11D48" />
                <h2>Valorant Ranked RR Climb Pace Calculator</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setValCurrentRr(62);
                  setValAvgGain(19);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Calculate the exact net wins needed to cross 100 RR based on your current Rank Rating and personal MMR gain per win.
            </p>

            <div className="slider-pair-grid">
              <label>
                <div className="label-with-value">
                  <span>Current Rank Rating (RR)</span>
                  <strong>{valRankMath.rr} / 100 RR</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={99}
                  value={valCurrentRr}
                  onChange={(e) => setValCurrentRr(Number(e.target.value))}
                />
              </label>

              <label>
                <div className="label-with-value">
                  <span>Avg. RR Gained per Win</span>
                  <strong>+{valRankMath.gain} RR</strong>
                </div>
                <input
                  type="range"
                  min={12}
                  max={30}
                  value={valAvgGain}
                  onChange={(e) => setValAvgGain(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#E11D48' }}>
              <div className="result-label">Estimated net wins to rank up</div>
              <div className="result-number" style={{ color: '#E11D48' }}>
                {valRankMath.netWins} {valRankMath.netWins === 1 ? 'Net Win' : 'Net Wins'} (+{valRankMath.rrToRankUp} RR)
              </div>
              <div className="result-detail">
                At +{valRankMath.gain} RR per win, {valRankMath.netWins} net wins cross the 100 RR promotion threshold. Keep save-round credits above <strong>3,900</strong> to guarantee next-round Vandal/Phantom + Heavy Shields.
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `Valorant Climb (${valRankMath.rr}/100 RR @ +${valRankMath.gain} RR/win): ${valRankMath.netWins} net wins to rank up`,
                      'valorant'
                    )
                  }
                >
                  {copiedKey === 'valorant' ? <Check size={14} color="#E11D48" /> : <Copy size={14} />}
                  <span>{copiedKey === 'valorant' ? 'Copied RR Target' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `${valRankMath.rr}/100 RR (+${valRankMath.gain}/win)`,
                      `${valRankMath.netWins} net wins to promote`
                    )
                  }
                >
                  <Bookmark size={13} color="#E11D48" />
                  <span>Pin Target</span>
                </button>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}

      {/* 8. APEX LEGENDS: 500-PACK HEIRLOOM PITY COUNTER */}
      {game.id === 'apex-legends' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <Sparkles size={19} color="#EA580C" />
                <h2>Heirloom 500-Pack Guaranteed Pity Counter</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setApexPacksOpened(185);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Apex guarantees 150 Heirloom Shards on or before pack #500. Track your opened packs and remaining Apex Coin value.
            </p>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <div className="label-with-value">
                <span>Total Packs Opened (Account + Battle Pass + Store)</span>
                <strong>{apexPityMath.opened} / 500 ({apexPityMath.pct}%)</strong>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                value={apexPacksOpened}
                onChange={(e) => setApexPacksOpened(Number(e.target.value))}
              />
            </label>

            <div className="preset-toggle-row" style={{ marginBottom: 14 }}>
              {[100, 199, 300, 425].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`subtab-btn ${apexPacksOpened === preset ? 'active' : ''}`}
                  onClick={() => setApexPacksOpened(preset)}
                >
                  {preset === 199 ? '199 (Lvl 500 Free)' : `${preset} Packs`}
                </button>
              ))}
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#EA580C' }}>
              <div className="result-label">Packs until guaranteed 150 Heirloom Shards</div>
              <div className="result-number" style={{ color: '#EA580C' }}>
                {apexPityMath.remaining} Packs Remaining
              </div>
              <div className="result-detail">
                Store equivalent: <strong>{apexPityMath.coinsCost.toLocaleString()} Apex Coins</strong> (~${apexPityMath.approxUsd} USD). Reminder: Collection Event packs do not advance your standard 500-pack pity counter.
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `Apex Heirloom Pity: ${apexPityMath.opened}/500 opened (${apexPityMath.pct}%) — ${apexPityMath.remaining} packs left`,
                      'apex'
                    )
                  }
                >
                  {copiedKey === 'apex' ? <Check size={14} color="#EA580C" /> : <Copy size={14} />}
                  <span>{copiedKey === 'apex' ? 'Copied Pity Count' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `Heirloom Pity (${apexPityMath.opened}/500)`,
                      `${apexPityMath.remaining} packs remaining`
                    )
                  }
                >
                  <Bookmark size={13} color="#EA580C" />
                  <span>Pin Count</span>
                </button>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}

      {/* 9. GTA ONLINE: CAYO PERICO & CASINO PAYOUT SPLIT */}
      {game.id === 'gta-v' && (
        <div className="calculator-grid-layout">
          <div className="calc-card" onMouseMove={handleCardSpotlight}>
            <div className="calc-card-top-row">
              <div className="calc-card-header">
                <DollarSign size={19} color="#2563EB" />
                <h2>Cayo Perico &amp; Casino Heist Net Cut Splitter</h2>
              </div>
              <button
                type="button"
                className="calc-reset-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 690);
                  setCayoPrimaryTarget(1300000);
                  setCayoSecondaryLoot(450000);
                  setCayoCrewMembers(2);
                  setCayoHostPct(70);
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <p className="calc-card-sub">
              Automatically deducts Pavel&apos;s 2% cut and the 10% fencing fee, then splits net loot cleanly between host and crew.
            </p>

            <div className="slider-pair-grid">
              <label>
                <div className="label-with-value">
                  <span>Primary Target</span>
                  <strong>${Number(cayoPrimaryTarget).toLocaleString()}</strong>
                </div>
                <select
                  value={cayoPrimaryTarget}
                  onChange={(e) => setCayoPrimaryTarget(Number(e.target.value))}
                  className="deck-input no-icon"
                >
                  <option value={1900000}>Panther Statue ($1,900,000 Event)</option>
                  <option value={1300000}>Pink Diamond ($1,300,000)</option>
                  <option value={1100000}>Madrazo Files / Bonds ($1,100,000)</option>
                  <option value={770000}>Bearer Bonds Base ($770,000)</option>
                  <option value={700000}>Ruby Necklace ($700,000)</option>
                  <option value={630000}>Sinsimito Tequila ($630,000)</option>
                </select>
              </label>

              <label>
                <div className="label-with-value">
                  <span>Secondary Loot Bags</span>
                  <strong>${Number(cayoSecondaryLoot).toLocaleString()}</strong>
                </div>
                <input
                  type="number"
                  step={50000}
                  value={cayoSecondaryLoot}
                  onChange={(e) => setCayoSecondaryLoot(Number(e.target.value))}
                  className="deck-input no-icon"
                />
              </label>
            </div>

            <div className="slider-pair-grid">
              <label>
                <div className="label-with-value">
                  <span>Squad Size</span>
                  <strong>{cayoCrewMembers} {cayoCrewMembers === 1 ? 'Solo' : 'Players'}</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={cayoCrewMembers}
                  onChange={(e) => setCayoCrewMembers(Number(e.target.value))}
                />
              </label>

              <label>
                <div className="label-with-value">
                  <span>Host Cut Percentage</span>
                  <strong>{cayoMath.effectiveHostPct}%</strong>
                </div>
                <input
                  type="range"
                  min={15}
                  max={85}
                  step={5}
                  disabled={cayoCrewMembers === 1}
                  value={cayoHostPct}
                  onChange={(e) => setCayoHostPct(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="calc-result-showcase" style={{ borderColor: '#2563EB' }}>
              <div className="result-label">Net crew pool after Pavel 2% + Fence 10%</div>
              <div className="result-number" style={{ color: '#2563EB' }}>
                ${cayoMath.netPool.toLocaleString()}
              </div>
              <div className="result-detail">
                Host ({cayoMath.effectiveHostPct}%): <strong>${cayoMath.hostPayout.toLocaleString()}</strong>
                {cayoCrewMembers > 1 && (
                  <>
                    {' '}· Each Crew Member ({Math.round((100 - cayoMath.effectiveHostPct) / (cayoCrewMembers - 1))}%):{' '}
                    <strong>${cayoMath.crewPayoutEach.toLocaleString()}</strong>
                  </>
                )}{' '}
                · Fees deducted: -${(cayoMath.pavelCut + cayoMath.fencingFee).toLocaleString()}.
              </div>
              <div className="calc-action-bar">
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() =>
                    copyToClipboard(
                      `Cayo Perico Split (${cayoCrewMembers}P, Net $${cayoMath.netPool.toLocaleString()}): Host ${cayoMath.effectiveHostPct}% = $${cayoMath.hostPayout.toLocaleString()}${cayoCrewMembers > 1 ? ` · Crew = $${cayoMath.crewPayoutEach.toLocaleString()} each` : ''}`,
                      'cayo'
                    )
                  }
                >
                  {copiedKey === 'cayo' ? <Check size={14} color="#2563EB" /> : <Copy size={14} />}
                  <span>{copiedKey === 'cayo' ? 'Copied Heist Split' : 'Copy for Discord'}</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() =>
                    handlePinSnapshot(
                      `Cayo ${cayoCrewMembers}P (${cayoMath.effectiveHostPct}% Host)`,
                      `Host $${cayoMath.hostPayout.toLocaleString()}${cayoCrewMembers > 1 ? ` / Crew $${cayoMath.crewPayoutEach.toLocaleString()}` : ''}`
                    )
                  }
                >
                  <Bookmark size={13} color="#2563EB" />
                  <span>Pin Split</span>
                </button>
              </div>
            </div>
          </div>
          {renderSideMetaDeck()}
        </div>
      )}
    </div>
  );
}

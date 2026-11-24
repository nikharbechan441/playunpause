import React, { useMemo, useState } from 'react';
import { Check, Copy, Eye, KeyRound, Lock, ShieldAlert, Vault } from 'lucide-react';
import {
  LEONIDA_APOLLO_LOOP,
  LEONIDA_BEST_ENDING_GUARD,
  LEONIDA_CHEAT_CATEGORIES,
  LEONIDA_HEAT_FACTORS,
  LEONIDA_MONEY_CHAPTERS,
  LEONIDA_PROFILE_TIERS,
  LEONIDA_STAR_STATES,
  LEONIDA_STATIC_KEYPADS,
  LEONIDA_ULTIMATE_UNLOCKS,
  LEONIDA_VERIFIED_CHEATS,
} from '../../../data/games/leonidaV2Data.js';

export default function LeonidaHeatMoneyCheatsTab({
  state,
  activeRoutePath = '/gta-6',
  onSelectStarState,
  onToggleHeatFactor,
  onSelectProfileTier,
  onToggleCheckedCheat,
  onShowToast,
}) {
  const [unlockedCardIds, setUnlockedCardIds] = useState(() => new Set());
  const [cheatPlatform, setCheatPlatform] = useState('ps5');
  const [cheatCategory, setCheatCategory] = useState('All');

  const unlockId = (id) => {
    setUnlockedCardIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const activeStar =
    LEONIDA_STAR_STATES.find((s) => s.id === state.starState) || LEONIDA_STAR_STATES[4];
  const activeHeatObjects = LEONIDA_HEAT_FACTORS.filter((h) => state.activeHeat.includes(h.id));
  const activeProfile =
    LEONIDA_PROFILE_TIERS.find((p) => p.id === state.profileTier) || LEONIDA_PROFILE_TIERS[0];

  const isRobberiesRoute = activeRoutePath === '/gta-6/robberies';
  const isMoneyRoute = activeRoutePath === '/gta-6/money';
  const isCheatsRoute = activeRoutePath === '/gta-6/cheats';
  const isUltimateRoute = activeRoutePath === '/gta-6/ultimate';

  const cheatsLocked = !isCheatsRoute && state.chapter < 5 && !unlockedCardIds.has('cheats-section');
  const checkedCheats = Array.isArray(state.checkedCheats) ? state.checkedCheats : [];

  const filteredCheats = useMemo(() => {
    if (cheatCategory === 'All') return LEONIDA_VERIFIED_CHEATS;
    if (cheatCategory === 'Environment') {
      return LEONIDA_VERIFIED_CHEATS.filter(
        (c) => c.category === 'Environment' || c.category === 'Screen Filters'
      );
    }
    return LEONIDA_VERIFIED_CHEATS.filter((c) => c.category === cheatCategory);
  }, [cheatCategory]);

  const handleCopyCheat = async (cheat) => {
    if (cheat.codeTbc || !cheat.dpad?.length) return;
    const trigger = cheatPlatform === 'xbox' ? 'Phone Up + Hold LB + RB' : 'Phone Up + Hold L1 + R1';
    const text = `${cheat.name}: ${trigger} -> ${cheat.dpad.join(' ')}`;
    try {
      await navigator.clipboard.writeText(text);
      onShowToast?.(`Copied ${cheat.name} D-Pad sequence.`);
    } catch {
      onShowToast?.(text);
    }
  };

  const robberyMoneySection = (
    <section id="leonida-money-section" className="lh-card" aria-labelledby="lh-money-heading">
      <div className="lh-card-header">
        <div>
          <h2 id="lh-money-heading" className="lh-card-title">
            {isRobberiesRoute
              ? 'Safe Codes (Static + Randomized) & 4-Tier Robberies'
              : isUltimateRoute
                ? '$99.99 Ultimate Edition & Chapter-Gated Money'
                : 'Money, Apollo Aggregates Loop & Safe Codes'}
          </h2>
          <p className="lh-card-sub">
            {isRobberiesRoute
              ? 'Static mission/lockup keypads vs randomized free-roam safes (scan backrooms with Focus L3+R3) + Ch. 1–4 economy.'
              : 'Live Patch 01.002.002 economy rules, $20K loose-cash cap warning, and chapter-gated robbery payouts.'}
          </p>
        </div>
        <span className="lh-badge teal lh-num">SINGLE-PLAYER</span>
      </div>

      {/* Ultimate Edition priority card on /gta-6/ultimate */}
      {isUltimateRoute && (
        <div className="lh-inset-strip gold-border" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <strong style={{ fontSize: '0.92rem', color: 'var(--lh-gold)' }}>
              $99.99 Ultimate Edition Unlocks (Chapter-Gated)
            </strong>
            <span className="lh-badge coral">NO CH. 1 BOAT UNLOCK</span>
          </div>
          <div className="lh-money-grid">
            {LEONIDA_ULTIMATE_UNLOCKS.map((u) => (
              <div key={u.id} style={{ backgroundColor: 'var(--lh-surface)', border: '1px solid var(--lh-hairline)', borderRadius: '8px', padding: '9px 11px' }}>
                <span className="lh-badge gold" style={{ marginBottom: '4px' }}>{u.badge}</span>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.title}</div>
                <div className="lh-card-sub" style={{ marginTop: '3px' }}>{u.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Static Lockup & Mission Keypads + Randomized Free-Roam Rule (unblurred always for searcher scent!) */}
      <div className="lh-inset-strip gold-border" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <strong style={{ fontSize: '0.9rem', color: 'var(--lh-gold)' }}>
            <Vault size={14} aria-hidden="true" style={{ marginRight: '6px', verticalAlign: '-2px' }} />
            Static Mission / Lockup Keypads vs. Randomized Open-World Safes
          </strong>
          <span className="lh-badge gold lh-num">7700 · 0420 · Focus L3+R3</span>
        </div>
        <div className="lh-money-grid" style={{ marginBottom: '8px' }}>
          {LEONIDA_STATIC_KEYPADS.map((kp) => (
            <div key={kp.id} style={{ backgroundColor: 'var(--lh-surface)', border: '1px solid var(--lh-hairline)', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '0.84rem' }}>{kp.name}</strong>
                <span className="lh-badge teal lh-num" style={{ fontSize: '0.82rem' }}>{kp.code}</span>
              </div>
              <p className="lh-card-sub" style={{ margin: '4px 0 0' }}>{kp.note}</p>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--lh-ivory)' }}>
          <strong>Randomized Free-Roam Safes (24/7, Pawn, Banks):</strong> Combinations randomize every playthrough — use{' '}
          <strong>Focus Mode (L3+R3)</strong> inside backrooms to read sticky notes/invoices and shoot{' '}
          <strong>Cloud-icon CCTV cameras</strong> first + equip the <strong>Ch. 3 Dye Pack Jammer</strong> before cracking vaults.
        </div>
      </div>

      {/* Live Apollo Aggregates Loop (Nov 24 status: UNPATCHED in 01.002.002) */}
      <div className="lh-inset-strip teal-border" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <strong style={{ fontSize: '0.9rem', color: 'var(--lh-teal)' }}>{LEONIDA_APOLLO_LOOP.title}</strong>
          <span className="lh-badge teal lh-num">{LEONIDA_APOLLO_LOOP.statusBadge}</span>
        </div>
        <div className="lh-card-sub" style={{ marginTop: 0, color: 'var(--lh-ivory)' }}>
          <strong>Location:</strong> {LEONIDA_APOLLO_LOOP.location}. {LEONIDA_APOLLO_LOOP.summary}
        </div>
        <ol style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '0.79rem', color: 'var(--lh-slate)' }}>
          {LEONIDA_APOLLO_LOOP.steps.map((step) => (
            <li key={step} style={{ marginTop: '3px' }}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="lh-inset-strip coral-border" style={{ marginBottom: '12px' }}>
        <strong style={{ color: 'var(--lh-coral)', fontSize: '0.85rem' }}>
          $20,000 Cash Cap &amp; Drop Warning:{' '}
        </strong>
        <span style={{ fontSize: '0.83rem' }}>
          Getting Wasted or Busted drops ALL loose wallet cash and stash bags. Deposit via BuckMe -&gt; ATM Finder (D-Pad Up) early!
        </span>
      </div>

      <div className="lh-money-grid">
        {LEONIDA_MONEY_CHAPTERS.map((tier) => {
          const skipBlurForRoute = isRobberiesRoute || isMoneyRoute || isUltimateRoute;
          const locked = !skipBlurForRoute && tier.chapter > state.chapter && !unlockedCardIds.has(tier.id);
          return (
            <article key={tier.id} className="lh-spoiler-card">
              <div className={locked ? 'lh-spoiler-blur' : ''}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="lh-badge gold lh-num">{tier.badge}</span>
                  <span className="lh-badge teal lh-num">{tier.payout}</span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '0.96rem', fontWeight: 700 }}>{tier.title}</h3>
                <p className="lh-card-sub" style={{ margin: 0 }}>{tier.detail}</p>
              </div>

              {locked && (
                <div className="lh-spoiler-gate">
                  <span className="lh-badge coral">
                    <Lock size={12} aria-hidden="true" /> Masked at Ch. {tier.chapter}
                  </span>
                  <button
                    type="button"
                    className="lh-btn primary-gold lh-pressable"
                    onClick={() => unlockId(tier.id)}
                  >
                    <Eye size={14} aria-hidden="true" />
                    <span>Unlock</span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );

  const heatProfileSection = (
    <>
      {/* 6-Star Heat Decoder & Escape Playbook */}
      <section className="lh-card" aria-labelledby="lh-heat-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-heat-heading" className="lh-card-title">
              6-Star Heat Decoder &amp; Escape Playbook
            </h2>
            <p className="lh-card-sub">
              Match your Wanted star color and active red Heat icons for the immediate clean escape protocol.
            </p>
          </div>
          <span className="lh-badge teal">SPOILER-FREE</span>
        </div>

        <div className="lh-star-grid" role="group" aria-label="Wanted Star Color State">
          {LEONIDA_STAR_STATES.map((star) => {
            const active = state.starState === star.id;
            const isCoral = star.id === 'red' || star.id === 'r_out';
            return (
              <button
                key={star.id}
                type="button"
                aria-pressed={active}
                className={`lh-btn lh-pressable ${active ? (isCoral ? 'active-coral' : 'active-gold') : ''}`}
                style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '9px 11px', minHeight: '58px' }}
                onClick={() => onSelectStarState(star.id)}
              >
                <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{star.label}</span>
                <span style={{ fontSize: '0.73rem', color: 'var(--lh-slate)' }}>{star.subtitle}</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--lh-slate)', marginBottom: '6px' }}>
            ACTIVE RED HEAT FACTORS (MULTI-SELECT):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {LEONIDA_HEAT_FACTORS.map((factor) => {
              const active = state.activeHeat.includes(factor.id);
              return (
                <button
                  key={factor.id}
                  type="button"
                  aria-pressed={active}
                  className={`lh-btn lh-pressable ${active ? 'active-coral' : ''}`}
                  onClick={() => onToggleHeatFactor(factor.id)}
                >
                  {factor.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lh-inset-strip coral-border">
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--lh-coral)' }}>
            ESCAPE PLAN: {activeStar.label.toUpperCase()} ({activeStar.subtitle})
          </div>
          <p className="lh-card-sub" style={{ color: 'var(--lh-ivory)', marginTop: '4px' }}>
            {activeStar.action}
          </p>
          {activeHeatObjects.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--lh-slate)' }}>
              {activeHeatObjects.map((item) => (
                <li key={item.id} style={{ marginTop: '3px' }}>
                  <strong style={{ color: 'var(--lh-ivory)' }}>{item.label}:</strong> {item.clearStep}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Criminal Profile & Spoiler-Free Best Ending Guard */}
      <section className="lh-card" aria-labelledby="lh-profile-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-profile-heading" className="lh-card-title">
              Criminal Profile &amp; Best Ending Guard
            </h2>
            <p className="lh-card-sub">
              Tracked separately for Jason &amp; Lucia via Map &gt; Jason &amp; Lucia · Spoiler-free ending protection.
            </p>
          </div>
          <span className={`lh-badge ${activeProfile.tone === 'coral' ? 'coral' : activeProfile.tone === 'gold' ? 'gold' : 'teal'}`}>
            {activeProfile.label.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {LEONIDA_PROFILE_TIERS.map((tier) => {
            const active = state.profileTier === tier.id;
            const activeCls =
              tier.tone === 'coral'
                ? 'active-coral'
                : tier.tone === 'gold'
                  ? 'active-gold'
                  : 'active-teal';
            return (
              <button
                key={tier.id}
                type="button"
                aria-pressed={active}
                className={`lh-btn lh-pressable ${active ? activeCls : ''}`}
                onClick={() => onSelectProfileTier(tier.id)}
              >
                {tier.label}
              </button>
            );
          })}
        </div>

        <div className={`lh-inset-strip ${activeProfile.tone === 'coral' ? 'coral-border' : activeProfile.tone === 'gold' ? 'gold-border' : 'teal-border'}`} style={{ marginBottom: '10px' }}>
          <strong style={{ fontSize: '0.86rem' }}>{activeProfile.label}: </strong>
          <span style={{ fontSize: '0.84rem', color: 'var(--lh-ivory)' }}>{activeProfile.detail}</span>
        </div>

        <div className="lh-inset-strip teal-border">
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--lh-teal)', marginBottom: '4px' }}>
            <ShieldAlert size={13} aria-hidden="true" style={{ marginRight: '5px', verticalAlign: '-2px' }} />
            BEST ENDING GUARD (NO PLOT SPOILERS)
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.79rem', color: 'var(--lh-slate)' }}>
            {LEONIDA_BEST_ENDING_GUARD.map((rule) => (
              <li key={rule} style={{ marginTop: '3px' }}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );

  const verifiedCheatsSection = (
    <section id="leonida-cheats-section" className="lh-card" aria-labelledby="lh-cheats-heading">
      <div className="lh-card-header">
        <div>
          <h2 id="lh-cheats-heading" className="lh-card-title">
            <KeyRound size={16} aria-hidden="true" style={{ marginRight: '6px', verticalAlign: '-2px' }} />
            Verified D-Pad Cheat Deck &amp; Challenge Tracker (61 In-Game)
          </h2>
          <p className="lh-card-sub">
            Beat story (~91 missions) + unlock each cheat challenge in Progress &gt; Cheats, then raise Phone (↑) + Hold{' '}
            {cheatPlatform === 'xbox' ? 'LB + RB' : 'L1 + R1'} + pure D-Pad arrows.
          </p>
        </div>
        <span className="lh-badge coral">Disables Trophies &amp; Saving</span>
      </div>

      <div className="lh-inset-strip coral-border" style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.82rem' }}>
          <strong>Zero Face Buttons:</strong> GTA VI codes use <strong>D-Pad arrows ONLY</strong> (↑ ↓ ← →).{' '}
          Unverified sequences are marked <strong>TBC</strong> instead of guessing.
        </span>
        <span className="lh-badge teal lh-num">
          {checkedCheats.length} / {LEONIDA_VERIFIED_CHEATS.length} UNLOCKED
        </span>
      </div>

      {/* Platform Trigger + Category Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} role="group" aria-label="Trigger platform">
          <button
            type="button"
            aria-pressed={cheatPlatform === 'ps5'}
            className={`lh-btn lh-pressable ${cheatPlatform === 'ps5' ? 'active-coral' : ''}`}
            onClick={() => setCheatPlatform('ps5')}
          >
            PS5 (Phone ↑ + L1+R1)
          </button>
          <button
            type="button"
            aria-pressed={cheatPlatform === 'xbox'}
            className={`lh-btn lh-pressable ${cheatPlatform === 'xbox' ? 'active-coral' : ''}`}
            onClick={() => setCheatPlatform('xbox')}
          >
            Xbox (Phone ↑ + LB+RB)
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} role="group" aria-label="Filter cheat category">
          {LEONIDA_CHEAT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={cheatCategory === cat.id}
              className={`lh-btn lh-pressable ${cheatCategory === cat.id ? 'active-gold' : ''}`}
              onClick={() => setCheatCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lh-spoiler-card" style={{ padding: 0, border: 0, backgroundColor: 'transparent' }}>
        <div className={`lh-money-grid ${cheatsLocked ? 'lh-spoiler-blur' : ''}`}>
          {filteredCheats.map((cheat) => {
            const done = checkedCheats.includes(cheat.id);
            return (
              <article key={cheat.id} className="lh-inset-strip">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                  <div>
                    <span className={`lh-badge lh-num ${cheat.codeTbc ? 'gold' : 'teal'}`} style={{ marginBottom: '4px' }}>
                      {cheat.category} · {cheat.status}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700 }}>{cheat.name}</h3>
                  </div>
                  <button
                    type="button"
                    aria-pressed={done}
                    className={`lh-btn lh-pressable ${done ? 'primary-teal' : ''}`}
                    style={{ minHeight: '30px', padding: '4px 9px', fontSize: '0.73rem' }}
                    onClick={() => onToggleCheckedCheat?.(cheat.id)}
                  >
                    {done ? (
                      <>
                        <Check size={12} aria-hidden="true" />
                        <span>Done</span>
                      </>
                    ) : (
                      <span>Track</span>
                    )}
                  </button>
                </div>

                <p className="lh-card-sub" style={{ margin: '0 0 6px' }}>
                  {cheat.effect} <strong>Unlock:</strong> {cheat.unlockChallenge}.
                </p>

                {cheat.codeTbc ? (
                  <div className="lh-badge gold">D-Pad Sequence: TBC (Challenge Requirement Verified)</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '6px', backgroundColor: 'var(--lh-obsidian)', border: '1px solid var(--lh-hairline)', borderRadius: '7px', padding: '6px 9px' }}>
                    <span className="lh-num" style={{ fontSize: '0.92rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--lh-gold)' }}>
                      {cheat.dpad.join(' ')}
                    </span>
                    <button
                      type="button"
                      className="lh-btn lh-pressable"
                      style={{ minHeight: '28px', padding: '2px 8px', fontSize: '0.72rem' }}
                      onClick={() => handleCopyCheat(cheat)}
                    >
                      <Copy size={12} aria-hidden="true" />
                      <span>Copy</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {cheatsLocked && (
          <div className="lh-spoiler-gate" style={{ borderRadius: '9px' }}>
            <span className="lh-badge coral">
              <Lock size={12} aria-hidden="true" /> Post-Story Cheats Protocol Shielded
            </span>
            <button
              type="button"
              className="lh-btn primary-gold lh-pressable"
              onClick={() => unlockId('cheats-section')}
            >
              <Eye size={14} aria-hidden="true" />
              <span>Unlock Post-Story Cheats</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );

  // Route-priority order so GSC searchers land directly on what the URL promised above the fold!
  if (isCheatsRoute) {
    return (
      <>
        {verifiedCheatsSection}
        {robberyMoneySection}
        {heatProfileSection}
      </>
    );
  }

  if (isRobberiesRoute || isMoneyRoute || isUltimateRoute) {
    return (
      <>
        {robberyMoneySection}
        {heatProfileSection}
        {verifiedCheatsSection}
      </>
    );
  }

  return (
    <>
      {heatProfileSection}
      {robberyMoneySection}
      {verifiedCheatsSection}
    </>
  );
}

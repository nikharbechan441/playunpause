import React, { useState } from 'react';
import { Eye, Lock } from 'lucide-react';
import {
  LEONIDA_CHEAT_CARDS,
  LEONIDA_HEAT_FACTORS,
  LEONIDA_MONEY_CHAPTERS,
  LEONIDA_PROFILE_TIERS,
  LEONIDA_STAR_STATES,
} from '../../../data/games/leonidaV2Data.js';

export default function LeonidaHeatMoneyCheatsTab({
  state,
  onSelectStarState,
  onToggleHeatFactor,
  onSelectProfileTier,
}) {
  const [unlockedCardIds, setUnlockedCardIds] = useState(() => new Set());
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

  const cheatsLocked = state.chapter < 5 && !unlockedCardIds.has('cheats-section');

  return (
    <>
      {/* 1. 6-Star Heat Decoder & Escape Playbook */}
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

      {/* 2. Criminal Profile Guard */}
      <section className="lh-card" aria-labelledby="lh-profile-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-profile-heading" className="lh-card-title">
              Criminal Profile Guard
            </h2>
            <p className="lh-card-sub">
              Tracked separately for Jason &amp; Lucia · Shapes 4+ Story Endings.
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

        <div className={`lh-inset-strip ${activeProfile.tone === 'coral' ? 'coral-border' : activeProfile.tone === 'gold' ? 'gold-border' : 'teal-border'}`}>
          <strong style={{ fontSize: '0.86rem' }}>{activeProfile.label}: </strong>
          <span style={{ fontSize: '0.84rem', color: 'var(--lh-ivory)' }}>{activeProfile.detail}</span>
        </div>
      </section>

      {/* 3. Money & Robbery Meta (Spoiler-Shielded) */}
      <section id="leonida-money-section" className="lh-card" aria-labelledby="lh-money-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-money-heading" className="lh-card-title">
              Money &amp; Robbery Meta (Single-Player)
            </h2>
            <p className="lh-card-sub">
              Chapter-gated economy loops and randomized safe rules. Automatically blurs chapters above your active Spoiler Shield.
            </p>
          </div>
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
            const locked = tier.chapter > state.chapter && !unlockedCardIds.has(tier.id);
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

      {/* 4. 61 Cheats Unlock Protocol (POST-locked) */}
      <section id="leonida-cheats-section" className="lh-card" aria-labelledby="lh-cheats-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-cheats-heading" className="lh-card-title">
              61 Cheats Unlock Protocol
            </h2>
            <p className="lh-card-sub">
              Unlocks post-credits behind Unlock Challenges. Keep a clean manual save slot before triggering any code.
            </p>
          </div>
          <span className="lh-badge coral">Disables Trophies &amp; Saving</span>
        </div>

        <div className="lh-spoiler-card" style={{ padding: 0, border: 0, backgroundColor: 'transparent' }}>
          <div className={`lh-money-grid ${cheatsLocked ? 'lh-spoiler-blur' : ''}`}>
            {LEONIDA_CHEAT_CARDS.map((card) => (
              <article key={card.id} className="lh-inset-strip">
                <span className="lh-badge gold lh-num" style={{ marginBottom: '6px' }}>{card.badge}</span>
                <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>{card.title}</h3>
                <p className="lh-card-sub lh-num" style={{ margin: 0 }}>{card.detail}</p>
              </article>
            ))}
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
    </>
  );
}

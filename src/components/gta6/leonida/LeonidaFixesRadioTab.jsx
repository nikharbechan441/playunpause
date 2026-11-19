import React from 'react';
import { Headphones, Search } from 'lucide-react';
import {
  LEONIDA_LAUNCH_FIXES,
  LEONIDA_RADIO_STATIONS,
} from '../../../data/games/leonidaV2Data.js';

export default function LeonidaFixesRadioTab({
  state,
  onSelectFix,
  onChangeRadioQuery,
}) {
  const activeFix =
    LEONIDA_LAUNCH_FIXES.find((f) => f.id === state.activeFix) || LEONIDA_LAUNCH_FIXES[0];

  const q = String(state.radioQuery || '').trim().toLowerCase();
  const filteredStations = q
    ? LEONIDA_RADIO_STATIONS.filter((st) =>
        `${st.num} ${st.name} ${st.genre} ${st.hosts} ${st.tracks} ${st.unlockNote || ''}`
          .toLowerCase()
          .includes(q)
      )
    : LEONIDA_RADIO_STATIONS;

  return (
    <>
      {/* 1. Launch-Day Crash & PSN Triage */}
      <section className="lh-card" aria-labelledby="lh-fixes-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-fixes-heading" className="lh-card-title">
              Launch-Day Crash, PSN &amp; Fast-Travel Triage
            </h2>
            <p className="lh-card-sub">
              Pick a launch symptom for step-by-step PS5/Xbox recovery, PSN offline bypasses, and RydeMe car rules.
            </p>
          </div>
          <span className="lh-badge teal">5 VERIFIED FIXES</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {LEONIDA_LAUNCH_FIXES.map((fix) => {
            const active = state.activeFix === fix.id;
            return (
              <button
                key={fix.id}
                type="button"
                aria-pressed={active}
                className={`lh-btn lh-pressable ${active ? (fix.isScam ? 'active-coral' : 'active-gold') : ''}`}
                onClick={() => onSelectFix(fix.id)}
              >
                {fix.label}
              </button>
            );
          })}
        </div>

        <div className={`lh-inset-strip ${activeFix.isScam ? 'coral-border' : 'teal-border'}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <strong style={{ fontSize: '0.96rem', color: activeFix.isScam ? 'var(--lh-coral)' : 'var(--lh-ivory)' }}>
              {activeFix.label}
            </strong>
            <span className={`lh-badge lh-num ${activeFix.isScam ? 'coral' : 'teal'}`}>{activeFix.badge}</span>
          </div>
          <p className="lh-card-sub" style={{ color: 'var(--lh-ivory)', marginBottom: '8px' }}>
            {activeFix.summary}
          </p>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.83rem', color: 'var(--lh-slate)' }}>
            {activeFix.steps.map((step) => (
              <li key={step} style={{ marginTop: '4px' }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 2. Leonida Radio & On-Foot Headphones (All 23 Stations) */}
      <section id="leonida-radio-section" className="lh-card" aria-labelledby="lh-radio-heading">
        <div className="lh-card-header">
          <div>
            <h2 id="lh-radio-heading" className="lh-card-title">
              Leonida Radio &amp; On-Foot Headphones (All 23 Stations)
            </h2>
            <p className="lh-card-sub">
              22 verified launch dial stations plus Secret #23 The Vault Radio — filter by station, genre, host, or verified track.
            </p>
          </div>
          <span className="lh-badge gold lh-num">{filteredStations.length} / 23 SHOWN</span>
        </div>

        <div className="lh-inset-strip gold-border" style={{ marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Headphones size={18} color="#F5A623" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
          <div style={{ fontSize: '0.83rem' }}>
            <strong>On-Foot Headphones Rule:</strong> Buy headphones ($100+ at Electronics Stores) separately for Jason and Lucia; permanently lost if knocked off in combat.
          </div>
        </div>

        <div className="lh-search-input-box" style={{ maxWidth: '420px' }}>
          <Search size={15} className="lh-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="lh-search-input"
            aria-label="Filter all 23 Leonida radio stations"
            placeholder="Filter all 23 stations, genres, hosts, Vault..."
            value={state.radioQuery}
            onChange={(e) => onChangeRadioQuery(e.target.value)}
          />
          {state.radioQuery && (
            <button
              type="button"
              className="lh-btn lh-pressable"
              style={{ minHeight: '26px', padding: '2px 8px', fontSize: '0.72rem' }}
              onClick={() => onChangeRadioQuery('')}
            >
              Clear
            </button>
          )}
        </div>

        <div className="lh-radio-grid">
          {filteredStations.map((st) => (
            <article key={st.id} className={`lh-radio-card ${st.secret ? 'secret' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '0.9rem' }}>
                  <span className="lh-num" style={{ color: st.secret ? 'var(--lh-gold)' : 'var(--lh-slate)', marginRight: '6px' }}>
                    #{String(st.num).padStart(2, '0')}
                  </span>
                  {st.name}
                </strong>
                <span className={`lh-badge ${st.secret ? 'gold' : ''}`}>{st.genre}</span>
              </div>
              {st.hosts && (
                <div className="lh-card-sub" style={{ marginTop: '4px' }}>
                  <strong>Hosts:</strong> {st.hosts}
                </div>
              )}
              {st.tracks && (
                <div className="lh-card-sub" style={{ marginTop: '3px', color: 'var(--lh-ivory)' }}>
                  {st.tracks}
                </div>
              )}
              {st.unlockNote && (
                <div className="lh-card-sub" style={{ marginTop: '4px', color: 'var(--lh-gold)', fontWeight: 600 }}>
                  {st.unlockNote}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

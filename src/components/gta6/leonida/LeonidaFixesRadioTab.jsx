import React, { useState } from 'react';
import { Headphones, Search } from 'lucide-react';
import {
  LEONIDA_LAUNCH_FIXES,
  LEONIDA_PHONE_MYTHBUSTERS,
  LEONIDA_RADIO_STATIONS,
} from '../../../data/games/leonidaV2Data.js';

export default function LeonidaFixesRadioTab({
  state,
  activeRoutePath = '/gta-6/fixes',
  externalRadioQuery = '',
  externalRadioNonce = 0,
  onSelectFix,
}) {
  const [localRadioQuery, setLocalRadioQuery] = useState(externalRadioQuery || '');
  const [lastSyncedNonce, setLastSyncedNonce] = useState(externalRadioNonce);

  if (externalRadioNonce !== lastSyncedNonce) {
    setLastSyncedNonce(externalRadioNonce);
    setLocalRadioQuery(externalRadioQuery || '');
  }

  const activeFix =
    LEONIDA_LAUNCH_FIXES.find((f) => f.id === state.activeFix) || LEONIDA_LAUNCH_FIXES[0];

  const q = String(localRadioQuery || '').trim().toLowerCase();
  const filteredStations = q
    ? LEONIDA_RADIO_STATIONS.filter((st) =>
        `${st.num} ${st.name} ${st.genre} ${st.hosts} ${st.tracks} ${st.unlockNote || ''}`
          .toLowerCase()
          .includes(q)
      )
    : LEONIDA_RADIO_STATIONS;

  const isRadioRoute = activeRoutePath === '/gta-6/radio';

  const fixesSection = (
    <section className="lh-card" aria-labelledby="lh-fixes-heading">
      <div className="lh-card-header">
        <div>
          <h2 id="lh-fixes-heading" className="lh-card-title">
            Patch 01.002.002 / 1.0.2.2, PSN &amp; Phone Mythbusters
          </h2>
          <p className="lh-card-sub">
            Pick a launch issue for Nov 23 Patch 01.002.002 notes, PSN offline bypasses, and Skunk Ape / RydeMe answers.
          </p>
        </div>
        <span className="lh-badge teal">6 VERIFIED FIXES</span>
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

      <div className={`lh-inset-strip ${activeFix.isScam ? 'coral-border' : 'teal-border'}`} style={{ marginBottom: '12px' }}>
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

      {/* Compact Verified Phone & Skunk Ape Mythbuster */}
      <div className="lh-inset-strip gold-border">
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--lh-gold)', marginBottom: '4px' }}>
          PHONE &amp; SECRET KEYPAD MYTHBUSTERS
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--lh-slate)' }}>
          {LEONIDA_PHONE_MYTHBUSTERS.map((item) => (
            <li key={item.title} style={{ marginTop: '3px' }}>
              <strong style={{ color: 'var(--lh-ivory)' }}>{item.title}:</strong> {item.detail}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  const radioSection = (
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
          value={localRadioQuery}
          onChange={(e) => setLocalRadioQuery(e.target.value)}
        />
        {localRadioQuery && (
          <button
            type="button"
            className="lh-btn lh-pressable"
            style={{ minHeight: '26px', padding: '2px 8px', fontSize: '0.72rem' }}
            onClick={() => setLocalRadioQuery('')}
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
  );

  return isRadioRoute ? (
    <>
      {radioSection}
      {fixesSection}
    </>
  ) : (
    <>
      {fixesSection}
      {radioSection}
    </>
  );
}

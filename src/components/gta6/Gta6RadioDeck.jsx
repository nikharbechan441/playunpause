import React, { useMemo, useState } from 'react';
import {
  Radio,
  Search,
  VolumeX,
  Headphones,
  Disc3,
  Mic,
} from 'lucide-react';
import {
  GTA6_RADIO_GUIDES,
  GTA6_RADIO_META,
  GTA6_RADIO_STATIONS,
} from '../../data/games/gta6LaunchTools.js';
import { SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import { playSwitchTick, triggerHaptic } from '../../utils/soundHaptics.js';

export default function Gta6RadioDeck({ soundEnabled = true }) {
  const [genreFilter, setGenreFilter] = useState('All');
  const [query, setQuery] = useState('');

  const genres = useMemo(
    () => ['All', ...GTA6_RADIO_STATIONS.map((s) => s.genre)],
    []
  );

  const visibleStations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GTA6_RADIO_STATIONS.filter((station) => {
      if (genreFilter !== 'All' && station.genre !== genreFilter) return false;
      if (!q) return true;
      const blob = [station.name, station.genre, ...station.hosts, ...station.tracks]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [genreFilter, query]);

  return (
    <section className="deck-panel" aria-label="GTA VI Verified 6-Station Radio Launch Preview">
      <div className="deck-body-pad">
        <div className="cheat-controls-row">
          <span className="mono gw-patch-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={13} aria-hidden="true" />
            <span>{GTA6_RADIO_META.badgeLabel}</span>
          </span>
        </div>

        {/* Genre Filters & Search */}
        <div className="cheat-controls-row" style={{ alignItems: 'stretch' }}>
          <div className="filter-row" role="group" aria-label="Filter stations by genre" style={{ marginBottom: 0 }}>
            {genres.map((g) => {
              const active = genreFilter === g;
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={active}
                  className={`filter-pill tactile-press ${active ? 'active' : ''}`}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 700);
                    triggerHaptic(20);
                    setGenreFilter(g);
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>

          <div className="search-input-wrap" style={{ marginBottom: 0, minWidth: '220px', flex: '0 1 260px' }}>
            <Search size={15} className="search-icon-pos" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search station, host, or track"
              className="deck-input"
              placeholder="Filter station, host, track…"
              value={query}
              maxLength={48}
              onChange={(e) => setQuery(e.target.value.replace(/[<>]/g, ''))}
            />
          </div>
        </div>

        {/* Verified Station Grid */}
        <div className="cheats-list-grid" style={{ marginTop: '14px' }}>
          {visibleStations.map((station) => (
            <SpotlightPanel key={station.id} className="cheat-card">
              <div className="cheat-card-top">
                <div>
                  <span className="mono money-ch-pill">{station.genre}</span>
                  <h2 className="robbery-tier-title" style={{ marginTop: '6px' }}>
                    {station.name}
                  </h2>
                </div>
                <Disc3 size={18} color="#2CE5B5" aria-hidden="true" />
              </div>

              <div className="radio-meta-line">
                <Mic size={13} aria-hidden="true" />
                <span>
                  <strong>Hosts:</strong> {station.hosts.join(', ')}
                </span>
              </div>

              {station.tracks.length > 0 ? (
                <div className="radio-tracks-box">
                  <span className="mono gs-micro-label">VERIFIED PREVIEW TRACKS</span>
                  <ul className="radio-track-list">
                    {station.tracks.map((tr) => (
                      <li key={tr}>{tr}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="cheat-meta-sub">
                  Verified launch host preview (full tracklist plays live in-game).
                </p>
              )}
            </SpotlightPanel>
          ))}
        </div>

        {visibleStations.length === 0 && (
          <p className="cheat-meta-sub" style={{ marginTop: '12px' }}>
            No stations match "{query}" in {genreFilter}. Clear the filter to inspect all 6 verified launch stations.
          </p>
        )}

        {/* Streamer DMCA & On-Foot Headphones Guides */}
        <div className="cheat-meta-grid" style={{ marginTop: '16px', marginBottom: 0 }}>
          <SpotlightPanel className="cheat-meta-card">
            <div className="section-label">
              <VolumeX size={14} color="#FF5964" aria-hidden="true" />
              <span>{GTA6_RADIO_GUIDES.streamerDmca.title.toUpperCase()}</span>
            </div>
            <ul className="radio-guide-list">
              {GTA6_RADIO_GUIDES.streamerDmca.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </SpotlightPanel>

          <SpotlightPanel className="cheat-meta-card">
            <div className="section-label">
              <Headphones size={14} color="#2CE5B5" aria-hidden="true" />
              <span>{GTA6_RADIO_GUIDES.headphonesTip.title.toUpperCase()}</span>
            </div>
            <ul className="radio-guide-list">
              {GTA6_RADIO_GUIDES.headphonesTip.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </SpotlightPanel>
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Car,
  Crosshair,
  Zap,
  Box,
  Trophy,
  Sparkles,
  Shield,
  Target,
  Flame,
  DollarSign,
  Gamepad2,
} from 'lucide-react';
import { TOP_GAMES } from '../data/games/allGames.js';
import { playSwitchTick } from '../utils/soundHaptics.js';
import { useModalFocusTrap } from '../utils/useModalFocusTrap.js';

const ICON_MAP = {
  Car,
  Crosshair,
  Zap,
  Box,
  Trophy,
  Sparkles,
  Shield,
  Target,
  Flame,
  DollarSign,
};

const TOOL_SHORTCUTS = [
  {
    id: 'tool-gta6-storage',
    gameId: 'gta-6',
    path: '/gta-6/storage',
    shortTitle: 'GTA VI: SSD & Patch 1.002.001',
    fullTitle: 'GTA VI Console Storage Fit (+0.6 GB PS5 / +1.6 GB Xbox)',
    genre: 'Quick Tool',
    audienceBadge: '212 GB Base',
    tagline: 'Check PS5 & Xbox Series X|S SSD headroom and download ETA.',
    accentColor: '#FF5964',
    accentSoft: 'rgba(255, 89, 100, 0.14)',
    icon: 'Car',
  },
  {
    id: 'tool-gta6-cheats',
    gameId: 'gta-6',
    path: '/gta-6/cheats',
    shortTitle: 'GTA VI: Cheats (61)',
    fullTitle: 'GTA VI Haptic D-Pad Cheat Deck & 61-Code Tracker',
    genre: 'Quick Tool',
    audienceBadge: 'PS5 + Xbox',
    tagline: 'Phone ↑ + L1/LB + R1/RB simulator, 12 confirmed codes & Trophy warning.',
    accentColor: '#FF5964',
    accentSoft: 'rgba(255, 89, 100, 0.14)',
    icon: 'Car',
  },
  {
    id: 'tool-gta6-money',
    gameId: 'gta-6',
    path: '/gta-6/money',
    shortTitle: 'GTA VI: Money & Robberies',
    fullTitle: 'GTA VI Story Money ROI & 4-Tier Robbery Protocol',
    genre: 'Quick Tool',
    audienceBadge: 'Ch. 1 Wipe Alert',
    tagline: 'Ch. 1 cash wipe alert, Moses/Jewelry/Vault ROI & randomized safe rules.',
    accentColor: '#FF5964',
    accentSoft: 'rgba(255, 89, 100, 0.14)',
    icon: 'Car',
  },
  {
    id: 'tool-gta6-settings',
    gameId: 'gta-6',
    path: '/gta-6/settings',
    shortTitle: 'GTA VI: 30fps Tuner & PNG',
    fullTitle: 'GTA VI 30fps Console Tuner & Graveyard PNG Card',
    genre: 'Quick Tool',
    audienceBadge: 'FW 26.07-14.23.00',
    tagline: 'Digital Foundry 4-console 30fps specs, Motion Blur 0 & PNG generator.',
    accentColor: '#FF5964',
    accentSoft: 'rgba(255, 89, 100, 0.14)',
    icon: 'Car',
  },
  {
    id: 'tool-gta6-platinum',
    gameId: 'gta-6',
    path: '/gta-6/platinum',
    shortTitle: 'GTA VI: Platinum & Ultimate',
    fullTitle: 'GTA VI Missables, 15 Save Slots, 100% Menu & Ultimate Checklist',
    genre: 'Quick Tool',
    audienceBadge: '100% Tracker',
    tagline: 'Ch. 1 Balcony Meditation warning, 15 save slots, 5 100% counters & #s= share link.',
    accentColor: '#FF5964',
    accentSoft: 'rgba(255, 89, 100, 0.14)',
    icon: 'Car',
  },
  {
    id: 'tool-gta6-fixes',
    gameId: 'gta-6',
    path: '/gta-6/fixes',
    shortTitle: 'GTA VI: Crash & PSN Fixes',
    fullTitle: 'GTA VI PS5 FW 26.07-14.23.00, WS-116449-5 Offline & Crash Triage',
    genre: 'Quick Tool',
    audienceBadge: 'Launch Triage',
    tagline: 'PS5 FW 26.07-14.23.00 check, Offline Play setup, autosave warning & PC scam alert.',
    accentColor: '#FF5964',
    accentSoft: 'rgba(255, 89, 100, 0.14)',
    icon: 'Car',
  },
  {
    id: 'tool-gta6-radio',
    gameId: 'gta-6',
    path: '/gta-6/radio',
    shortTitle: 'GTA VI: 6 Radio Stations & DMCA',
    fullTitle: 'GTA VI Official 6-Station Radio Preview, Streamer DMCA & Headphones Tip',
    genre: 'Quick Tool',
    audienceBadge: '6 Verified Stations',
    tagline: '6 official featured stations of 22, Twitch/YT DMCA mute & $100+ headphones tip.',
    accentColor: '#FF5964',
    accentSoft: 'rgba(255, 89, 100, 0.14)',
    icon: 'Car',
  },
];

export default function GameSelectorModal({
  isOpen,
  onClose,
  activeGameId,
  onSelectGame,
  onSelectPath = null,
  soundEnabled,
  modalRef,
}) {
  const [search, setSearch] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(0);
  const inputRef = useRef(null);

  useModalFocusTrap(isOpen, modalRef, onClose, { initialFocusRef: inputRef });

  const allEntries = useMemo(() => [...TOP_GAMES, ...TOOL_SHORTCUTS], []);

  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TOP_GAMES;
    return allEntries.filter(
      (g) =>
        g.shortTitle.toLowerCase().includes(q) ||
        g.fullTitle.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.tagline.toLowerCase().includes(q)
    );
  }, [search, allEntries]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      const idx = TOP_GAMES.findIndex((g) => g.id === activeGameId);
      setFocusedIdx(idx >= 0 ? idx : 0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen, activeGameId]);

  useEffect(() => {
    if (focusedIdx >= filteredGames.length) {
      setFocusedIdx(Math.max(0, filteredGames.length - 1));
    }
  }, [filteredGames.length, focusedIdx]);

  if (!isOpen) return null;

  const activeDescendantId = filteredGames[focusedIdx]
    ? `game-option-${filteredGames[focusedIdx].id}`
    : undefined;

  const handleKeyDown = (e) => {
    if (!filteredGames.length) return;
    const isInputFocused = document.activeElement === inputRef.current;

    if (e.key === 'ArrowDown' || (!isInputFocused && e.key === 'ArrowRight')) {
      e.preventDefault();
      setFocusedIdx((prev) => (prev + 1) % filteredGames.length);
    } else if (e.key === 'ArrowUp' || (!isInputFocused && e.key === 'ArrowLeft')) {
      e.preventDefault();
      setFocusedIdx((prev) => (prev - 1 + filteredGames.length) % filteredGames.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = filteredGames[focusedIdx];
      if (picked) {
        playSwitchTick(soundEnabled, 740);
        if (picked.path && typeof onSelectPath === 'function') {
          onSelectPath(picked.path);
        } else {
          onSelectGame(picked.id);
        }
        onClose();
      }
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-selector-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="modal-card game-selector-card"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="selector-modal-header">
          <div className="selector-title-wrap">
            <div className="selector-icon-badge" aria-hidden="true">
              <Gamepad2 size={18} color="var(--game-accent)" />
            </div>
            <div>
              <h2 id="game-selector-title" className="selector-modal-title">
                Switch Game Calculator Suite
              </h2>
              <p className="selector-modal-sub">
                Top 10 global titles — up/down arrows or type a game name, press Enter to launch
              </p>
            </div>
          </div>

          <button
            type="button"
            className="tactile-icon-btn"
            aria-label="Close game selector"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="selector-search-wrap">
          <Search size={16} className="search-icon-pos" aria-hidden="true" />
          <input
            ref={inputRef}
            id="game-selector-search"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="game-selector-listbox"
            aria-expanded={filteredGames.length > 0}
            aria-activedescendant={activeDescendantId}
            aria-label="Search supported games"
            className="deck-input"
            placeholder="Filter games: GTA VI, CoD: MW4, Minecraft, EA FC 27, Valorant, CS2..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="selector-result-count" role="status" aria-live="polite">
          {filteredGames.length} of {search.trim() ? allEntries.length : TOP_GAMES.length} suites &amp; tools available
        </div>

        {filteredGames.length === 0 ? (
          <div className="nz-compact-card selector-empty-box" role="status">
            No games match &ldquo;{search}&rdquo;. Try &ldquo;GTA VI&rdquo;, &ldquo;Safes&rdquo;, &ldquo;MW4&rdquo;, &ldquo;EA FC 27&rdquo;, &ldquo;Minecraft&rdquo;, or &ldquo;Valorant&rdquo;.
          </div>
        ) : (
          <div id="game-selector-listbox" className="game-grid-selector" role="listbox" aria-label="Supported Games">
            {filteredGames.map((game, idx) => {
              const isSelected = !game.path && game.id === activeGameId;
              const isFocused = idx === focusedIdx;
              const IconComp = ICON_MAP[game.icon] || Gamepad2;
              return (
                <button
                  key={game.id}
                  id={`game-option-${game.id}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`game-selector-item ${isSelected ? 'active' : ''} ${isFocused ? 'kbd-focused' : ''}`}
                  style={{ '--game-accent': game.accentColor, '--game-accent-soft': game.accentSoft }}
                  onMouseEnter={() => setFocusedIdx(idx)}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 740);
                    if (game.path && typeof onSelectPath === 'function') {
                      onSelectPath(game.path);
                    } else {
                      onSelectGame(game.id);
                    }
                    onClose();
                  }}
                >
                  <div className="game-item-top">
                    <span className="game-item-genre">
                      <IconComp size={13} color={game.accentColor} aria-hidden="true" />
                      <span>{game.genre}</span>
                    </span>
                    <span className="district-pill">{game.audienceBadge}</span>
                  </div>
                  <div className="game-item-title-row">
                    <span className="game-item-title">{game.shortTitle}</span>
                    {isSelected && (
                      <span className="mono selector-active-tag">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="game-item-tagline">{game.tagline}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

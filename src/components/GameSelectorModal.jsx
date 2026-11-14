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

export default function GameSelectorModal({
  isOpen,
  onClose,
  activeGameId,
  onSelectGame,
  soundEnabled,
  modalRef,
}) {
  const [search, setSearch] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(0);
  const inputRef = useRef(null);

  useModalFocusTrap(isOpen, modalRef, onClose, { initialFocusRef: inputRef });

  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TOP_GAMES;
    return TOP_GAMES.filter(
      (g) =>
        g.shortTitle.toLowerCase().includes(q) ||
        g.fullTitle.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.tagline.toLowerCase().includes(q)
    );
  }, [search]);

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

  const handleKeyDown = (e) => {
    if (!filteredGames.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedIdx((prev) => (prev + 1) % filteredGames.length);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedIdx((prev) => (prev - 1 + filteredGames.length) % filteredGames.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = filteredGames[focusedIdx];
      if (picked) {
        playSwitchTick(soundEnabled, 740);
        onSelectGame(picked.id);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="selector-icon-badge">
              <Gamepad2 size={18} color="var(--game-accent)" />
            </div>
            <div>
              <h2 id="game-selector-title" className="selector-modal-title">
                Switch Game Calculator Suite
              </h2>
              <p className="selector-modal-sub">
                Top 10 global titles — arrow keys or type a game name, press Enter to launch
              </p>
            </div>
          </div>

          <button
            type="button"
            className="tactile-icon-btn"
            aria-label="Close game selector"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="selector-search-wrap">
          <Search size={16} className="search-icon-pos" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="deck-input"
            aria-label="Search supported games"
            placeholder="Filter games: GTA VI, CoD: MW4, Minecraft, EA FC 27, Valorant, CS2..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredGames.length === 0 ? (
          <div className="nz-compact-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            No games match &ldquo;{search}&rdquo;. Try &ldquo;GTA VI&rdquo;, &ldquo;MW4&rdquo;, &ldquo;EA FC 27&rdquo;, &ldquo;Minecraft&rdquo;, or &ldquo;Valorant&rdquo;.
          </div>
        ) : (
          <div className="game-grid-selector" role="listbox" aria-label="Supported Games">
            {filteredGames.map((game, idx) => {
              const isSelected = game.id === activeGameId;
              const isFocused = idx === focusedIdx;
              const IconComp = ICON_MAP[game.icon] || Gamepad2;
              return (
                <button
                  key={game.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`game-selector-item ${isSelected ? 'active' : ''} ${isFocused ? 'kbd-focused' : ''}`}
                  style={{ '--game-accent': game.accentColor, '--game-accent-soft': game.accentSoft }}
                  onMouseEnter={() => setFocusedIdx(idx)}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 740);
                    onSelectGame(game.id);
                    onClose();
                  }}
                >
                  <div className="game-item-top">
                    <span className="game-item-genre">
                      <IconComp size={13} color={game.accentColor} />
                      <span>{game.genre}</span>
                    </span>
                    <span className="district-pill">{game.audienceBadge}</span>
                  </div>
                  <div className="game-item-title-row">
                    <span className="game-item-title">{game.shortTitle}</span>
                    {isSelected && (
                      <span className="mono" style={{ fontSize: '0.77rem', color: 'var(--select-accent)', fontWeight: 700 }}>
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

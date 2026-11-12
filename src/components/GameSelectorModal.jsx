import React, { useState, useEffect } from 'react';
import { X, Search, Gamepad2, Check } from 'lucide-react';
import { TOP_GAMES } from '../data/games/allGames.js';
import { playSwitchTick } from '../utils/soundHaptics.js';

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

  const filtered = TOP_GAMES.filter((g) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      g.fullTitle.toLowerCase().includes(q) ||
      g.shortTitle.toLowerCase().includes(q) ||
      g.genre.toLowerCase().includes(q) ||
      g.tagline.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    const currentIdx = TOP_GAMES.findIndex((g) => g.id === activeGameId);
    setFocusedIdx(currentIdx >= 0 ? currentIdx : 0);
  }, [isOpen, activeGameId]);

  useEffect(() => {
    setFocusedIdx(0);
  }, [search]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && filtered[focusedIdx]) {
      e.preventDefault();
      playSwitchTick(soundEnabled, 720);
      onSelectGame(filtered[focusedIdx].id);
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-selector-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card game-selector-card" ref={modalRef} onKeyDown={handleKeyDown}>
        <div className="selector-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div className="selector-icon-badge">
              <Gamepad2 size={20} color="#FF5964" />
            </div>
            <div>
              <h2 id="game-selector-title" className="selector-modal-title">
                Switch Companion Game (10 Titles)
              </h2>
              <p className="selector-modal-sub">
                Jump between games in one keystroke. Your $6.99 All-Access Pass covers every suite.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="kbd-hint" aria-hidden="true">Esc</span>
            <button
              type="button"
              className="tactile-icon-btn"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="selector-search-wrap">
          <Search size={16} className="search-icon-pos" aria-hidden="true" />
          <input
            type="search"
            className="deck-input"
            aria-label="Search supported games and calculators"
            aria-activedescendant={filtered[focusedIdx] ? `game-opt-${filtered[focusedIdx].id}` : undefined}
            placeholder="Type a game or tool (GTA, Warzone, Fortnite, Minecraft, FC 25, CS2...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="game-grid-selector" role="listbox" aria-label="Supported games">
          {filtered.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '22px 16px',
                textAlign: 'center',
                color: 'var(--ink-muted)',
                fontSize: '0.88rem',
              }}
            >
              No matching game found for &ldquo;{search}&rdquo;. Try GTA, Warzone, Minecraft, or FC 25.
            </div>
          ) : (
            filtered.map((g, idx) => {
              const isSelected = g.id === activeGameId;
              const isFocused = idx === focusedIdx;
              return (
                <button
                  key={g.id}
                  id={`game-opt-${g.id}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`game-selector-item ${isSelected ? 'active' : ''} ${isFocused ? 'kbd-focused' : ''}`}
                  onMouseEnter={() => setFocusedIdx(idx)}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 720);
                    onSelectGame(g.id);
                    onClose();
                  }}
                >
                  <div className="game-item-top">
                    <span className="game-item-genre">
                      <span
                        className="quick-game-dot"
                        style={{ backgroundColor: g.accentColor }}
                        aria-hidden="true"
                      />
                      {g.genre}
                    </span>
                    <span className="game-item-audience">{g.audienceBadge}</span>
                  </div>
                  <div className="game-item-title-row">
                    <strong className="game-item-title">{g.fullTitle}</strong>
                    {isSelected && <Check size={16} color={g.accentColor} />}
                  </div>
                  <p className="game-item-tagline">{g.tagline}</p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

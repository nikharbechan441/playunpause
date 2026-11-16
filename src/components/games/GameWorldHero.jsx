import React from 'react';
import { WORLD_ART_PACK_A, WORLD_STRIP_PACK_A } from './worldArtPackA.jsx';
import { WORLD_ART_PACK_B, WORLD_STRIP_PACK_B } from './worldArtPackB.jsx';

const ALL_WORLD_ART = {
  ...WORLD_ART_PACK_A,
  ...WORLD_ART_PACK_B,
};

const ALL_WORLD_STRIPS = {
  ...WORLD_STRIP_PACK_A,
  ...WORLD_STRIP_PACK_B,
};

export function GameWorldTopStrip({ gameId }) {
  const id = gameId || 'gta-6';
  const strip = ALL_WORLD_STRIPS[id] || ALL_WORLD_STRIPS['gta-6'];
  if (!strip) return null;

  return (
    <div className="gw-top-strip" data-strip-game={id} aria-hidden="true">
      <span className="gw-strip-left">{strip.leftLabel}</span>
      <span className="gw-strip-center">{strip.centerTicks}</span>
      <span className="gw-strip-right">{strip.rightReadout}</span>
    </div>
  );
}

export default function GameWorldHero({ game, theme }) {
  const gameId = game?.id || 'gta-6';
  const ArtComponent = ALL_WORLD_ART[gameId] || ALL_WORLD_ART['gta-6'];
  if (!ArtComponent) return null;

  return (
    <div className="gw-hero-visual-col" data-hero-game={gameId} aria-hidden="true">
      <ArtComponent theme={theme === 'paper' ? 'paper' : 'obsidian'} />
    </div>
  );
}

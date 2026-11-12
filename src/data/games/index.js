import { gta6Pack } from './gta6Pack.js';
import { TOP_GAMES, resolveGameIdFromSlug } from './allGames.js';

// Merge gta6Pack with top metadata
const mergedGta6 = {
  ...TOP_GAMES[0],
  ...gta6Pack,
};

export const GAME_PACKS = [
  mergedGta6,
  ...TOP_GAMES.slice(1),
];

export { TOP_GAMES, resolveGameIdFromSlug };

/**
 * UNPAUSE MULTI-GAME SUITE (Top 10 Worldwide Gaming Audiences)
 * Domain-accurate math, real formulas, Pro Meta Reference Benchmarks, and Answer-First FAQs for:
 * 1. GTA VI
 * 2. Call of Duty: BO6 & Warzone
 * 3. Fortnite
 * 4. Minecraft
 * 5. EA Sports FC 25
 * 6. Roblox
 * 7. Counter-Strike 2 (CS2)
 * 8. Valorant
 * 9. Apex Legends
 * 10. GTA Online (GTA V)
 *
 * Brand Rule: Zero purple gradients/hexes — strict Coastal Daylight + tactile vibrant accents.
 */

export const GAME_URL_ALIASES = {
  'gta6': 'gta-6',
  'gta-vi': 'gta-6',
  'cod': 'cod-warzone',
  'warzone': 'cod-warzone',
  'bo6': 'cod-warzone',
  'fc-25': 'ea-fc-25',
  'fc25': 'ea-fc-25',
  'fifa': 'ea-fc-25',
  'counter-strike-2': 'cs2',
  'apex': 'apex-legends',
  'gta-online': 'gta-v',
  'gtav': 'gta-v',
};

export function resolveGameIdFromSlug(rawSlug) {
  if (!rawSlug || typeof rawSlug !== 'string') return 'gta-6';
  const clean = rawSlug.trim().toLowerCase();
  if (GAME_URL_ALIASES[clean]) return GAME_URL_ALIASES[clean];
  const exact = TOP_GAMES.find((g) => g.id === clean);
  return exact ? exact.id : 'gta-6';
}

export const TOP_GAMES = [
  {
    id: 'gta-6',
    shortTitle: 'GTA VI',
    fullTitle: 'Grand Theft Auto VI',
    audienceBadge: 'Coming Nov 19 · 150M+ Gamers',
    genre: 'Open-World Action',
    accentColor: '#D62839',
    accentSoft: 'rgba(255, 89, 100, 0.12)',
    icon: 'Car',
    tagline: '212 GB Preload Check, Safe Code Vault Demo & Heist Payout Splitter',
    isGta6Suite: true,
    faqs: [
      {
        q: 'Does 212 GB fit on Xbox Series S or base PS5?',
        a: 'Yes. Xbox Series S offers 364 GB of usable SSD space (212 GB uses 58%), and a base PS5 offers 667 GB usable (32%). External USB 3.0 hard drives cannot boot current-gen titles.',
      },
      {
        q: 'Does the New Zealand midnight unlock work?',
        a: 'On Xbox Series X|S, switching System Location to New Zealand joins the earliest midnight rollout on November 18 (11:00 UTC). PlayStation 5 unlocks strictly follow the store country your PSN account was created in.',
      },
    ],
  },
  {
    id: 'cod-warzone',
    shortTitle: 'CoD: BO6 / WZ',
    fullTitle: 'Call of Duty: Black Ops 6 & Warzone',
    audienceBadge: '85M+ Active Players',
    genre: 'First-Person Shooter',
    accentColor: '#DC2626',
    accentSoft: 'rgba(239, 68, 68, 0.12)',
    icon: 'Crosshair',
    tagline: 'Camo Mastery Headshot Pace Tracker & 3-Plate Armor TTK Calculator',
    tools: [
      {
        id: 'camo-tracker',
        name: 'Dark Matter / Camo Pace',
        desc: 'Calculate remaining headshots, matches, and hours needed for Mastery Camos.',
        type: 'camo',
      },
      {
        id: 'ttk-calc',
        name: 'Warzone 3-Plate TTK',
        desc: 'Time-to-Kill (ms) and shots-to-kill against 300 HP armored opponents.',
        type: 'ttk',
      },
    ],
    proMetaTitle: 'BO6 & Warzone S-Tier TTK & Camo Benchmarks',
    proMetaRows: [
      { label: 'Close-Range SMG Meta (0–14m)', val: '565 ms TTK · 850 RPM / 34 DMG (9 shots @ 300 HP)' },
      { label: 'Long-Range AR Beam (40m+)', val: '720 ms TTK · 750 RPM / 32 DMG (10 shots @ 300 HP)' },
      { label: 'Fastest Headshot Playlist', val: 'Hardcore Face Off Stakeout (14–18 headshots / 7m match)' },
    ],
    faqs: [
      {
        q: 'How is Warzone 3-Plate TTK calculated?',
        a: 'A fully plated Warzone operator has 300 total HP (150 base health + three 50-HP armor plates). Shots-to-kill is ceil(300 / bulletDamage), and open-bolt TTK is (shotsToKill - 1) × (60,000 / RPM) ms.',
      },
      {
        q: 'Do DLC weapons count toward the 33 Dark Matter requirement?',
        a: 'Yes. Any 33 weapons across Assault Rifles, SMGs, Shotguns, LMGs, Marksman, Snipers, Pistols, Launchers, or new Season DLC weapons count toward unlocking Dark Spine and Dark Matter.',
      },
    ],
  },
  {
    id: 'fortnite',
    shortTitle: 'Fortnite',
    fullTitle: 'Fortnite: Battle Royale',
    audienceBadge: '110M+ Monthly Players',
    genre: 'Battle Royale',
    accentColor: '#0369A1',
    accentSoft: 'rgba(2, 132, 199, 0.12)',
    icon: 'Zap',
    tagline: 'Battle Pass Level 100/200 Daily XP Pace & V-Bucks Rewards Optimizer',
    tools: [
      {
        id: 'xp-calculator',
        name: 'Battle Pass XP Pace',
        desc: 'Daily levels & matches needed to unlock Tier 100 and Super Styles (Tier 200).',
        type: 'fortnite-xp',
      },
    ],
    proMetaTitle: 'Daily XP Cap & Fastest Level 200 Stack',
    proMetaRows: [
      { label: 'Battle Royale Daily Quests (3× Bonus)', val: '60,000 XP in 1–2 Zero Build matches (~18 mins)' },
      { label: 'UEFN Creative Calibrated XP Cap', val: '~400,000 XP / day (~5 full Battle Pass levels)' },
      { label: 'LEGO Fortnite / Reload Playtime XP', val: '24,000–30,000 XP every 15 mins up to daily cap' },
    ],
    faqs: [
      {
        q: 'How much XP is 1 Fortnite Battle Pass level?',
        a: 'Every Battle Pass level from Level 1 through Level 200 requires a flat 80,000 XP. Reaching Tier 100 takes 7,920,000 XP from Level 1, and unlocking all Super Level styles at Level 200 requires 15,920,000 XP.',
      },
      {
        q: 'How many V-Bucks does the Battle Pass return?',
        a: 'The standard 1,000 V-Buck Battle Pass awards up to 1,500 V-Bucks back by Level 140–150 (1,000 V-Bucks in the main pages plus 500 V-Bucks in Bonus Rewards), netting +500 V-Bucks profit.',
      },
    ],
  },
  {
    id: 'minecraft',
    shortTitle: 'Minecraft',
    fullTitle: 'Minecraft (Java & Bedrock)',
    audienceBadge: '140M+ Active Players',
    genre: 'Sandbox / Survival',
    accentColor: '#047857',
    accentSoft: 'rgba(5, 150, 105, 0.12)',
    icon: 'Box',
    tagline: 'Nether Portal 8:1 Coordinate Linker & 3D Distance Collision Checker',
    tools: [
      {
        id: 'nether-linker',
        name: 'Nether Portal Linker (8:1)',
        desc: 'Exact Overworld ↔ Nether coordinates with 3D link distance collision safety.',
        type: 'nether-portal',
      },
    ],
    proMetaTitle: 'Portal Collision Rules & Survival Farm Yields',
    proMetaRows: [
      { label: 'Nether → Overworld Search Radius', val: '128 Overworld blocks (Java) · 128 X/Z blocks (Bedrock)' },
      { label: 'Overworld → Nether Search Radius', val: '16 Nether blocks (128 Overworld blocks equivalent)' },
      { label: 'Minimum Safe Neighbor Separation', val: '≥ 16 Nether blocks apart or exact Y-altitude match' },
    ],
    faqs: [
      {
        q: 'Does Y-coordinate (altitude) divide by 8 for Nether portals?',
        a: 'No! Only X and Z divide by 8 when converting Overworld to Nether. Always match the Y-altitude as closely as possible when two portals sit within 128 Overworld blocks so 3D Euclidean distance picks the right frame.',
      },
      {
        q: 'How much obsidian is required for a clean Nether highway link?',
        a: 'A minimum 4×5 Nether portal frame uses 10 obsidian blocks if corners are skipped (14 with corners). Bring 20 obsidian and a Flint & Steel to build the exact paired frame inside the Nether.',
      },
    ],
  },
  {
    id: 'ea-fc-25',
    shortTitle: 'EA Sports FC 25',
    fullTitle: 'EA Sports FC 25 (Ultimate Team)',
    audienceBadge: '45M+ Ultimate Team Users',
    genre: 'Sports / Market Sim',
    accentColor: '#00649B',
    accentSoft: 'rgba(0, 119, 182, 0.12)',
    icon: 'Trophy',
    tagline: '5% EA Market Tax Calculator & Sniping Profit Margin Forecaster',
    tools: [
      {
        id: 'ea-tax',
        name: '5% EA Tax & Sniping Profit',
        desc: 'Instant net coins, break-even buy threshold, and flipping margins.',
        type: 'ea-tax',
      },
    ],
    proMetaTitle: 'FUT Weekend League Flipping & Tax Break-Even Matrix',
    proMetaRows: [
      { label: '50,000 Coin Meta Card', val: 'Tax: -2,500 · Break-Even Buy: ≤ 47,500 Coins' },
      { label: '250,000 Coin Promo Starter', val: 'Tax: -12,500 · Break-Even Buy: ≤ 237,500 Coins' },
      { label: '1,000,000 Coin Icon / TOTY', val: 'Tax: -50,000 · Break-Even Buy: ≤ 950,000 Coins' },
    ],
    faqs: [
      {
        q: 'How do you avoid losing coins to the 5% EA FC transfer tax?',
        a: 'Multiply your target sell price by 0.95 before bidding or sniping. If a card sells for 200,000 coins, EA deducts 10,000 coins—meaning any purchase above 189,500 coins loses coins.',
      },
      {
        q: 'When is the lowest buy window for Ultimate Team trading?',
        a: 'Supply peaks right after Weekend League Champions rewards and Sunday evening squad battles/promo pack lightning rounds, creating 8%–14% dips before Thursday Rivals demand.',
      },
    ],
  },
  {
    id: 'roblox',
    shortTitle: 'Roblox',
    fullTitle: 'Roblox Creator & Economy',
    audienceBadge: '70M+ Daily Active Users',
    genre: 'Metaverse / UGC',
    accentColor: '#0E7490',
    accentSoft: 'rgba(8, 145, 178, 0.12)',
    icon: 'Sparkles',
    tagline: 'DevEx Robux-to-USD Cashout & 30% Market Tax Net Calculator',
    tools: [
      {
        id: 'devex-calc',
        name: 'DevEx Cashout & 30% Tax',
        desc: 'Convert earned Robux to USD cashout at the published DevEx tier ($0.0038/R$).',
        type: 'roblox-devex',
      },
    ],
    proMetaTitle: 'Published Roblox Creator Cut & DevEx Cashout Tiers',
    proMetaRows: [
      { label: '30,000 Earned R$ (Minimum DevEx)', val: '$114.00 USD Payout (@ $0.0038 / R$)' },
      { label: '100,000 Earned R$ Milestone', val: '$380.00 USD Payout · Requires 142,858 R$ gross sales' },
      { label: '1,000,000 Earned R$ Studio Tier', val: '$3,800.00 USD Payout · Once-per-month Tipalti wire' },
    ],
    faqs: [
      {
        q: 'Why is DevEx $0.0038 per Robux instead of the retail store price?',
        a: 'Retail Robux bundles cost ~$0.0125 per R$, which covers App Store / Google Play 30% fees, hosting, moderation, and platform infrastructure. Creators cash out earned Robux through DevEx at $0.0038 per R$ (minimum 30,000 earned R$).',
      },
      {
        q: 'How do you price a Gamepass to receive an exact net Robux amount?',
        a: 'Divide your desired net Robux by 0.70 and round up. To net 700 R$ after Roblox’s 30% marketplace fee, list the Gamepass at 1,000 R$.',
      },
    ],
  },
  {
    id: 'cs2',
    shortTitle: 'Counter-Strike 2',
    fullTitle: 'Counter-Strike 2 (CS2)',
    audienceBadge: '30M+ Competitive Players',
    genre: 'Tactical FPS',
    accentColor: '#B45309',
    accentSoft: 'rgba(217, 119, 6, 0.12)',
    icon: 'Shield',
    tagline: 'Loss Streak Economy ($1400-$3400) & Next-Round Buy Threshold Planner',
    tools: [
      {
        id: 'economy-planner',
        name: 'Loss Streak & Buy Economy',
        desc: 'Plan Full Buys ($4,500), Force Buys, and Loss Bonus accumulation ($1400-$3400).',
        type: 'cs2-economy',
      },
    ],
    proMetaTitle: 'MR12 Premier Economy & Rifle Full-Buy Benchmarks',
    proMetaRows: [
      { label: 'T-Side Full Buy (AK-47 + Kevlar/Helm + Full Util)', val: '$4,700 Optimal · $3,700 Rifle + Armor Minimum' },
      { label: 'CT-Side Full Buy (M4A4/A1-S + Armor + Defuse + Util)', val: '$5,100–$5,500 Optimal · $4,300 Minimum' },
      { label: 'Bomb Plant Bonus on T-Side Loss', val: '+$800 per T player on top of Loss Streak Bonus' },
    ],
    faqs: [
      {
        q: 'How does the CS2 round loss counter behave after winning a round?',
        a: 'CS2 increments your loss count by +1 after every lost round (up to 4+, paying $3,400) and steps it down by -1 (not back to zero) when you win a round, softening double-eco resets in MR12.',
      },
      {
        q: 'How much cash should you keep on an Eco round in MR12?',
        a: 'Keep at least $2,000–$2,100 in bank when your next loss bonus is $2,400+ so every teammate hits $4,500+ for full rifles, head armor, smokes, and flashes on the buy round.',
      },
    ],
  },
  {
    id: 'valorant',
    shortTitle: 'Valorant',
    fullTitle: 'Valorant (Riot Games)',
    audienceBadge: '28M+ Monthly Players',
    genre: 'Tactical Hero Shooter',
    accentColor: '#E11D48',
    accentSoft: 'rgba(225, 29, 72, 0.12)',
    icon: 'Target',
    tagline: 'Ranked RR Ladder Pace & Round Buy Economy Calculator',
    tools: [
      {
        id: 'val-economy',
        name: 'RR Ladder & Buy Economy',
        desc: 'Match wins to rank up + minimum creds ($3,900) needed for next round full buy.',
        type: 'val-economy',
      },
    ],
    proMetaTitle: 'Valorant Round Economy & Rank Shield Benchmarks',
    proMetaRows: [
      { label: 'Full Rifle + Heavy Shields + Full Abilities', val: '3,900 Base (Vandal 2,900 + Heavy 1,000) + 600–800 Util' },
      { label: 'Loss Streak Cred Progression', val: '1,900 (1st Loss) → 2,400 (2nd Loss) → 2,900 (3rd+ Cap)' },
      { label: 'Rank-Up Demotion Buffer', val: 'Promotions reset to minimum 10 RR in the new tier' },
    ],
    faqs: [
      {
        q: 'How much RR do you gain or lose in Valorant Ranked?',
        a: 'Standard ranked wins award +15 to +28 RR depending on round differential and hidden MMR, with Performance Bonuses (+3 to +7 RR) for exceeding personal combat averages.',
      },
      {
        q: 'Why do pros buy down to 2,000 Next-Round Minimum on Round 2 saves?',
        a: 'After losing pistol (1,900 creds), saving to guarantee ≥ 3,900–4,500 creds on Round 3 gives your squad Vandals/Phantoms + Heavy Shields against the enemy’s anti-eco SMGs.',
      },
    ],
  },
  {
    id: 'apex-legends',
    shortTitle: 'Apex Legends',
    fullTitle: 'Apex Legends (Respawn / EA)',
    audienceBadge: '20M+ Active Players',
    genre: 'Hero Battle Royale',
    accentColor: '#C2410C',
    accentSoft: 'rgba(234, 88, 12, 0.12)',
    icon: 'Flame',
    tagline: 'Ranked RP Ladder Estimator & 500-Pack Heirloom Pity Counter',
    tools: [
      {
        id: 'heirloom-pity',
        name: 'Heirloom 500-Pack Pity',
        desc: 'Track opened Apex packs, remaining to guaranteed 150 Heirloom Shards.',
        type: 'apex-pity',
      },
    ],
    proMetaTitle: 'Free Account Apex Pack Sources (Prestige Tiers 1–4)',
    proMetaRows: [
      { label: 'Tier 1 Account Levels (1–500)', val: '199 Free Apex Packs earned strictly by leveling' },
      { label: 'Prestige Tiers 1–3 (Levels 501–2,000)', val: '+345 Free Packs (544 Total Free Packs = Guaranteed Heirloom!)' },
      { label: 'Collection Event Packs Warning', val: 'Event-specific packs DO NOT advance the 500-pack pity counter' },
    ],
    faqs: [
      {
        q: 'Does pulling Heirloom Shards early reset the 500-pack counter?',
        a: 'Yes. Opening 150 Heirloom Shards from any standard Apex Pack immediately resets your guaranteed pity counter back to 0 / 500.',
      },
      {
        q: 'Can you get a free guaranteed Heirloom without spending money?',
        a: 'Yes! Reaching Prestige Tier 3 Level 500 awards 544 cumulative free Apex Packs from account leveling alone—exceeding the 500-pack pity threshold even before counting Battle Pass and Treasure Packs.',
      },
    ],
  },
  {
    id: 'gta-v',
    shortTitle: 'GTA Online',
    fullTitle: 'Grand Theft Auto V & Online',
    audienceBadge: '190M+ Lifetime Copies',
    genre: 'Multiplayer Open-World',
    accentColor: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.12)',
    icon: 'DollarSign',
    tagline: 'Cayo Perico & Diamond Casino Net Payout Split Calculator',
    tools: [
      {
        id: 'cayo-calc',
        name: 'Cayo Perico & Casino Payout',
        desc: 'Deduct Pavel (2%) and fencing fees (10%), split secondary loot across crew.',
        type: 'cayo-payout',
      },
    ],
    proMetaTitle: 'Cayo Perico Bag Fill Priority & Elite Challenge Bonus',
    proMetaRows: [
      { label: '1. Gold Stacks (2+ Players Required)', val: '~$330,000 per stack · Takes 66.7% bag space (~$495K/full bag)' },
      { label: '2. Cocaine (Best Solo Secondary)', val: '~$200,000 per stack · Takes 50% bag space (~$400K/full bag)' },
      { label: 'Elite Challenge (<15m, Full Bags, 0 Hacks Failed)', val: '+$100,000 Hard Mode · +$50,000 Normal Mode (Tax-Free!)' },
    ],
    faqs: [
      {
        q: 'Why is Duo Gold more profitable than Solo Cayo Perico?',
        a: 'Compound keycard doors require 2 players to open, unlocking Gold stacks worth ~$495K per full loot bag—plus Solo runs trigger a 144-minute (3 in-game days) cooldown versus just 48 minutes for 2+ players.',
      },
      {
        q: 'Does Pavel’s 2% cut and the 10% fencing fee apply to the Elite Challenge?',
        a: 'No. Pavel (2%) and the fencing fee (10%) are deducted strictly from your Primary + Secondary loot take; the $50K/$100K Elite Challenge bonus and Office Wall Safe cash go straight to players.',
      },
    ],
  },
];

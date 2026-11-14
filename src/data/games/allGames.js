/**
 * UNPAUSE MULTI-GAME SUITE (Top 10 Worldwide Gaming Audiences)
 * Obsidian Hardware Studio telemetry accents + 2026 domain metadata.
 */

export const GAME_URL_ALIASES = {
  'gta6': 'gta-6',
  'gta-vi': 'gta-6',
  'cod': 'cod-warzone',
  'cod-mw4': 'cod-warzone',
  'warzone': 'cod-warzone',
  'bo6': 'cod-warzone',
  'mw4': 'cod-warzone',
  'ea-fc-25': 'ea-fc-27',
  'fc-25': 'ea-fc-27',
  'fc25': 'ea-fc-27',
  'fc-26': 'ea-fc-27',
  'fc26': 'ea-fc-27',
  'fc-27': 'ea-fc-27',
  'fc27': 'ea-fc-27',
  'fifa': 'ea-fc-27',
  'counter-strike-2': 'cs2',
  'apex': 'apex-legends',
  'gta-online': 'gta-v',
  'gtav': 'gta-v',
};

export const COD_MW4_WEAPONS = [
  { id: 'c9-smg', name: 'C9 (SMG)', category: 'SMG · Close', damage: 36, rpm: 882, headMult: 1.28, openBoltMs: 0 },
  { id: 'xm4-ar', name: 'XM4', category: 'AR · Versatile', damage: 34, rpm: 769, headMult: 1.34, openBoltMs: 0 },
  { id: 'm4-classic', name: 'M4', category: 'AR · Mid-Range', damage: 32, rpm: 750, headMult: 1.35, openBoltMs: 0 },
  { id: 'ak74-heavy', name: 'AK-74', category: 'AR · Heavy', damage: 41, rpm: 600, headMult: 1.36, openBoltMs: 0 },
  { id: 'gpr91-ar', name: 'GPR 91', category: 'AR · Precision', damage: 35, rpm: 690, headMult: 1.36, openBoltMs: 0 },
  { id: 'jackal-pdw', name: 'Jackal PDW', category: 'SMG · Mobility', damage: 35, rpm: 857, headMult: 1.30, openBoltMs: 0 },
  { id: 'lachmann-sub', name: 'Lachmann Sub', category: 'SMG · Close', damage: 34, rpm: 800, headMult: 1.28, openBoltMs: 0 },
  { id: 'ppsh-41', name: 'PPSh-41', category: 'SMG · Rapid (Open-Bolt)', damage: 30, rpm: 980, headMult: 1.25, openBoltMs: 42 },
  { id: 'krig-c', name: 'Krig C', category: 'AR · Long-Range', damage: 39, rpm: 632, headMult: 1.38, openBoltMs: 0 },
  { id: 'raal-mg', name: 'RAAL MG', category: 'LMG · Open-Bolt (+50ms)', damage: 44, rpm: 612, headMult: 1.32, openBoltMs: 50 },
  { id: 'dm-10', name: 'DM-10', category: 'Marksman · Semi', damage: 68, rpm: 360, headMult: 1.50, openBoltMs: 0 },
];

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
    audienceBadge: 'Nov 19 Global · Nov 18 NZ',
    genre: 'Open-World Action',
    accentColor: '#FF5964',
    accentSoft: 'rgba(255, 89, 100, 0.14)',
    icon: 'Car',
    tagline: '212–225 GB SSD Fit Check, Safe Keypad Vault Demo & Heist Payout Splitter',
    sourceNote: 'Retail PS5/Xbox usable GB verified · Launch date Nov 19, 2026 confirmed · 212–225 GB preload projection',
    isGta6Suite: true,
    faqs: [
      {
        q: 'Does 212 GB (PS5) or 225 GB (Xbox) fit on Xbox Series S or base PS5?',
        a: 'Yes, though 512 GB Series S owners (364 GB usable) need clean headroom: 225 GB fills ~62% before Day-1 patches or clips. Base PS5 has 667 GB usable (32%). External USB 3.0 drives cannot boot current-gen titles.',
      },
      {
        q: 'Does the New Zealand midnight unlock work?',
        a: 'On Xbox Series X|S, switching System Location to New Zealand joins the earliest midnight rollout on November 18 (11:00 UTC). PlayStation 5 unlocks strictly follow the store country your PSN account was created in.',
      },
    ],
  },
  {
    id: 'cod-warzone',
    shortTitle: 'CoD / Warzone',
    fullTitle: 'Call of Duty: Warzone & Multiplayer',
    audienceBadge: '300 HP 3-Plate TTK',
    genre: 'First-Person Shooter',
    accentColor: '#F43F5E',
    accentSoft: 'rgba(244, 63, 94, 0.14)',
    icon: 'Crosshair',
    tagline: '300 HP 3-Plate TTK Lab, Gun A vs B Compare & Mastery Camo Tracker',
    sourceNote: '300 HP 3-plate TTK math · Open-bolt LMG/SMG trigger delay & camo pace',
    tools: [
      {
        id: 'ttk-calc',
        name: 'Warzone 300 HP TTK Lab',
        desc: 'Compare Weapon A vs Weapon B TTK (ms) with headshots & open-bolt delay.',
        type: 'ttk',
      },
      {
        id: 'camo-tracker',
        name: 'Mastery Camo Pace',
        desc: 'Track remaining weapon classes, headshots, and matches to final Mastery.',
        type: 'camo',
      },
    ],
    proMetaTitle: 'Warzone 300 HP TTK & Camo Benchmarks',
    proMetaRows: [
      { label: 'Close-Range SMG Meta (0–14m)', val: '490–544 ms TTK · 882–952 RPM / 31–36 DMG (@ 300 HP)' },
      { label: 'Long-Range AR Beam (40m+)', val: '620–664 ms TTK · 632–769 RPM / 34–39 DMG (@ 300 HP)' },
      { label: 'Open-Bolt Trigger Delay Rule', val: 'Add +50 ms delay on RAAL MG or +42 ms on PPSh-41 open-bolt builds' },
    ],
    faqs: [
      {
        q: 'How is Warzone 3-Plate TTK calculated?',
        a: 'A fully plated Warzone operator has 300 total HP (150 base health + three 50-HP armor plates). Shots-to-kill counts headshots + body damage, and TTK adds (shotsToKill - 1) × (60,000 / RPM) ms plus any open-bolt delay.',
      },
      {
        q: 'Do DLC weapons count toward the 33–36 Mastery Camo threshold?',
        a: 'Yes. Any qualifying weapons across Assault Rifles, SMGs, Shotguns, LMGs, Marksman, Snipers, Pistols, or Season 1 DLC releases count toward your final Mastery tier—letting you skip Launchers.',
      },
    ],
  },
  {
    id: 'fortnite',
    shortTitle: 'Fortnite',
    fullTitle: 'Fortnite: Battle Royale',
    audienceBadge: 'Zero Build · UEFN XP',
    genre: 'Battle Royale',
    accentColor: '#38BDF8',
    accentSoft: 'rgba(56, 189, 248, 0.14)',
    icon: 'Zap',
    tagline: 'Battle Pass Level 100/140/200 Multi-Source XP Pace & UEFN Creative Planner',
    sourceNote: '80,000 XP per Battle Pass level · 60K Daily Bonus + UEFN Creative pacing',
    tools: [
      {
        id: 'xp-calculator',
        name: 'Battle Pass XP Pace',
        desc: 'Daily BR, Daily Quests, LEGO/Festival & UEFN Creative breakdown to Tier 100/140/200.',
        type: 'fortnite-xp',
      },
    ],
    proMetaTitle: 'Daily XP Cap & Fastest Level 200 Stack',
    proMetaRows: [
      { label: 'Battle Royale Daily Quests (3x Bonus)', val: '60,000 XP in 1–2 Zero Build matches (~18 mins)' },
      { label: 'UEFN Creative Calibrated Cap', val: '4,000,000 XP / week (~50 levels/wk combined across playlists)' },
      { label: 'LEGO Fortnite / Festival Playtime', val: '24,000–30,000 XP per 15 mins up to shared playtime cap' },
    ],
    faqs: [
      {
        q: 'How much XP is 1 Fortnite Battle Pass level?',
        a: 'Standard Battle Pass leveling from 1 through 200 uses 80,000 XP per level. Combining Daily Bonus Quests (60,000 XP/day), Weekly quests, and UEFN Creative playtime cuts active BR match grinding dramatically.',
      },
      {
        q: 'How many V-Bucks does the Battle Pass return?',
        a: 'The standard Battle Pass grants up to 1,500 V-Bucks back across main and Bonus Rewards pages, breaking even +500 V-Bucks around Level 140.',
      },
    ],
  },
  {
    id: 'minecraft',
    shortTitle: 'Minecraft',
    fullTitle: 'Minecraft (Java & Bedrock)',
    audienceBadge: 'Java & Bedrock 8:1',
    genre: 'Sandbox / Survival',
    accentColor: '#10B981',
    accentSoft: 'rgba(16, 185, 129, 0.14)',
    icon: 'Box',
    tagline: 'Nether 8:1 Linker, Two-Portal 3D Collision Check & Stronghold Triangulator',
    sourceNote: 'Java & Bedrock verified: integer floor(X/8) & 128-block Overworld search radius',
    tools: [
      {
        id: 'nether-linker',
        name: 'Nether Linker & 3D Portal Check',
        desc: 'Exact 8:1 floor coordinates, 2nd-portal collision check & Chunk/Region map.',
        type: 'nether-portal',
      },
      {
        id: 'stronghold-locator',
        name: 'Stronghold 2-Throw Locator',
        desc: 'Triangulate End Portal intersection from two Eye of Ender throws.',
        type: 'stronghold',
      },
    ],
    proMetaTitle: 'Portal Collision Rules & Stronghold Precision',
    proMetaRows: [
      { label: 'Nether -> Overworld Search Radius', val: '128 Overworld blocks (Java) · 128 X/Z blocks (Bedrock)' },
      { label: 'Overworld -> Nether Search Radius', val: '16 Nether blocks (uses floor(X/8), keep exact Y-altitude!)' },
      { label: 'Eye of Ender Stronghold Triangulation', val: 'Throw #1, walk 200+ blocks perpendicular, log facing angles on Throw #2' },
    ],
    faqs: [
      {
        q: 'Why must Nether portal math always round down instead of rounding to nearest?',
        a: 'Minecraft truncates integer division toward negative infinity for Nether coordinates: Overworld X=-20 becomes -3 (never -2 or standard rounding). Divide X and Z toward negative infinity and keep Y matched.',
      },
      {
        q: 'How much obsidian is required for a clean Nether highway link?',
        a: 'A minimum 4x5 Nether portal frame uses 10 obsidian blocks without corners (14 with corners). Carry 20 obsidian plus a Flint & Steel to build the exact paired frame inside the Nether.',
      },
    ],
  },
  {
    id: 'ea-fc-27',
    shortTitle: 'EA FC 27',
    fullTitle: 'EA Sports FC 27 (Ultimate Team)',
    audienceBadge: 'FUT Market & SBC',
    genre: 'Sports / Market Sim',
    accentColor: '#22C55E',
    accentSoft: 'rgba(34, 197, 94, 0.14)',
    icon: 'Trophy',
    tagline: '5% EA Tax Flipper, Stepped Break-Even Price & 11-Player SBC Rating Solver',
    sourceNote: 'Exact 5% EA transfer tax & 11-player excess-rating SBC formula verified',
    tools: [
      {
        id: 'ea-tax',
        name: '5% EA Tax & Batch Flip',
        desc: 'Exact 5% tax net profit, legal price-step snap & bulk card margins.',
        type: 'ea-tax',
      },
      {
        id: 'sbc-solver',
        name: '11-Player SBC Rating Solver',
        desc: 'Exact Ultimate Team excess-rating formula for 11 squad slots.',
        type: 'sbc-solver',
      },
    ],
    proMetaTitle: 'FUT Trading Break-Even & Legal EA Price-Step Rules',
    proMetaRows: [
      { label: '50,000 Coin Meta Card', val: 'Tax: -2,650 · Min Legal Sell: 53,000 Coins (+350 net)' },
      { label: '250,000 Coin Promo Starter', val: 'Tax: -12,500 · Min Break-Even Sell: 264,000 Coins' },
      { label: 'SBC 85-Rated Target Tip', val: '9 x 85 + 2 x 84 clears 85 OVR (or 4 x 86 + 7 x 84)' },
    ],
    faqs: [
      {
        q: 'How do you calculate the minimum sell price to not lose coins on EA tax?',
        a: 'Divide your purchase price by 0.95 and snap up to the next valid EA transfer market increment (50, 100, 250, 500, or 1,000 coins). Selling lower than ceil(buy / 0.95) guarantees a net tax loss.',
      },
      {
        q: 'How does the Ultimate Team SBC squad rating formula work?',
        a: 'EA adds each card exceeding the 11-player average rating to the total pool before dividing by 11, giving high-OVR anchor cards extra weight when filling SBC requirements.',
      },
    ],
  },
  {
    id: 'roblox',
    shortTitle: 'Roblox',
    fullTitle: 'Roblox Creator & Economy',
    audienceBadge: 'DevEx & 30% Fee',
    genre: 'Metaverse / UGC',
    accentColor: '#38BDF8',
    accentSoft: 'rgba(56, 189, 248, 0.14)',
    icon: 'Sparkles',
    tagline: 'DevEx USD Payout ($0.0038 / $0.0035 / $0.0054), 30% Fee & Reverse USD Target Planner',
    sourceNote: 'Published DevEx rates ($0.0038/R$ standard · $0.0035 legacy) & 30% market fee',
    tools: [
      {
        id: 'devex-calc',
        name: 'DevEx Cashout & Reverse Target',
        desc: 'Calculate USD payout above the 30,000 R$ floor + gross Robux needed per goal.',
        type: 'roblox-devex',
      },
    ],
    proMetaTitle: 'Published Roblox Creator Cut & DevEx Cashout Tiers',
    proMetaRows: [
      { label: '30,000 Earned R$ (Minimum DevEx)', val: '$114.00 USD (@ $0.0038) · Legacy rate: $105.00' },
      { label: '100,000 Earned R$ Milestone', val: '$380.00 USD Standard · US 18+ Direct Store: $540.00' },
      { label: '1,000,000 Earned R$ Studio Tier', val: '$3,800.00 USD Payout · Monthly verified Tipalti disbursement' },
    ],
    faqs: [
      {
        q: 'What is the minimum Robux required to submit a DevEx cashout?',
        a: 'You need at least 30,000 earned Robux in your creator balance (along with a verified DevEx portal account and 13+ eligibility). Amounts under 30,000 R$ show how many Robux remain to unlock payout.',
      },
      {
        q: 'How do you price a Gamepass to receive an exact net Robux amount?',
        a: 'Divide your desired net Robux by 0.70 (or also divide by your group percentage split) and round up. To net 700 R$ after Roblox 30% marketplace fee, list at 1,000 R$.',
      },
    ],
  },
  {
    id: 'cs2',
    shortTitle: 'Counter-Strike 2',
    fullTitle: 'Counter-Strike 2 (CS2)',
    audienceBadge: 'Premier MR12 Rules',
    genre: 'Tactical FPS',
    accentColor: '#F59E0B',
    accentSoft: 'rgba(245, 158, 11, 0.14)',
    icon: 'Shield',
    tagline: 'Authentic MR12 Loss Bonus Ladder ($1,400–$3,400), -1 Win Step-Down & 5-Player Bank',
    sourceNote: 'Official CS2 MR12 loss bonus ladder ($1,400–$3,400, -1 on win, Level 1 pistol loss)',
    tools: [
      {
        id: 'economy-planner',
        name: 'CS2 MR12 Loss & Buy Planner',
        desc: 'Simulate loss counter (-1 on win), CT/T kit costs & 5-player drop bank.',
        type: 'cs2-economy',
      },
    ],
    proMetaTitle: 'MR12 Premier Economy & Rifle Full-Buy Benchmarks',
    proMetaRows: [
      { label: 'T-Side Full Buy (AK-47 + Kevlar/Helm + Full Util)', val: '$4,700 Optimal · $3,700 Core Rifle + Armor' },
      { label: 'CT-Side Full Buy (M4 + Armor/Helm + Kit + Util)', val: '$5,100–$5,500 Optimal · $4,300 Core Rifle + Kit' },
      { label: 'Pistol Round Loss Start (CS2 Rule)', val: 'Starts at Level 1 ($1,900), NOT $1,400! T bomb plant adds +$800/player' },
    ],
    faqs: [
      {
        q: 'How does the CS2 round loss counter behave after winning a round?',
        a: 'Loss bonus pays $1,400 at Level 0, $1,900 at 1 (including pistol-round loss), $2,400 at 2, $2,900 at 3, and caps at $3,400 at 4+. Winning a round decrements the counter by -1 rather than resetting to zero.',
      },
      {
        q: 'How much cash should CT save on an Eco round in MR12?',
        a: 'Preserve enough so current cash + next loss bonus clears $4,300–$5,500—typically saving down to ~$2,000 when at 1 or 2 losses.',
      },
    ],
  },
  {
    id: 'valorant',
    shortTitle: 'Valorant',
    fullTitle: 'Valorant (Riot Games)',
    audienceBadge: 'Economy & RR Sim',
    genre: 'Tactical Hero Shooter',
    accentColor: '#FB7185',
    accentSoft: 'rgba(251, 113, 133, 0.14)',
    icon: 'Target',
    tagline: 'Buy Economy Matrix (Regen/Light/Heavy Shields + Outlaw) & Win-Rate RR Climb Sim',
    sourceNote: 'Current buy menu pricing (Light 400 · Regen 650 · Heavy 1,000 · Vandal/Phantom 2,900)',
    tools: [
      {
        id: 'val-economy',
        name: 'Round Buy Economy Matrix',
        desc: 'Interactive Shield + Weapon + Util calculator with 1,900–2,900 next-round floor.',
        type: 'val-economy',
      },
      {
        id: 'val-rr',
        name: 'Ranked RR Climb Simulator',
        desc: 'Project net RR per game and matches to tier promotion using real loss offsets.',
        type: 'val-rr',
      },
    ],
    proMetaTitle: 'Valorant Round Economy & Armor Pricing Matrix',
    proMetaRows: [
      { label: 'Armor Tiers (Current Meta)', val: 'Light (25 HP): 400 · Regen Shield (25+50 pool): 650 · Heavy (50 HP): 1,000' },
      { label: 'Primary Rifle & Sniper Tiers', val: 'Outlaw: 2,400 · Vandal / Phantom: 2,900 · Operator: 4,700' },
      { label: 'Loss Streak Cred Progression', val: '1,900 (1st Loss) -> 2,400 (2nd Loss) -> 2,900 (3rd+ Cap)' },
    ],
    faqs: [
      {
        q: 'When should you buy the 650-cred Regen Shield vs 1,000 Heavy Armor?',
        a: 'Regen Shield (650 creds) saves 350 creds versus Heavy while regenerating broken shield HP between chip-damage skirmishes—great for Controllers/Initiators squeezing utility or bonus-round Outlaw buys.',
      },
      {
        q: 'How do pros plan Round 2 saves to hit 3,900+ on Round 3?',
        a: 'Subtract your upcoming Loss Reward (1,900 or 2,400) from 3,900 (Rifle 2,900 + Heavy 1,000) to get your exact Round 2 leftover target.',
      },
    ],
  },
  {
    id: 'apex-legends',
    shortTitle: 'Apex Legends',
    fullTitle: 'Apex Legends (Respawn / EA)',
    audienceBadge: 'Prestige 0–3 · 500 Pity',
    genre: 'Hero Battle Royale',
    accentColor: '#FB923C',
    accentSoft: 'rgba(251, 146, 60, 0.14)',
    icon: 'Flame',
    tagline: 'Accurate Level+Prestige Heirloom Pity Counter & Ranked RP Match Estimator',
    sourceNote: 'Verified 500-pack Heirloom pity & Prestige 0–3 level schedule (544 free packs max)',
    tools: [
      {
        id: 'heirloom-pity',
        name: 'Heirloom 500-Pack Pity',
        desc: 'Compute earned level packs across Prestige 0–3 (up to 544 free packs) + BP + Purchased.',
        type: 'apex-pity',
      },
      {
        id: 'apex-ranked',
        name: 'Ranked RP Ladder Planner',
        desc: 'Estimate net RP/match and games remaining to your target Ranked tier.',
        type: 'apex-rp',
      },
    ],
    proMetaTitle: 'Free Account Apex Pack Sources (Prestige Tiers 0–3)',
    proMetaRows: [
      { label: 'Tier 0 Account Levels (1–500)', val: '199 Free Apex Packs earned strictly from leveling' },
      { label: 'Prestige Tiers 1–3 (Levels 501–2,000)', val: '544 Cumulative Free Packs across 2,000 levels = Guaranteed Heirloom!' },
      { label: 'Collection Event Packs Warning', val: 'Event-specific packs DO NOT advance the 500-pack pity counter' },
    ],
    faqs: [
      {
        q: 'How many free Apex Packs do you get before hitting Prestige Tier 1?',
        a: 'From Level 1 to 500, you earn 1 pack per level (2–20), every 2 levels (22–300), and every 5 levels (305–500)—totaling exactly 199 free Apex Packs.',
      },
      {
        q: 'Does pulling Heirloom Shards early reset the 500-pack counter?',
        a: 'Yes. Pulling 150 Heirloom Shards resets your 500-pack pity counter immediately back to 0 / 500.',
      },
    ],
  },
  {
    id: 'gta-v',
    shortTitle: 'GTA Online',
    fullTitle: 'Grand Theft Auto V & Online',
    audienceBadge: 'Cayo Perico Solo/Crew',
    genre: 'Multiplayer Open-World',
    accentColor: '#2CE5B5',
    accentSoft: 'rgba(44, 229, 181, 0.14)',
    icon: 'DollarSign',
    tagline: 'Cayo Perico Payout Splitter (15% Crew Floor), Hard Mode & Bag Fill Solver',
    sourceNote: 'Verified Cayo Perico fees (Pavel 2% · Fence 10% · 15% min crew · +10% Hard Mode)',
    tools: [
      {
        id: 'cayo-calc',
        name: 'Cayo Perico & Bag Optimizer',
        desc: 'Pavel (2%) + Fence (10%) + Setup Fee with mandatory 15% crew share floor & Elite bonus.',
        type: 'cayo-payout',
      },
    ],
    proMetaTitle: 'Cayo Perico Bag Fill Priority & Elite Challenge Bonus',
    proMetaRows: [
      { label: '1. Gold Stacks (2+ Players Required)', val: '~$330,000 per stack · Takes 66.7% bag space (~$495K/full bag)' },
      { label: '2. Cocaine (Best Solo Secondary)', val: '~$200,000 per stack · Takes 50% bag space (~$400K/full bag)' },
      { label: 'Mandatory Min Crew Cut & Hard Mode', val: 'Crew members cannot drop below 15% · Hard Mode adds +10% to Primary Target' },
    ],
    faqs: [
      {
        q: 'Why can host cut never exceed 85% in Duo or 55% in 4-Player Cayo Perico?',
        a: 'GTA Online enforces a hard 15% minimum share per invited crew member: Duo caps Host at 85%, Trio at 70%, and 4-Player squads cap Host at 55%.',
      },
      {
        q: 'Does Hard Mode boost Secondary loot stacks too?',
        a: 'No—activating Hard Mode within 48 minutes adds +10% strictly to your Primary Target value (e.g. Pink Diamond rises from $1.30M to $1.43M) plus doubles the Elite Challenge bonus from $50K to $100K.',
      },
    ],
  },
];

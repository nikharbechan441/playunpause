/**
 * GTA VI Leonida Command Center (V2.2) Verified Data
 * Strict launch-day facts only: zero unverified speeds, tracks, or multiplayer copy.
 */

export const LEONIDA_TABS = [
  { id: 'session', label: 'Session Hub', mobileLabel: 'Session', path: '/' },
  { id: 'storage', label: 'Fit & SSD', mobileLabel: 'Fit & SSD', path: '/gta-6/storage' },
  { id: 'settings', label: '30fps Settings', mobileLabel: '30fps', path: '/gta-6/settings' },
  { id: 'money', label: 'Heat, Money & Cheats', mobileLabel: 'Heat/Money', path: '/gta-6/money' },
  { id: 'fixes', label: 'Fixes & Radio', mobileLabel: 'Fixes/Radio', path: '/gta-6/fixes' },
];

export const LEONIDA_CHAPTERS = [
  { id: 1, label: 'CH 1', title: 'Chapter 1' },
  { id: 2, label: 'CH 2', title: 'Chapter 2' },
  { id: 3, label: 'CH 3', title: 'Chapter 3' },
  { id: 4, label: 'CH 4', title: 'Chapter 4' },
  { id: 5, label: 'POST', title: 'Post-Story' },
];

export const LEONIDA_LAUNCH_PILLS = [
  {
    id: 'pill-fw',
    label: 'PS5 FW 26.07-14.23.00 (1.27 GB)',
    tab: 'fixes',
    activeFix: 'ps5_boot',
  },
  {
    id: 'pill-blur',
    label: 'Motion Blur 3 -> 0 · Fuel Gauge On',
    tab: 'settings',
  },
  {
    id: 'pill-wipe',
    label: 'Ch. 1 Cash Wipe · $20K Cash Cap',
    tab: 'money',
  },
  {
    id: 'pill-heat',
    label: '6-Star Heat & Psycho Lock-In Guard',
    tab: 'money',
  },
];

export const LEONIDA_TRACKER_ITEMS = [
  {
    key: 'waink',
    label: 'WAiNK Base Vehicles',
    target: 200,
    detail: 'Scan cars with your in-game phone · 277 eligible base; 280 Standouts excluded',
  },
  {
    key: 'wildlife',
    label: 'Wildlife Studied',
    target: 100,
    detail: '255 total species via binoculars',
  },
  {
    key: 'flamingos',
    label: 'Cocaine Flamingos',
    target: 100,
    detail: 'Hidden Leonida collectibles · 125 total, black-and-white beaks only',
  },
  {
    key: 'stunts',
    label: 'Stunts Completed',
    target: 300,
    detail: '397 total across Leonida',
  },
  {
    key: 'cards',
    label: 'Collectible Card Sets',
    target: 15,
    detail: '18 total sets in-game',
  },
];

export const LEONIDA_SAMPLE_COUNTS = {
  waink: 64,
  wildlife: 41,
  flamingos: 28,
  stunts: 105,
  cards: 5,
};

export const LEONIDA_DEFAULT_SAVES = [
  { slot: 1, label: 'Ch. 1 Start', saved: false },
  { slot: 2, label: 'Pre-Ch. 1 Wipe', saved: false },
  { slot: 3, label: 'Ch. 2 Start', saved: false },
  { slot: 4, label: 'Ch. 2 Mid', saved: false },
  { slot: 5, label: 'Ch. 3 Start', saved: false },
  { slot: 6, label: 'Ch. 3 Snap Gun', saved: false },
  { slot: 7, label: 'Ch. 4 Start', saved: false },
  { slot: 8, label: 'Ch. 4 Vaults', saved: false },
  { slot: 9, label: 'Ch. 5 Start', saved: false },
  { slot: 10, label: 'Pre-Finale', saved: false },
  { slot: 11, label: 'Free Roam 1', saved: false },
  { slot: 12, label: 'Free Roam 2', saved: false },
  { slot: 13, label: 'WAiNK Grind', saved: false },
  { slot: 14, label: 'Trophy Backup', saved: false },
  { slot: 15, label: 'Post-Story', saved: false },
];

export const LEONIDA_PACE_MODES = [
  { id: 'rush', label: 'Rush', badge: '48h', hours: 48 },
  { id: 'normal', label: 'Normal', badge: '70h', hours: 70 },
  { id: 'plat', label: '100%', badge: '200h', hours: 200 },
];

export const LEONIDA_BASE_GB = 212;

export const LEONIDA_CONSOLES = [
  {
    id: 'ps5_825',
    label: 'PS5 825GB',
    shortLabel: 'PS5 825GB',
    platform: 'ps5',
    usableGb: 667,
    patchGb: 0.6,
    subtext: '667 GB net · +0.6 GB patch',
  },
  {
    id: 'ps5_slim',
    label: 'PS5 Slim 1TB',
    shortLabel: 'PS5 Slim',
    platform: 'ps5',
    usableGb: 848,
    patchGb: 0.6,
    subtext: '848 GB net · +0.6 GB patch',
  },
  {
    id: 'ps5_pro',
    label: 'PS5 Pro 2TB',
    shortLabel: 'PS5 Pro',
    platform: 'ps5',
    usableGb: 1890,
    patchGb: 0.6,
    subtext: '1,890 GB net · +0.6 GB patch',
  },
  {
    id: 'xsx',
    label: 'Xbox Series X',
    shortLabel: 'Series X',
    platform: 'xbox',
    usableGb: 802,
    patchGb: 1.6,
    subtext: '802 GB net · +1.6 GB patch',
  },
  {
    id: 'xss',
    label: 'Xbox Series S',
    shortLabel: 'Series S',
    platform: 'xbox',
    usableGb: 364,
    patchGb: 1.6,
    subtext: '364 GB net · +1.6 GB patch',
  },
];

export const LEONIDA_INSTALLED_GAMES = [
  { id: 'cod', label: 'Call of Duty', gb: 145 },
  { id: 'nba', label: 'NBA 2K', gb: 160 },
  { id: 'fn', label: 'Fortnite', gb: 85 },
  { id: 'gta5', label: 'GTA V', gb: 105 },
  { id: 'rdr2', label: 'Red Dead 2', gb: 120 },
];

export const LEONIDA_MBPS_PRESETS = [25, 50, 100, 250, 500, 1000];

export const LEONIDA_SETTINGS_CONSOLES = [
  { id: 'ps5_pro', label: 'PS5 Pro', target: '30 FPS Locked · 1440p PSSR + Exclusive Ray-Traced Shadows' },
  { id: 'ps5', label: 'PS5 Slim', target: '30 FPS Target · Occasional 27-29 FPS dips in dense Vice City traffic' },
  { id: 'xsx', label: 'Series X', target: '30 FPS Target · Enable 120Hz VRR container to smooth frame pacing' },
  { id: 'xss', label: 'Series S', target: '30 FPS Target · 720p upscaled via FSR 4.1 (dips to 24 FPS in heavy action)' },
];

export const LEONIDA_DISPLAY_TYPES = [
  { id: 'oled', label: 'OLED' },
  { id: 'led', label: 'LED' },
];

export const LEONIDA_PLAYSTYLES = [
  { id: 'standard', label: 'Classic' },
  { id: 'motion', label: 'No Blur' },
  { id: 'streamer', label: 'Stream' },
];

export const LEONIDA_SETTINGS_ITEMS = [
  {
    id: 'fw',
    ps5Only: true,
    title: 'Update PS5 Firmware to 26.07-14.23.00 (1.267 GB)',
    detail: 'Confirm System -> System Software Info reads 26.07-14.23.00 (Nov 17, 2026) before Chapter 1.',
  },
  {
    id: 'blur',
    highlightStyle: 'motion',
    title: 'Motion Blur Strength: 3 -> 0',
    detail: 'Eliminates camera pan smear at 30 FPS on fast OLED pixels during Vice Beach driving.',
  },
  {
    id: 'fuel',
    title: 'Fuel Gauge HUD: On (hidden default)',
    detail: 'Exposes the hidden vehicle fuel bar beneath the minimap so long desert/Keys runs never stall.',
  },
  {
    id: 'subs',
    title: 'Subtitles: Mission Only -> All',
    detail: 'Catches street dialogue and randomized safe/police clues during overlapping radio banter.',
  },
  {
    id: 'gps',
    title: 'Navigation & GPS Voice: Always On',
    detail: 'Keeps turn-by-turn Leonida route callouts active without staring at the minimap.',
  },
  {
    id: 'hdr',
    title: 'Console HDR: On When Supported + TV Game Mode',
    detailOled: 'OLED tip: Set HGIG Tone Mapping + warm black floor before running GTA VI Paper-White calibration.',
    detailLed: 'LED tip: Enable Local Dimming High + TV Game Mode so night alley chases keep detail.',
    detail: 'Match console HDR state to TV Game Mode to hold 30 FPS input latency tight.',
  },
  {
    id: 'combat',
    title: 'Accessible Combat / Reduced Vehicle Damage (Trophy-Safe — does NOT disable trophies)',
    detail: 'Unlike Cheat codes, Accessibility toggles keep all Trophies, Achievements, and saving active.',
  },
  {
    id: 'controls',
    title: 'Control Scheme: Classic (restores GTA V sprint & jump over default L3 sprint / Cross-A jump)',
    detail: 'Restores familiar GTA V tap-to-sprint and Cross/A jump ergonomics on console pads.',
  },
  {
    id: 'minimap',
    title: 'Minimap: Lock Always Visible (disable auto-hide)',
    detail: 'Prevents radar disappearing right before Cloud-icon CCTV or alley Police search cones.',
  },
  {
    id: 'streamer',
    highlightStyle: 'streamer',
    title: 'Streamer Mode Audio: Mute Licensed Radio',
    detail: 'Strips copyrighted broadcast tracks in cars and shops to protect Twitch/YouTube VODs.',
  },
];

export const LEONIDA_STAR_STATES = [
  {
    id: 'grey',
    label: 'Solid Grey',
    subtitle: 'Cops Responding',
    action: 'Leave calmly; holster visible weapon.',
  },
  {
    id: 'w_out',
    label: 'White Outline',
    subtitle: 'Suspect Unknown',
    action: 'Not linked yet; blend into traffic or step into an alley.',
  },
  {
    id: 'white',
    label: 'Solid White',
    subtitle: 'Active Pursuit',
    action: 'Break line of sight, duck in parked car, or swap vehicles out of view.',
  },
  {
    id: 'flash',
    label: 'Flashing',
    subtitle: 'Lost Sight / Searching',
    action: 'Stay out of blue/red cones; kill headlights in alley.',
  },
  {
    id: 'red',
    label: 'Solid Red',
    subtitle: 'Active Heat Linked',
    action: 'Face/outfit/car/partner flagged; clear every active red Heat icon below.',
  },
  {
    id: 'r_out',
    label: 'Red Outline',
    subtitle: 'High-Alert Zone',
    action: 'Heat cleared locally but district stays hot; switch to the other protagonist to enter cleanly.',
  },
];

export const LEONIDA_HEAT_FACTORS = [
  {
    id: 'car',
    label: 'Vehicle',
    clearStep: "Ditch/swap car out of sight or respray at Pay 'n' Spray.",
  },
  {
    id: 'outfit',
    label: 'Outfit',
    clearStep: 'Swap outfits from Personal Vehicle trunk or clothing store.',
  },
  {
    id: 'weapon',
    label: 'Visible Longarm',
    clearStep: 'Longarms stay slung on your back! Stow rifles/shotguns in car trunk or Ammu-Nation locker.',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    clearStep: 'Remove hats/masks/bandanas via Loadout (L1/LB -> R1/RB Items).',
  },
  {
    id: 'cctv',
    label: 'CCTV',
    clearStep: 'Shoot Cloud-icon cameras or destroy back-room footage.',
  },
  {
    id: 'partner',
    label: 'Partner Tag',
    clearStep: 'Split up or switch between Jason and Lucia to enter a hot county cleanly.',
  },
];

export const LEONIDA_PROFILE_TIERS = [
  {
    id: 'pro',
    label: 'Professional',
    tone: 'teal',
    detail: 'Safe · Stealth & yellow non-lethal weak-spot shots (Focus Mode) build cleanest ending paths.',
  },
  {
    id: 'hard',
    label: 'Hardened',
    tone: 'neutral',
    detail: 'Balanced · Standard combat with full Focus Mode bonuses intact.',
  },
  {
    id: 'viol',
    label: 'Violent',
    tone: 'gold',
    detail: 'Caution · Excessive lethality pushes toward Psycho; use yellow weak spots to pull back.',
  },
  {
    id: 'psycho',
    label: 'Psycho',
    tone: 'coral',
    detail: 'DANGER · Police surrender disabled! Watch for 3 slow-mo cracking-emoji warnings or you permanently lock into Irredeemable.',
  },
  {
    id: 'irred',
    label: 'Irredeemable',
    tone: 'coral',
    detail: 'PERMANENT LOCK-IN · Strips all Focus bonuses and locks dark endings. Only undone by loading an older manual save!',
  },
];

export const LEONIDA_BEST_ENDING_GUARD = [
  'Check Map > Jason & Lucia individually after major chases — each protagonist carries a separate Criminal Profile rating.',
  'Stop civilian rampages and police massacres immediately if a slow-mo profile crack warning triggers; Irredeemable permanently locks out Focus perks & cooperative finale paths on that save.',
  'Keep a clean Pre-Finale manual save in Slot #10 before advancing Chapter 5 missions.',
];

export const LEONIDA_STATIC_KEYPADS = [
  {
    id: 'brians-lockup',
    name: "Brian's Lockup (SW Key Lento Fence)",
    code: '7700',
    note: 'Static keypad for every player — used to offload fenced loot & Apollo Aggregates stash bags.',
  },
  {
    id: 'moonstone-acid',
    name: 'Moonstone Boutique Acid Lab ("Lab Fees")',
    code: '0420',
    note: 'Static story-mission keypad inside the acid lab backroom during Lab Fees.',
  },
];

export const LEONIDA_APOLLO_LOOP = {
  statusBadge: 'UNPATCHED IN 01.002.002 (NOV 24)',
  title: 'Apollo Aggregates ("Red Barn") Warehouse Loop',
  location: 'South Vice-Dale County (north of Key Lento, east of Hamlet)',
  summary:
    'Rockstar’s Nov 23 Patch 01.002.002 / 1.0.2.2 did NOT patch the warehouse trunk respawn loop. Use ONLY in Chapter 2+ after the Ch. 1 wallet reset.',
  steps: [
    'Park a Personal Vehicle with clean trunk capacity right outside Apollo Aggregates (skip warehouse vans).',
    'Clear the office safe, loose cash, and cocaine packages inside, loading the stash bags into your Personal Vehicle trunk.',
    'Open Pause Menu -> Game -> Save Game on a fresh manual slot, then immediately Load that same save.',
    'You reload near Jason’s safehouse with the bags still in your Personal Vehicle trunk while Apollo Aggregates loot respawns — cash out at a Fence (e.g., Brian’s Lockup keypad 7700).',
  ],
};

export const LEONIDA_ULTIMATE_UNLOCKS = [
  {
    id: 'ult-squalo',
    badge: 'CHAPTER 4 ONLY',
    title: 'Shitzu Squalo (Offshore Speedboat)',
    detail:
      'Locked across Chapters 1–3. Opens automatically at your Washington Beach Canal dock once Chapter 4 begins.',
  },
  {
    id: 'ult-cash',
    badge: 'WAIT FOR CHAPTER 2+',
    title: 'Ultimate Edition Bonus Cash Claim Rule',
    detail:
      'Redeem redeemable bonus cash only after transitioning into Chapter 2 so Chapter 1’s end-of-act wallet reset never wipes it.',
  },
];

export const LEONIDA_MONEY_CHAPTERS = [
  {
    id: 'ch1',
    chapter: 1,
    badge: 'CH. 1',
    title: 'Do NOT Grind Cash',
    payout: 'Cash Wipes at Ch. 1 End',
    detail: 'Spend loose cash on permanent weapon mods & clothes before transitioning to Ch. 2; grab Ch. 1 Balcony Meditation (Positive Mental Attitude) trophy.',
  },
  {
    id: 'ch2',
    chapter: 2,
    badge: 'CH. 2',
    title: 'Moses & Pawn Shop Loop',
    payout: '$1,000+ / 2 min',
    detail: 'Open-world safe codes randomize per playthrough/robbery — scan backrooms with Focus Mode (L3+R3) for sticky notes and invoices.',
  },
  {
    id: 'ch3',
    chapter: 3,
    badge: 'CH. 3',
    title: 'Jewelry Stores + Randy’s Wish List',
    payout: '$10K–$25K · $30K+/car',
    detail: 'Equip Snap Gun & Dye Pack Jammer, shoot Cloud-icon CCTV first, and deliver Randy’s 16 initial Wish List cars (up to 22 with additions, $30K+/car).',
  },
  {
    id: 'ch4',
    chapter: 4,
    badge: 'CH. 4',
    title: '8 Large Bank Vaults + Shitzu Squalo',
    payout: '$65K–$205K / 5 min -> $2M Family Savings',
    detail: 'Run Large Bank Vaults with Ch. 3 Dye Pack Jammer equipped; Ultimate Edition Shitzu Squalo boat unlocks at your Washington Beach Canal dock.',
  },
];

export const LEONIDA_CHEAT_CATEGORIES = [
  { id: 'All', label: 'All (19 Tracked · 61 Total)' },
  { id: 'Player', label: 'Player (10)' },
  { id: 'Combat', label: 'Combat (11)' },
  { id: 'Spawn Vehicles', label: 'Vehicles (21)' },
  { id: 'Environment', label: 'Environment (3 · Filters 16)' },
];

export const LEONIDA_VERIFIED_CHEATS = [
  {
    id: 'cash-250k',
    name: '$250,000 Cash',
    category: 'Player',
    status: 'CONFIRMED',
    unlockChallenge: 'Beat the Main Story (auto-unlocked post-credits)',
    effect: 'Adds $250,000 directly to your active character wallet.',
    dpad: ['↑', '→', '↓', '←', '↑', '←', '↓', '→'],
    codeTbc: false,
  },
  {
    id: 'unlimited-focus',
    name: 'Unlimited Focus',
    category: 'Player',
    status: 'CONFIRMED',
    unlockChallenge: 'Beat the Main Story (auto-unlocked post-credits)',
    effect: 'Prevents Jason/Lucia precision Focus gauge from draining.',
    dpad: ['↓', '↑', '↑', '↓', '↑', '↓', '↑', '↓', '↑', '→'],
    codeTbc: false,
  },
  {
    id: 'attack-force',
    name: 'Attack Force',
    category: 'Combat',
    status: 'CONFIRMED',
    unlockChallenge: 'Beat the Main Story (auto-unlocked post-credits)',
    effect: 'Boosts close-quarters & melee hit impulse.',
    dpad: ['↓', '↑', '←', '←', '→', '↓', '↓', '↑', '↓'],
    codeTbc: false,
  },
  {
    id: 'cycle-weather',
    name: 'Cycle Weather',
    category: 'Environment',
    status: 'CONFIRMED',
    unlockChallenge: 'Post-Story / Map progression',
    effect: 'Cycles weather states across Clear, Dusk, Rain, Storm & Fog.',
    dpad: ['↓', '→', '↑', '↓', '→', '↑', '→'],
    codeTbc: false,
  },
  {
    id: 'body-armor',
    name: 'Body Armor',
    category: 'Player',
    status: 'CONFIRMED',
    unlockChallenge: 'Complete 100 gym workouts',
    effect: 'Grants full ballistic vest.',
    dpad: ['↓', '↑', '←', '↑', '↑', '↑', '↑', '↑', '↓', '↓'],
    codeTbc: false,
  },
  {
    id: 'exploding-balls',
    name: 'Exploding Balls',
    category: 'Combat',
    status: 'CONFIRMED',
    unlockChallenge: 'Deal explosive damage to 20 enemies',
    effect: 'Amplifies throwable / explosive ordnance detonation.',
    dpad: ['↓', '↑', '←', '←', '→', '↓', '↓', '↑', '→'],
    codeTbc: false,
  },
  {
    id: 'raise-heat-level',
    name: 'Raise Heat Level',
    category: 'Player',
    status: 'CONFIRMED',
    unlockChallenge: 'Escape a 3-Star Wanted Level 25 times',
    effect: 'Escalates local district Heat state.',
    dpad: ['←', '↓', '→', '↓', '↑', '↓', '↑'],
    codeTbc: false,
  },
  {
    id: 'raise-wanted-level',
    name: 'Raise Wanted Level',
    category: 'Player',
    status: 'CONFIRMED',
    unlockChallenge: 'Escape a 3-Star Wanted Level 50 times',
    effect: 'Raises Wanted Stars up to 6-Star Federal response.',
    dpad: ['←', '↓', '→', '↓', '↑', '→', '↑'],
    codeTbc: false,
  },
  {
    id: 'vehicle-force',
    name: 'Vehicle Force',
    category: 'Combat',
    status: 'CONFIRMED',
    unlockChallenge: 'Kill 25 enemies with a vehicle',
    effect: 'Multiplies vehicle ramming impact force.',
    dpad: ['↓', '↑', '←', '←', '→', '↓', '←', '↑', '↓'],
    codeTbc: false,
  },
  {
    id: 'maibatsu-boomazoom',
    name: 'Maibatsu Boomazoom',
    category: 'Spawn Vehicles',
    status: 'COMMUNITY-VERIFIED',
    unlockChallenge: 'Complete 5 shopping challenges',
    effect: 'Spawns the Maibatsu Boomazoom street ride.',
    dpad: ['←', '↑', '→', '↓', '←', '←', '↑', '←'],
    codeTbc: false,
  },
  {
    id: 'mtl-pumper',
    name: 'MTL Pumper',
    category: 'Spawn Vehicles',
    status: 'COMMUNITY-VERIFIED',
    unlockChallenge: 'Unlock in Progress > Cheats',
    effect: 'Spawns the MTL Pumper heavy fire/utility rig.',
    dpad: ['←', '↑', '→', '↓', '←', '→', '→', '↑'],
    codeTbc: false,
  },
  {
    id: 'hvy-bulldozer',
    name: 'HVY Bulldozer',
    category: 'Spawn Vehicles',
    status: 'COMMUNITY-VERIFIED',
    unlockChallenge: 'Unlock in Progress > Cheats',
    effect: 'Spawns the heavy industrial HVY Bulldozer.',
    dpad: ['←', '↑', '→', '↓', '←', '→', '→', '↓'],
    codeTbc: false,
  },
  {
    id: 'max-ammo',
    name: 'Max Ammo',
    category: 'Combat',
    status: 'CHALLENGE ONLY · TBC',
    unlockChallenge: 'Earn 20 Bronze Shooting Range Medals',
    effect: 'Refills reserve weapon ammunition pools.',
    dpad: [],
    codeTbc: true,
  },
  {
    id: 'infinite-ammo',
    name: 'Infinite Ammo',
    category: 'Combat',
    status: 'CHALLENGE ONLY · TBC',
    unlockChallenge: 'Earn 25 Silver Shooting Range Medals',
    effect: 'Removes ammo expenditure.',
    dpad: [],
    codeTbc: true,
  },
  {
    id: 'all-explosives',
    name: 'All Explosives',
    category: 'Combat',
    status: 'CHALLENGE ONLY · TBC',
    unlockChallenge: 'Clear 100 Grenade kills/throws challenge',
    effect: 'Restocks heavy explosive ordnance.',
    dpad: [],
    codeTbc: true,
  },
  {
    id: 'drunk-mode',
    name: 'Drunk Mode',
    category: 'Player',
    status: 'CHALLENGE ONLY · TBC',
    unlockChallenge: 'Spend $2,500 on alcohol in bars & shops',
    effect: 'Toggles ragdoll/camera intoxication physics.',
    dpad: [],
    codeTbc: true,
  },
  {
    id: 'no-fall-damage',
    name: 'No Fall Damage',
    category: 'Player',
    status: 'CHALLENGE ONLY · TBC',
    unlockChallenge: 'Survive 20 freefalls from 40+ feet',
    effect: 'Negates vertical impact damage.',
    dpad: [],
    codeTbc: true,
  },
  {
    id: 'parachute',
    name: 'Spawn Parachute',
    category: 'Player',
    status: 'CHALLENGE ONLY · TBC',
    unlockChallenge: 'Complete 50 skydives or BASE jumps from 300+ ft',
    effect: 'Equips reserve chute directly.',
    dpad: [],
    codeTbc: true,
  },
  {
    id: 'inflatable-flamingo',
    name: 'Inflatable Pink Flamingo',
    category: 'Spawn Vehicles',
    status: 'CHALLENGE ONLY · TBC',
    unlockChallenge: 'Destroy 50 Cocaine Flamingos',
    effect: 'Spawns the collectible pink flamingo toy/float.',
    dpad: [],
    codeTbc: true,
  },
];

export const LEONIDA_CHEAT_CARDS = LEONIDA_VERIFIED_CHEATS;

export const LEONIDA_PHONE_MYTHBUSTERS = [
  {
    title: 'No Manual Phone Dial Pad',
    detail: 'GTA VI has NO keypad for dialing 911 or cheat digits. Every call happens strictly through saved Contacts.',
  },
  {
    title: 'Skunk Ape Flyer (461-555-0139)',
    detail:
      'Do NOT try to dial 461-555-0139. Inspect a "Have You Seen Skunk Ape???" flyer (Rusty Anchor bar in Key Lento right of entrance, or Skeers Bar in Hamlet) to add Kirk -> call Kirk -> meet at Pelican River marshes at night.',
  },
  {
    title: 'Static Keypads vs Randomized Safes',
    detail: "Open-world store/bank safes randomize per run, while Brian's Lockup (7700) and Moonstone Boutique (0420) stay static.",
  },
];

export const LEONIDA_LAUNCH_FIXES = [
  {
    id: 'patch_01002002',
    label: 'Patch 01.002.002 / 1.0.2.2 (Nov 23)',
    badge: 'NOV 23 HOTFIX · 7 OFFICIAL FIXES',
    isScam: false,
    summary:
      'Rockstar released Patch 01.002.002 (~603.8 MB PS5) / 1.0.2.2 (~1.6 GB Xbox) on Nov 23, 2026 fixing 7 major blockers (while Apollo Aggregates remains unpatched as of Nov 24).',
    steps: [
      'Stability & Saves: Fixed multiple game crashes and a bug causing autosave failures.',
      'Story & World Fixes: Fixed weather getting stuck without changing, story phone calls not triggering, Wanted Levels refusing to clear, broken gym deadlift bars, and partners failing to hand over bags to sell at Fences.',
      'If a scripted phone call stalled pre-patch, install 01.002.002 / 1.0.2.2 and reload Pause > Game > Load Game or retry checkpoint.',
    ],
  },
  {
    id: 'ps5_boot',
    label: "PS5 Won't Launch",
    badge: 'FIRMWARE 26.07-14.23.00',
    isScam: false,
    summary: 'Install mandatory PS5 Firmware 26.07-14.23.00 (1.267 GB, Nov 17, 2026) and confirm Patch 01.002.002 (~603.8 MB PS5).',
    steps: [
      'Open PS5 Settings -> System -> System Software -> System Software Update and Settings.',
      'Update to FW 26.07-14.23.00 (1.267 GB), reboot your console cleanly, and confirm GTA VI shows Patch 01.002.002.',
      'Verify free SSD space leaves breathing room on 667 GB net PS5 825GB / 848 GB Slim 1TB.',
    ],
  },
  {
    id: 'psn_error',
    label: 'PSN Error WS-116449-5',
    badge: 'OFFLINE PLAY BYPASS',
    isScam: false,
    summary: 'Covers WS-116449-5, CE-34861-2, and WS-37505-0 even while the official Sony PSN status page still stays green.',
    steps: [
      'Toggle PS5 network connection off and back on (Test Internet Connection) to reset stale handshake state.',
      'While PSN responds briefly, enable Settings -> Users and Accounts -> Other -> Console Sharing and Offline Play.',
      'Launch GTA VI offline — single-player campaign boots locally without needing live PSN.',
    ],
  },
  {
    id: 'crash_save',
    label: 'PS5 / Pro Crash or Lost Hours',
    badge: '15-SLOT SAVE RULE',
    isScam: false,
    summary: 'GTA VI has zero mission replay and only 1 overwriting autosave. Protect every chapter transition with rotated manual saves.',
    steps: [
      'Confirm Patch 01.002.002 (PS5 ~603.8 MB) / 1.0.2.2 (Xbox ~1.6 GB) is installed before loading older saves.',
      'Rotate Pause Menu -> Game -> Save Game across all 15 manual slots (10 story checkpoints + 5 free-roam).',
      'Never save after activating any cheat code; reload your last clean uncheated slot before hunting trophies.',
    ],
  },
  {
    id: 'pc_scam',
    label: 'Free PC Download?',
    badge: 'SCAM ALERT',
    isScam: true,
    summary: 'GTA VI launched November 19, 2026 exclusively on PS5 and Xbox Series X|S. PC installers are phishing or malware scams.',
    steps: [
      'There is ZERO legitimate PC build or "free PC crack" on launch day — console only.',
      'Never run third-party ZIP/EXE installers or enter Rockstar / PlayStation / Xbox logins on mirror sites.',
      'Wait strictly for official Rockstar Newswire PC release announcements.',
    ],
  },
  {
    id: 'fast_travel',
    label: 'Fast Travel & Saving Cars',
    badge: 'RYDEME & SCOOTER BROS',
    isScam: false,
    summary: 'No map-warp fast travel in Leonida: book RydeMe ($100 skip via L2 + Triangle), ride buses/trains, or switch protagonists.',
    steps: [
      'Open your Phone and book RydeMe ($100 fare), then press L2 + Triangle during the ride to skip to destination.',
      'Use public buses/trains or switch between Jason and Lucia to jump across Leonida counties cleanly.',
      "Register any prized ride at Pay 'n' Spray so it becomes a tracked Personal Vehicle, then summon or recover it anytime via the Scooter Bros app.",
    ],
  },
];

export const LEONIDA_RADIO_STATIONS = [
  {
    id: 'flash-fm',
    num: 1,
    name: 'Flash FM',
    genre: 'Pop',
    hosts: 'Robyn, Alex Consani',
    tracks: 'Charli xcx "Good Ones", MGMT "Electric Feel", Zara Larsson & PinkPantheress "Midnight Sun"',
    secret: false,
  },
  {
    id: 'cocoteo-fm',
    num: 2,
    name: 'Cocoteo FM',
    genre: 'Modern Latin',
    hosts: '',
    tracks: 'Bad Bunny "El Martillo", RaiNao "La Gata"',
    secret: false,
  },
  {
    id: 'back-country-radio',
    num: 3,
    name: 'Back Country Radio',
    genre: 'Country',
    hosts: '',
    tracks: 'Morgan Wallen, Lana Del Rey "Delta Dawne", Jeremy Dufrene',
    secret: false,
  },
  {
    id: 'afrobank-fm',
    num: 4,
    name: 'AfroBank FM',
    genre: 'African Music',
    hosts: '',
    tracks: 'Burna Boy, Palms Trax',
    secret: false,
  },
  {
    id: 'the-chamber-106-6',
    num: 5,
    name: 'The Chamber 106.6',
    genre: 'Metal',
    hosts: 'Kerry King, Tom Araya',
    tracks: 'Black Sabbath "I", Pantera "I\'m Broken", Slayer "Raining Blood"',
    secret: false,
  },
  {
    id: 'dirty-south-classics',
    num: 6,
    name: 'Dirty South Classics',
    genre: 'Southern Hip-Hop',
    hosts: 'Trick Daddy, Trina',
    tracks: 'David Banner "Like A Pimp", JT Money "Who Dat", DJ Khaled "Born N Raised"',
    secret: false,
  },
  { id: 'emotion-98-3', num: 7, name: 'Emotion 98.3', genre: 'Classic Ballads / Soft Rock', hosts: '', tracks: '', secret: false },
  { id: 'vice-city-fm', num: 8, name: 'Vice City FM', genre: '80s Pop / Classics', hosts: '', tracks: '', secret: false },
  { id: 'v-rock', num: 9, name: 'V-Rock', genre: 'Hard Rock', hosts: '', tracks: '', secret: false },
  { id: 'stockyard-fm', num: 10, name: 'Stockyard FM', genre: 'Hip-Hop / Trap', hosts: '', tracks: '', secret: false },
  { id: 'vcrr', num: 11, name: 'VCRR', genre: 'Classic Rap / Electro', hosts: '', tracks: '', secret: false },
  { id: 'honey-fm', num: 12, name: 'Honey FM', genre: 'R&B / Soul', hosts: '', tracks: '', secret: false },
  { id: 'radio-la-ola', num: 13, name: 'Radio La Ola', genre: 'Latin / Tropical', hosts: '', tracks: '', secret: false },
  { id: 'radio-on-u', num: 14, name: 'Radio On-U', genre: 'Dub / Reggae', hosts: '', tracks: '', secret: false },
  { id: 'gloriana-blues', num: 15, name: 'Gloriana Blues Radio', genre: 'Blues', hosts: '', tracks: '', secret: false },
  { id: 'leonida-jazz', num: 16, name: 'Leonida Jazz Radio', genre: 'Jazz', hosts: '', tracks: '', secret: false },
  { id: 'symphony-fm', num: 17, name: 'Symphony FM', genre: 'Classical', hosts: '', tracks: '', secret: false },
  { id: 'worldwide-fm', num: 18, name: 'Worldwide FM', genre: 'Global / Eclectic', hosts: '', tracks: '', secret: false },
  { id: 'circoloco', num: 19, name: 'CircoLoco Records Radio', genre: 'House / Techno', hosts: '', tracks: '', secret: false },
  { id: 'kaleidoscope-fm', num: 20, name: 'Kaleidoscope FM', genre: 'Indie / Alt', hosts: '', tracks: '', secret: false },
  { id: 'wktt', num: 21, name: 'WKTT', genre: 'Talk Radio — We Know The Truth', hosts: '', tracks: '', secret: false },
  { id: 'the-wipe', num: 22, name: 'The Wipe', genre: 'Talk / Comedy', hosts: '', tracks: '', secret: false },
  {
    id: 'the-vault-radio',
    num: 23,
    name: 'The Vault Radio',
    genre: 'Secret #23',
    hosts: '',
    tracks: '',
    unlockNote: 'Unlock: scan pink gas-mask poster inside The Vault Nightclub in Vice City',
    secret: true,
  },
];

export const LEONIDA_SEARCH_ENTRIES = [
  ...LEONIDA_LAUNCH_FIXES.map((fix) => ({
    id: `fix-${fix.id}`,
    category: 'Fix',
    title: fix.label,
    detail: fix.summary,
    keywords: `${fix.label} ${fix.badge} ${fix.summary} ${fix.steps.join(' ')}`,
    tab: 'fixes',
    activeFix: fix.id,
  })),
  {
    id: 'set-blur',
    category: 'Settings',
    title: 'Motion Blur Strength: 3 -> 0',
    detail: '30fps clarity fix in Camera & Display settings',
    keywords: 'motion blur 3 0 camera 30fps oled',
    tab: 'settings',
  },
  {
    id: 'set-fuel',
    category: 'Settings',
    title: 'Hidden Fuel Gauge HUD: On',
    detail: 'Expose fuel gauge under minimap',
    keywords: 'fuel gauge hidden hud minimap',
    tab: 'settings',
  },
  {
    id: 'set-streamer',
    category: 'Settings',
    title: 'Streamer Mode Audio: Mute Licensed Radio',
    detail: 'Prevent Twitch / YouTube DMCA strikes',
    keywords: 'streamer dmca mute radio audio',
    tab: 'settings',
  },
  {
    id: 'set-classic',
    category: 'Settings',
    title: 'Classic Control Scheme & Accessible Combat',
    detail: 'GTA V sprint/jump layout + Trophy-safe accessibility',
    keywords: 'classic controls sprint jump accessible combat trophy safe',
    tab: 'settings',
  },
  {
    id: 'heat-6star',
    category: 'Heat',
    title: '6-Star Heat Decoder (Grey / White / Flashing / Red)',
    detail: 'Clear Vehicle, Outfit, Visible Longarm, Mask, CCTV & Partner tags',
    keywords: 'heat 6 star wanted solid grey white red outline cctv pay n spray',
    tab: 'money',
  },
  {
    id: 'profile-psycho',
    category: 'Criminal Profile',
    title: 'Psycho & Irredeemable Lock-In Guard',
    detail: 'Avoid 3 cracking-emoji warnings & Focus bonus loss',
    keywords: 'criminal profile psycho irredeemable endings focus mode',
    tab: 'money',
  },
  {
    id: 'money-safes',
    category: 'Money & Safes',
    title: 'Static Keypads (7700 / 0420) & Apollo Aggregates Loop',
    detail: 'Brian’s Lockup 7700, Moonstone 0420, Apollo loop unpatched in 01.002.002',
    keywords: 'safes keypad 7700 0420 brian lockup moonstone apollo aggregates warehouse glitch cash cap wipe moses jewelry randy bank vault shitzu squalo',
    tab: 'money',
  },
  {
    id: 'cheats-61',
    category: 'Cheats',
    title: '61 Verified D-Pad Cheats & Challenge Tracker',
    detail: 'Phone ↑ + L1+R1 / LB+RB · Pure D-Pad sequences · Disables trophies & saving',
    keywords: 'cheats 61 250000 unlimited focus attack force exploding balls body armor raise heat boomazoom pumper bulldozer max ammo infinite dpad',
    tab: 'money',
  },
  {
    id: 'skunk-ape-phone',
    category: 'Mythbuster',
    title: 'Skunk Ape Flyer (461-555-0139) & No Dial Pad',
    detail: 'Rusty Anchor / Skeers Bar flyer adds Kirk -> Pelican River at night',
    keywords: '461-555-0139 skunk ape kirk phone dial pad rusty anchor skeers bar pelican river',
    tab: 'fixes',
    activeFix: 'patch_01002002',
  },
  {
    id: 'ssd-fit',
    category: 'Storage',
    title: 'Console Fit & SSD Surgery (212 GB + Patch 01.002.002)',
    detail: 'PS5 825GB/Slim/Pro & Xbox Series X/S fit + Download ETA',
    keywords: 'ssd storage 212 gb patch 01.002.002 1.0.2.2 series s ps5 pro eta mbps',
    tab: 'storage',
  },
  {
    id: 'tracker-100',
    category: '100% Tracker',
    title: '100% Checklist, Positive Mental Attitude & 15 Save Slots',
    detail: 'WAiNK 200, Wildlife 100, Flamingos 100, Stunts 300, Cards 15',
    keywords: '100 platinum waink wildlife flamingos stunts cards save slots balcony missable',
    tab: 'session',
  },
  ...LEONIDA_RADIO_STATIONS.map((st) => ({
    id: `radio-${st.id}`,
    category: st.secret ? 'Secret Radio' : 'Radio',
    title: `${st.name} (#${st.num})`,
    detail: st.secret ? st.unlockNote : `${st.genre}${st.tracks ? ` · ${st.tracks}` : ''}`,
    keywords: `${st.name} ${st.genre} ${st.hosts || ''} ${st.tracks || ''} ${st.unlockNote || ''} radio`,
    tab: 'fixes',
    radioFilter: st.name,
  })),
];

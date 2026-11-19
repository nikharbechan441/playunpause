/**
 * GTA VI Launch-Day Second-Screen Tools Data (Nov 19, 2026)
 * Covers: Spoiler Shield, 61 Cheats / 12 Confirmed Haptic Combos, Ch. 1-4 Money & 4-Tier Robbery Protocol,
 * Digital Foundry 30fps Console Specs / PS5 FW 26.07-14.23.00 / Day-1 Settings, and Platinum + $99.99 Ultimate Checklist.
 */

export const SPOILER_CHAPTERS = [
  { id: 1, label: 'Ch. 1', title: 'Chapter 1 · Act Start' },
  { id: 2, label: 'Ch. 2', title: 'Chapter 2 · Leonida Expansion' },
  { id: 3, label: 'Ch. 3', title: 'Chapter 3 · Mid-Story Hustle' },
  { id: 4, label: 'Ch. 4', title: 'Chapter 4 · High-Stakes Vaults' },
  { id: 5, label: 'Ch. 5', title: 'Chapter 5 · Late Endgame' },
  { id: 6, label: 'Post-Story', title: 'Post-Story · All Unlocked' },
];

export const GTA6_CHEAT_META = {
  totalCount: 61,
  unlockCatch:
    'Requires Post-Story progression plus individual in-game Unlock Challenges before the D-Pad input registers cleanly.',
  triggerNote: {
    ps5: 'Open Phone (↑) + Hold L1 + R1',
    xbox: 'Open Phone (↑) + Hold LB + RB',
  },
  warning:
    'Activating any cheat temporarily disables Trophies / Achievements AND blocks manual/auto saving until you reload an uncheated save.',
  categories: [
    { name: 'Player & Combat', count: 18 },
    { name: 'Wanted & World', count: 14 },
    { name: 'Weapons & Physics', count: 15 },
    { name: 'Vehicles & Stunt Spawns', count: 14 },
  ],
};

export const GTA6_CONFIRMED_CHEATS = [
  {
    id: 'cash-250k',
    name: '$250K Cash Drop',
    category: 'Player & Combat',
    effect: 'Instantly adds $250,000 spending cash to your active protagonist wallet.',
    challenge: 'Unlock: Complete Story Finale + Reach 50% Robberies Milestone',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '→', '✕', '←', '→', 'R1', '→', '←', '✕', '△'],
    xboxCombo: ['Phone ↑', 'LB + RB', '→', 'A', '←', '→', 'RB', '→', '←', 'A', 'Y'],
  },
  {
    id: 'unlimited-focus',
    name: 'Unlimited Focus',
    category: 'Player & Combat',
    effect: 'Slow-motion precision aim & driving focus meter never drains.',
    challenge: 'Unlock: Complete Story + 30 Slow-Mo Headshot Streaks',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '□', 'L1', '△', '→', '□', 'L1', '→', '✕'],
    xboxCombo: ['Phone ↑', 'LB + RB', 'X', 'LB', 'Y', '→', 'X', 'LB', '→', 'A'],
  },
  {
    id: 'cycle-weather',
    name: 'Cycle Weather',
    category: 'Wanted & World',
    effect: 'Steps Leonida weather through Clear, Vice Dusk, Tropical Rain, Thunder, and Fog.',
    challenge: 'Unlock: Complete Story + Survive Category-4 Leonida Storm Mission',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', 'R2', '✕', 'L1', 'L1', 'L2', 'L2', 'L2', '□'],
    xboxCombo: ['Phone ↑', 'LB + RB', 'RT', 'A', 'LB', 'LB', 'LT', 'LT', 'LT', 'X'],
  },
  {
    id: 'body-armor',
    name: 'Body Armor',
    category: 'Player & Combat',
    effect: 'Replenishes full heavy ballistic vest and clears bleeding status.',
    challenge: 'Unlock: Complete Story + Win 15 Gunfight Encounters Clean',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '○', 'L1', '△', 'R2', '✕', '□', '○', '→', '□', 'L1'],
    xboxCombo: ['Phone ↑', 'LB + RB', 'B', 'LB', 'Y', 'RT', 'A', 'X', 'B', '→', 'X', 'LB'],
  },
  {
    id: 'max-infinite-ammo',
    name: 'Max / Infinite Ammo',
    category: 'Weapons & Physics',
    effect: 'Grants max reserve rounds + Bottomless Clip across equipped weapons.',
    challenge: 'Unlock: Complete Story + 250 Weapon Kills Mastery',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '△', 'R2', '←', 'L1', '✕', '→', '△', '↓', '□', 'L1'],
    xboxCombo: ['Phone ↑', 'LB + RB', 'Y', 'RT', '←', 'LB', 'A', '→', 'Y', '↓', 'X', 'LB'],
  },
  {
    id: 'no-reload',
    name: 'No Reload',
    category: 'Weapons & Physics',
    effect: 'Fires continuously from total ammo pool without magazine swap animation.',
    challenge: 'Unlock: Complete Story + Shooting Range Gold Medal',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '↑', '□', '→', '←', 'R1', 'R1', '←', '→', 'L2'],
    xboxCombo: ['Phone ↑', 'LB + RB', '↑', 'X', '→', '←', 'RB', 'RB', '←', '→', 'LT'],
  },
  {
    id: 'raise-heat-wanted',
    name: 'Raise Heat / Wanted',
    category: 'Wanted & World',
    effect: 'Steps Police / Federal Wanted Level up +1 Star per input (up to 6 Stars).',
    challenge: 'Unlock: Complete Story + Escape a 5-Star Air/Boat Pursuit',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', 'R1', 'R1', '○', 'R2', '←', '→', '←', '→'],
    xboxCombo: ['Phone ↑', 'LB + RB', 'RB', 'RB', 'B', 'RT', '←', '→', '←', '→'],
  },
  {
    id: 'exploding-balls',
    name: 'Exploding Balls',
    category: 'Weapons & Physics',
    effect: 'All fired rounds detonate on impact (Bang! Explosive Ammunition).',
    challenge: 'Unlock: Complete Story + Destroy 50 Pursuer Vehicles',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '→', '□', '✕', '←', 'R1', 'R2', '←', '→', 'L1'],
    xboxCombo: ['Phone ↑', 'LB + RB', '→', 'X', 'A', '←', 'RB', 'RT', '←', '→', 'LB'],
  },
  {
    id: 'vehicle-force',
    name: 'Vehicle Force',
    category: 'Vehicles & Stunt Spawns',
    effect: 'Dramatically amplifies ramming impulse and suspension push on traffic cars.',
    challenge: 'Unlock: Complete Story + 20 Air-Time Stunt Jumps',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '←', '←', 'L1', '→', '→', '←', '←', '□', '○'],
    xboxCombo: ['Phone ↑', 'LB + RB', '←', '←', 'LB', '→', '→', '←', '←', 'X', 'B'],
  },
  {
    id: 'boomazoom',
    name: 'Boomazoom',
    category: 'Vehicles & Stunt Spawns',
    effect: 'Super-boosted launch acceleration & drift nitrous burst for street cars.',
    challenge: 'Unlock: Complete Story + Top-3 Street Circuit Finishes',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', 'R1', '→', '←', 'L2', '□', '△', '→', 'L1', 'L1'],
    xboxCombo: ['Phone ↑', 'LB + RB', 'RB', '→', '←', 'LT', 'X', 'Y', '→', 'LB', 'LB'],
  },
  {
    id: 'pumper',
    name: 'Pumper',
    category: 'Vehicles & Stunt Spawns',
    effect: 'Spawns the lifted Leonida Pumper heavy mud-rig / monster utility truck.',
    challenge: 'Unlock: Complete Story + Grassrivers Swamp Time Trial',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '○', 'R1', '○', 'R1', '←', '←', 'R1', 'L1', '○'],
    xboxCombo: ['Phone ↑', 'LB + RB', 'B', 'RB', 'B', 'RB', '←', '←', 'RB', 'LB', 'B'],
  },
  {
    id: 'bulldozer',
    name: 'Bulldozer',
    category: 'Vehicles & Stunt Spawns',
    effect: 'Drops an industrial armored HVY Dozer heavy earth-mover ahead of you.',
    challenge: 'Unlock: Complete Story + Ambrosia Quarry Side Activity',
    minChapter: 6,
    ps5Combo: ['Phone ↑', 'L1 + R1', '↓', '↑', '→', '→', '←', 'L2', '□', 'R2'],
    xboxCombo: ['Phone ↑', 'LB + RB', '↓', '↑', '→', '→', '←', 'LT', 'X', 'RT'],
  },
];

export const GTA6_MONEY_METHODS = [
  {
    id: 'ch1-wipe-stop',
    minChapter: 1,
    chapterBadge: 'Ch. 1 CRITICAL RULE',
    title: 'STOP: Cash Wipes at End of Chapter 1',
    payoutRange: '$0 Carried Forward',
    ratePerHour: 0,
    cycleMinutes: 0,
    wipeWarning: true,
    gearNote: 'Spend leftover Ch. 1 cash on permanent weapon mods & clothes before finale!',
    detail:
      'Do NOT grind cash in Chapter 1. Unspent Jason/Lucia pocket money resets at the Chapter 1 -> Chapter 2 story transition.',
  },
  {
    id: 'ch2-moses',
    minChapter: 2,
    chapterBadge: 'Ch. 2 Fast Loop',
    title: 'Moses Repeat Side Runs ($1K+ / 2m)',
    payoutRange: '$1,000+ per 2 mins (~$30K/hr)',
    ratePerHour: 30000,
    cycleMinutes: 2,
    wipeWarning: false,
    gearNote: 'Zero heat when clean — best early starter capital right after Chapter 1 wipe.',
    detail:
      'Trigger Moses’ quick repeat pickups in Ch. 2: ~$1,000+ payout every 2 minutes cleanly funds armor & early safe houses.',
  },
  {
    id: 'ch3-jewelry-randy',
    minChapter: 3,
    chapterBadge: 'Ch. 3 Mid-Game Burst',
    title: "Jewelry ($10K–$25K) + Snap Gun + Randy's Wish List ($30K+)",
    payoutRange: '$10K–$25K Cases + $30K+ List Bonus',
    ratePerHour: 115000,
    cycleMinutes: 14,
    wipeWarning: false,
    gearNote: 'Bring the Snap Gun + Dye Pack Jammer; complete Randy’s Wish List targets for $30K+.',
    detail:
      'Smash Port Gellhorn / Vice strip jewelry cases for $10,000–$25,000 per score using the Snap Gun, and clear Randy’s Wish List boosts ($30,000+).',
  },
  {
    id: 'ch4-bank-vaults',
    minChapter: 4,
    chapterBadge: 'Ch. 4 Peak Vaults',
    title: 'Large Bank Vaults ($65K–$205K)',
    payoutRange: '$65,000–$205,000 per Vault',
    ratePerHour: 380000,
    cycleMinutes: 22,
    wipeWarning: false,
    gearNote: 'Requires Ch. 3 Dye Pack Jammer unlocked + rapid Cloud CCTV sweep.',
    detail:
      'Target multi-tray regional bank vaults ($65,000 to $205,000 depending on secondary carts & clean CCTV shutdown).',
  },
];

export const GTA6_ROBBERY_TIERS = [
  {
    id: 'tier-1-register',
    tier: 'Tier 1',
    minChapter: 1,
    title: '24/7 Register & Counter Intimidation',
    payout: '$450–$1,800',
    rule: 'Fast exit under 35s; skip waiting for backup safe unless Chapter 2+ tools are equipped.',
  },
  {
    id: 'tier-2-random-safes',
    tier: 'Tier 2',
    minChapter: 2,
    title: 'Randomized Safe Protocol (No Static Codes)',
    payout: '$3,500–$14,000',
    rule: 'GTA VI randomizes safe combinations on EVERY playthrough. Check sticky notes behind registers, desk invoices, or manager calendars inside that exact interior — fake fixed code lists do not work.',
  },
  {
    id: 'tier-3-cloud-cctv',
    tier: 'Tier 3',
    minChapter: 2,
    title: 'Cloud-Icon CCTV Countermeasure',
    payout: 'Zero Auto-Heat Bonus',
    rule: 'Look for pulsing Cloud-icon cameras above exits and counters. Shoot Cloud-icon cameras FIRST to sever instant dispatch upload before drilling or threatening staff.',
  },
  {
    id: 'tier-4-dye-jammer',
    tier: 'Tier 4',
    minChapter: 3,
    title: 'Ch. 3 Dye Pack Jammer + Large Vaults',
    payout: '$10K–$205K Clean Bills',
    rule: 'Never crack armored Jewelry ($10K–$25K) or Ch. 4 Bank Vaults ($65K–$205K) without toggling the Ch. 3 Dye Pack Jammer, or Ink Packs destroy up to 35% of your vault bag.',
  },
];

export const GTA6_CONSOLE_30FPS_SPECS = [
  {
    id: 'df-ps5-pro',
    console: 'PS5 Pro (30fps Fidelity)',
    resolution: '1440p PSSR Upscale',
    rtFeature: 'Full RT Reflections + Ray-Traced Shadows',
    framePacing: 'Locked 30fps (16.6ms/33.3ms Clean Frame Pacing)',
    note: 'Requires Sony Firmware 26.07-14.23.00 + Patch 1.002.001 (+0.6 GB).',
  },
  {
    id: 'df-ps5-base',
    console: 'PS5 Base & Slim CFI-2100 (30fps)',
    resolution: '~1152p–1440p DRS',
    rtFeature: 'Ray-Traced Global Illumination (GI)',
    framePacing: 'Solid 30fps with rare dense rain dips',
    note: 'Mandatory PS5 Firmware 26.07-14.23.00 prevents cutscene stutter & crashes.',
  },
  {
    id: 'df-xsx',
    console: 'Xbox Series X (120Hz VRR Mode)',
    resolution: '~1440p Dynamic FSR / TSR',
    rtFeature: 'RT Global Illumination · 120Hz VRR Support',
    framePacing: '30fps inside 120Hz LFC/VRR container',
    note: 'Enable 120Hz + VRR in Xbox Display Settings + Patch 1.002.001 (+1.6 GB).',
  },
  {
    id: 'df-xss',
    console: 'Xbox Series S (30fps FSR 4)',
    resolution: '~720p Native -> FSR 4 Upscale',
    rtFeature: 'Reduced Crowd Density & RT Reflections',
    framePacing: 'Steady 30fps target (213.6 GB total install w/ Patch 1.002.001)',
    note: '364 GB usable internal NVMe leaves 150.4 GB spare once empty.',
  },
];

export const GTA6_DAY1_SETTINGS_CHECKLIST = [
  {
    id: 'set-ps5-fw',
    title: 'Verify PS5 Firmware 26.07-14.23.00 (PS5 Users Mandatory)',
    detail: 'Confirm System -> System Software Info reads 26.07-14.23.00 before booting Chapter 1.',
    tag: 'CRITICAL',
  },
  {
    id: 'set-motion-blur',
    title: 'Motion Blur: Drop from 3 -> 0',
    detail: 'Removes camera pan smearing during high-speed Vice Beach driving & 30fps camera turns.',
    tag: 'CLARITY',
  },
  {
    id: 'set-fuel-gauge',
    title: 'Turn Hidden Fuel Gauge: ON (Gameplay HUD)',
    detail: 'Reveals realistic vehicle range indicator tucked below the minimap stamina bar.',
    tag: 'HIDDEN SETTING',
  },
  {
    id: 'set-subtitles',
    title: 'Subtitles & Speaker Labels: ON (Large)',
    detail: 'Car banter and police scanner callouts overlap fast in Leonida — prevents missed safe clues.',
    tag: 'CLARITY',
  },
  {
    id: 'set-controls',
    title: 'On-Foot Sprint / Shooting: Classic Controls Preset',
    detail: 'Prevents claw-grip fatigue and swaps hold-to-sprint back to crisp classic tap cadence.',
    tag: 'FEEL',
  },
];

export const GTA6_PLATINUM_MISSABLES = {
  trophyName: 'Positive Mental Attitude',
  chapter: 'Chapter 1 Only (Missable)',
  warning:
    'In Chapter 1, step onto the safehouse balcony at sunrise/dusk and complete the Balcony Meditation prompt before finishing Chapter 1’s finale mission. Leaving Chapter 1 locks out "Positive Mental Attitude" until a brand-new playthrough or backup save.',
};

export const GTA6_SAVE_SLOT_TEMPLATES = Array.from({ length: 15 }, (_, idx) => {
  const slotNum = idx + 1;
  const presets = {
    1: 'Ch. 1 Start · Pre-Balcony Meditation backup',
    2: 'End of Ch. 1 · Spend Cash Before Wipe',
    3: 'Ch. 2 Entry · Moses Repeats Ready',
    4: 'Ch. 3 Entry · Pre-Snap Gun & Jewelry',
    5: 'Ch. 3 Dye Jammer & Randy Wish List',
    6: 'Ch. 4 Entry · Ultimate Squalo Boat Unlock',
    7: 'Ch. 4 Bank Vault Seed ($65K-$205K)',
    15: 'Post-Story Clean Master Save (Uncheated)',
  };
  return {
    slot: slotNum,
    defaultLabel: presets[slotNum] || `Chapter Checkpoint Slot #${slotNum}`,
  };
});

export const GTA6_COLLECTIBLE_TARGETS = [
  { id: 'waink', label: 'WAiNK Scans', target: 200, hint: 'Leonida social media street photo & landmark scans' },
  { id: 'animals', label: 'Animals Cataloged', target: 100, hint: 'Land, Grassrivers wetland & Keys marine wildlife species' },
];

export const GTA6_ULTIMATE_CLAIMS = [
  {
    id: 'ult-squalo',
    minChapter: 4,
    exclusiveBadge: 'CHAPTER 4 ONLY',
    title: 'Shizu Typhoon Squalo (Offshore Speedboat)',
    detail:
      'Does NOT unlock in Chapters 1–3. Opens automatically at your Leonida Keys Marina dock only once Chapter 4 begins.',
  },
  {
    id: 'ult-starter-kit',
    minChapter: 1,
    exclusiveBadge: 'CH. 1+ WARDROBE',
    title: 'Vice Dusk Wardrobe & Safehouse Wall Prints',
    detail: 'Claim cleanly inside your starter closet mirror from Chapter 1 onward.',
  },
  {
    id: 'ult-guns',
    minChapter: 2,
    exclusiveBadge: 'CH. 2+ AMMU-NATION',
    title: 'Gold-Inlay Pistol Skin & Suppressor Pack',
    detail: 'Free $0 redemption at Ammu-Nation once free-roam gun counters open in Chapter 2.',
  },
  {
    id: 'ult-cash-token',
    minChapter: 2,
    exclusiveBadge: 'SAVE AFTER CH. 1 WIPE',
    title: '$99.99 Edition Bonus Cash Bundle Counter',
    detail:
      'Wait until Chapter 2 begins before claiming redeemable bonus cash vouchers so Chapter 1’s story wipe cannot zero it.',
  },
];

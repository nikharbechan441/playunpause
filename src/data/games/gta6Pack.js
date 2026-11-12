/**
 * GTA VI Launch Game Pack for Unpause (playunpause.com)
 * Structured so Day-1 New Zealand unlock numbers drop straight into these arrays in <30 seconds.
 */
export const gta6Pack = {
  id: 'gta-6',
  shortTitle: 'GTA VI',
  fullTitle: 'Grand Theft Auto VI',
  statusBadge: '212 GB Pre-Load',
  installSizeGb: 212,
  nzUnlockIsoUtc: '2026-11-18T11:00:00Z', // Midnight Nov 19 NZDT (UTC+13)

  consoles: [
    {
      id: 'xss-512',
      name: 'Xbox Series S (512 GB)',
      shortName: 'Series S · 512GB',
      usableGb: 364,
      platform: 'xbox',
      nzTrickWorks: true,
      nzStatusShort: 'Works via Settings',
      nzDetail:
        'Xbox rolling midnight unlocks follow system Location settings (New Zealand reaches midnight first on Nov 18 at 11:00 UTC). Note: standard external USB 3.0 drives CANNOT boot Series X|S games—only licensed Seagate / WD_Black C50 Expansion Cards work.',
      upgradeLabel: 'WD_Black C50 1TB Expansion Card (Plug & Play)',
      upgradeKind: 'xboxCardUrl',
    },
    {
      id: 'ps5-base',
      name: 'PS5 Base Launch Edition',
      shortName: 'PS5 Base · 825GB',
      usableGb: 667,
      platform: 'ps5',
      nzTrickWorks: false,
      nzStatusShort: 'Account Region Locked',
      nzDetail:
        'Changing your PS5 system clock does NOT unlock early. PS5 ties unlock times strictly to the region your PSN account was created in. Playing 13–18 hrs early requires a separate New Zealand PSN account funded with NZD gift cards.',
      upgradeLabel: '2TB PCIe Gen4 NVMe M.2 SSD w/ Heatsink (5,500+ MB/s)',
      upgradeKind: 'ps5SsdUrl',
    },
    {
      id: 'xsx-1tb',
      name: 'Xbox Series X (1 TB)',
      shortName: 'Xbox Series X · 1TB',
      usableGb: 802,
      platform: 'xbox',
      nzTrickWorks: true,
      nzStatusShort: 'Works via Settings',
      nzDetail:
        'Xbox rolling midnight unlocks historically follow system Location settings (New Zealand unlocks Nov 18 at 11:00 UTC, subject to store license region checks).',
      upgradeLabel: 'WD_Black C50 1TB/2TB Xbox Expansion Card',
      upgradeKind: 'xboxCardUrl',
    },
    {
      id: 'ps5-slim',
      name: 'PS5 Slim (1 TB)',
      shortName: 'PS5 Slim · 1TB',
      usableGb: 848,
      platform: 'ps5',
      nzTrickWorks: false,
      nzStatusShort: 'Account Region Locked',
      nzDetail:
        'PS5 digital pre-loads unlock strictly at midnight in your PSN Store billing country. System timezone changes have zero effect.',
      upgradeLabel: '2TB Gen4 M.2 NVMe SSD w/ Integrated Heatsink',
      upgradeKind: 'ps5SsdUrl',
    },
    {
      id: 'ps5-pro',
      name: 'PS5 Pro (2 TB)',
      shortName: 'PS5 Pro · 2TB',
      usableGb: 1890,
      platform: 'ps5',
      nzTrickWorks: false,
      nzStatusShort: 'Account Region Locked',
      nzDetail:
        'Plenty of internal SSD room for 212 GB + Day-1 patches. Reminder: physical disc copies require the separate Sony Detachable Disc Drive (CFI-ZDD1).',
      upgradeLabel: 'Extra 2TB Gen4 M.2 NVMe Expansion Drive',
      upgradeKind: 'ps5SsdUrl',
    },
  ],

  commonInstalledGames: [
    { id: 'cod-hq', title: 'Call of Duty HQ (BO6 + Warzone)', sizeGb: 148 },
    { id: 'nba-2k', title: 'NBA 2K26', sizeGb: 142 },
    { id: 'rdr2', title: 'Red Dead Redemption 2', sizeGb: 115 },
    { id: 'gta5', title: 'GTA V / Online (Current-Gen)', sizeGb: 98 },
    { id: 'cyberpunk', title: 'Cyberpunk 2077 + Phantom Liberty', sizeGb: 89 },
    { id: 'helldivers', title: 'Helldivers 2', sizeGb: 85 },
    { id: 'apex', title: 'Apex Legends', sizeGb: 79 },
    { id: 'fortnite', title: 'Fortnite', sizeGb: 68 },
    { id: 'madden', title: 'EA Sports Madden / CFB', sizeGb: 64 },
    { id: 'eafc', title: 'EA Sports FC', sizeGb: 62 },
    { id: 'media-gallery', title: 'Media Gallery / Saved Video Clips', sizeGb: 45 },
  ],

  districts: [
    'All Districts',
    'Vice Beach',
    'Port Gellhorn',
    'Leonida Keys',
    'Grassrivers',
    'Ambrosia',
    'Mount Kalaga',
  ],

  /**
   * Safe & Door Keypad Vault:
   * Pre-launch entries carry `verified: false` so UI honestly badges them as Sandbox Samples
   * until Day-1 New Zealand live stream verification flips `verified: true` on Nov 18.
   */
  safes: [
    {
      id: 'pg-pawn-backroom',
      title: 'Port Gellhorn Strip Pawn Backroom',
      district: 'Port Gellhorn',
      code: '0419',
      clueLocation: 'Chalked behind the broken neon clock above the counter',
      reward: '$4,500 Cash + Suppressor Mod',
      verified: false,
      verifiedStatus: 'Simulated UI Demo · Verified Nov 18',
      freeTier: true,
    },
    {
      id: 'vb-ocean-motel-204',
      title: 'Ocean Drive Art-Deco Motel Office Safe',
      district: 'Vice Beach',
      code: '1986',
      clueLocation: 'Framed vintage postcard year on the manager desk',
      reward: '$6,200 Cash + High-Roller Keycard',
      verified: false,
      verifiedStatus: 'Simulated UI Demo · Verified Nov 18',
      freeTier: true,
    },
    {
      id: 'lk-marina-boathouse',
      title: 'Keys Bait & Charter Dockside Keypad',
      district: 'Leonida Keys',
      code: '7734',
      clueLocation: 'Upside-down calculator taped to the fuel ledger',
      reward: 'Smuggler Stash + Heavy Pistol Frame',
      verified: false,
      verifiedStatus: 'Simulated UI Demo · Verified Nov 18',
      freeTier: true,
    },
    {
      id: 'gr-airboat-shack',
      title: 'Grassrivers Gator-Tour Workshop Floor Safe',
      district: 'Grassrivers',
      code: '3050',
      clueLocation: 'Area-code stencil on the rusted airboat fan cage',
      reward: '$3,800 Cash + Slug Ammo Crate',
      verified: false,
      verifiedStatus: 'Simulated UI Demo · Verified Nov 18',
      freeTier: true,
    },
    {
      id: 'am-refinery-foreman',
      title: 'Ambrosia Sugar Mill Foreman Locker',
      district: 'Ambrosia',
      code: '6210',
      clueLocation: 'Shift inspection tag hanging by the breaker box',
      reward: 'Industrial Thermite Charge + $8,000',
      verified: false,
      verifiedStatus: 'Simulated UI Demo · Verified Nov 18',
      freeTier: true,
    },
    {
      id: 'mk-ranger-tower',
      title: 'Mount Kalaga Firewatch Supply Bunker',
      district: 'Mount Kalaga',
      code: '8842',
      clueLocation: 'Elevation marker plaque on the north lookout rail',
      reward: 'Precision Scoped Rifle + $5,100',
      verified: false,
      verifiedStatus: 'Simulated UI Demo · Verified Nov 18',
      freeTier: true,
    },
  ],

  heistPresets: [
    { id: 'ocean-vault', title: 'Vice Beach Reserve Job', grossDollars: 2_450_000, supportFeePct: 12 },
    { id: 'keys-yacht', title: 'Keys Offshore Yacht Sweep', grossDollars: 1_320_000, supportFeePct: 14 },
    { id: 'port-armored', title: 'Port Gellhorn Armored Depot', grossDollars: 680_000, supportFeePct: 10 },
    { id: 'diner-blitz', title: 'Early Story Register & Brinks Run', grossDollars: 145_000, supportFeePct: 8 },
  ],

  marketFlips: [
    {
      id: 'flip-pharma',
      step: 'Flip #1 · Pre-Mission Setup',
      buyTicker: 'BETTA / Rival Bio-Lab',
      timingRule: 'Invest 100% across BOTH protagonists BEFORE triggering the contract phone call',
      estPeakPct: 68,
      reboundTicker: 'Target Corp (48h post-drop)',
      reboundPct: 45,
    },
    {
      id: 'flip-shipping',
      step: 'Flip #2 · Port Cargo Sabotage',
      buyTicker: 'Coastline Freight Rival',
      timingRule: 'Buy prior to dockyard briefing; sleep 2× in safehouse until chart plateaus, never hold past 36 in-game hrs',
      estPeakPct: 82,
      reboundTicker: 'Harbor Logistics Rebound',
      reboundPct: 52,
    },
    {
      id: 'flip-tech',
      step: 'Flip #3 · Vice Media / Tech Tank',
      buyTicker: 'Competitor Telecom Ticker',
      timingRule: 'Save these side contracts for Act III if you want to compound $1.5M+ heist seed capital into $8M+',
      estPeakPct: 95,
      reboundTicker: 'Post-Crash Bounce Play',
      reboundPct: 60,
    },
  ],

  missablesShield: [
    {
      id: 'ch1-shield',
      chapter: 'Act I · Port Gellhorn Opening',
      freePreview: true,
      alertLevel: 'amber',
      triggerWarning: 'Before starting the final motel checkout mission in Port Gellhorn',
      spoilerFreeRule:
        'Clear the 2 roadside pawn stashes and grab the free tuned coupe behind the auto shop first—access to the starter safehouse garage locks temporarily once you head east.',
      itemsAtRisk: 3,
    },
    {
      id: 'ch2-shield',
      chapter: 'Act II · Vice Beach Arrival',
      freePreview: false,
      alertLevel: 'coral',
      triggerWarning: 'Before accepting any corporate contract side-calls at payphones/burners',
      spoilerFreeRule:
        'Do NOT run market-moving side contracts with $12,000 in your pocket. Hold all optional contract hits until after your first major vault payout so you multiply 7-figure cash instead of pocket change.',
      itemsAtRisk: 4,
    },
    {
      id: 'ch3-shield',
      chapter: 'Act III · Leonida Keys & Grassrivers',
      freePreview: false,
      alertLevel: 'coral',
      triggerWarning: 'Point-of-no-return prompt at the Keys marina',
      spoilerFreeRule:
        'Two side encounters in Grassrivers expire permanently if left unfinished before the Keys escalation.',
      itemsAtRisk: 2,
    },
  ],

  nightRoutes: {
    45: [
      { id: 'r45-1', mins: 8, title: 'Dial in Console Display & Motion-Blur Fix', detail: 'Turn off World Motion Blur + Chromatic Aberration; set Performance RT for locked 60fps.' },
      { id: 'r45-2', mins: 12, title: 'Port Gellhorn Pawn Safe + Suppressor Pickup', detail: 'Zero-heat indoor grab—saves $9,200 at gun shops in hour one.' },
      { id: 'r45-3', mins: 15, title: 'Hidden Tuned Starter Coupe (Keep in Garage)', detail: 'Park inside safehouse bay immediately to insure for free.' },
      { id: 'r45-4', mins: 10, title: 'Quick-Save Slot #2 Before Story Marker', detail: 'Manual backup slot protects your Act I missables.' },
    ],
    90: [
      { id: 'r90-1', mins: 10, title: 'Console 60fps & Audio Midnight-Mix Setup', detail: 'Enable Night-Mode Dynamic Range in Audio so gunshots do not wake the house at 10 PM.' },
      { id: 'r90-2', mins: 18, title: 'Port Gellhorn Safe + Roadside Fence Loop', detail: 'Chains 2 safes + 1 armored courier spawn along US-1 ($14k starter bankroll).' },
      { id: 'r90-3', mins: 22, title: 'Vice Beach Motel Keycard & Stash Sweep', detail: 'Unlocks fast-travel cash buffer + free body armor spawn.' },
      { id: 'r90-4', mins: 25, title: '1 Main Story Mission + Side Encounter #1', detail: 'Clears Act I bottleneck while keeping market contracts untouched.' },
      { id: 'r90-5', mins: 15, title: 'Fence Drop-Off & Safehouse Manual Save', detail: 'Bank loose cash before logging off so street busts cost $0.' },
    ],
    120: [
      { id: 'r120-1', mins: 15, title: 'Full Port Gellhorn 3-Safe Cash Circuit', detail: 'Clears northern strip stashes in one clockwise loop.' },
      { id: 'r120-2', mins: 30, title: 'Keys Dockside Smuggler Boat + Heavy Frame', detail: 'Secures high-tier sidearm before armored enemies appear.' },
      { id: 'r120-3', mins: 45, title: '2 Core Story Missions + Crew Affinity Boost', detail: 'Unlocks higher-tier heist hacker/driver NPCs with lower cut fees.' },
      { id: 'r120-4', mins: 30, title: 'Grassrivers Airboat Safe & Nightly Bank Wrap', detail: 'Clean 2-hour stopping point with zero cliffhanger cutscenes.' },
    ],
  },
};

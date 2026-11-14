import { COD_MW4_WEAPONS, TOP_GAMES, resolveGameIdFromSlug } from './games/allGames.js';
import { gta6Pack } from './games/gta6Pack.js';
import {
  calcCodTtk,
  calcNetherCoords,
  calcFc27Tax,
  calcRobloxDevEx,
  calcCs2Economy,
  calcValorantEconomy,
  calcFortniteXp,
  getFreeApexLevelPacks,
  calcGtaOnlineHeist,
  clampNum,
} from '../utils/gameMath.js';

export const CANONICAL_ORIGIN = 'https://playunpause.com';
export const INDEXNOW_KEY = 'a8f4c2e91b7d40639e5a2c81f0d3b7e4';

export const GAME_TO_CANONICAL_PATH = {
  'gta-6': '/',
  'cod-warzone': '/cod-warzone',
  fortnite: '/fortnite',
  minecraft: '/minecraft',
  'ea-fc-27': '/ea-fc-27',
  roblox: '/roblox',
  cs2: '/cs2',
  valorant: '/valorant',
  'apex-legends': '/apex-legends',
  'gta-v': '/gta-online',
};

export const TAB_TO_CANONICAL_PATH = {
  storage: '/gta-6/storage',
  safes: '/gta-6/safe-codes',
  squad: '/gta-6/heist-split',
  nightrun: '/gta-6/night-run',
};

export const LEGAL_META = {
  terms: {
    path: '/legal/terms',
    title: 'Terms of Service & ECTA Disclosures — Unpause',
    description:
      'Read Unpause Terms of Service, ECTA s.43 disclosures, 18+ age rules, Whop billing, and Nov 2026 preview terms. Support: hello@playunpause.com.',
    h1: 'Unpause Terms of Service & ECTA s. 43 Disclosures',
    body: 'playunpause.com is an independent, unofficial read-only browser calculator and companion utility. Users must be 18+ or have verifiable parent/guardian consent. We do not sell game software, cheats, accounts, gambling, financial advice, or RMT currency. The Unpause One-Time Sync Pass ($6.99 USD Founders until Nov 18 2026 11:00 UTC, then $9.99 USD; plus VAT/sales tax via Whop Merchant of Record) unlocks cross-device cloud sync and extended routes during service lifetime (minimum 12 months digital conformity commitment / 30 days shutdown notice). Support: hello@playunpause.com.',
  },
  privacy: {
    path: '/legal/privacy',
    title: 'Privacy Notice (POPIA · GDPR · CCPA) — Unpause',
    description:
      'Review Unpause zero-ad privacy architecture: self-hosted fonts, local browser storage, HMAC-SHA256 email hashing, Cloudflare metrics, and DELETE sync purge.',
    h1: 'Unpause Privacy Notice (POPIA · EU/UK GDPR · CCPA)',
    body: 'playunpause.com runs zero behavioral ad networks and never sells personal information. Typography fonts are self-hosted directly from playunpause.com with zero external Google Fonts requests or IP sharing. Information Officer: hello@playunpause.com. Free tool inputs stay in localStorage; paid Whop orders store HMAC-SHA256 email hashes, receipt IDs, and state JSON on Cloudflare Workers & D1 (with privacy-first Cloudflare Web Analytics). No directed collection from children under 13/16/18. Tax ledgers kept 5-7 years; inactive sync state purged cleanly via email or authenticated DELETE /api/sync/:code. Escalate unresolved POPIA queries to the Information Regulator (South Africa) at POPIAComplaints@inforegulator.org.za.',
  },
  refunds: {
    path: '/legal/refunds',
    title: '14-Day Refund & Sponsor Ad Policy — Unpause',
    description:
      'Explore our 14-day hassle-free Sync Pass refund guarantee alongside EU/UK statutory rights and moderation rules for $149/day verified sponsorships.',
    h1: '14-Day Refund Policy & Sponsored Ad Rules',
    body: 'Unpause Sync Pass carries a 14-day hassle-free refund guarantee via hello@playunpause.com (or Whop Resolution Center; statement reads WHOP*PLAYUNPAUSE), honoring EU/UK 14-day statutory rights and UK CRA 2015 remedies. Header sponsors ($149/24h via sponsors@playunpause.com) require 18+/business purchasers, public HTTPS links, manual moderation, and explicit Sponsored: labeling; gambling, RMT, malware, NSFW, and Punycode domains are prohibited.',
  },
  ip: {
    path: '/legal/ip',
    title: 'IP, Trademarks, DMCA & Affiliate Info — Unpause',
    description:
      'View Unpause publisher non-affiliation statements, Mojang and CD PROJEKT S.A. trademark notices, 17 U.S.C. 512(c)(3) DMCA contacts, and affiliate info.',
    h1: 'Intellectual Property, DMCA & FTC Affiliate Disclosure',
    body: 'playunpause.com is an independent, unofficial utility not affiliated with or endorsed by Take-Two Interactive, Rockstar Games, Activision, Epic Games, Mojang AB, Microsoft, Electronic Arts, CD PROJEKT S.A., Respawn Entertainment, Valve, Riot Games, Roblox Corp., or Sony Interactive Entertainment. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. FIFA is a registered trademark of FIFA. As an Amazon Associate I earn from qualifying purchases. DMCA / IP agent: dmca@playunpause.com.',
  },
};

function clampDesc(str) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  if (s.length >= 135 && s.length <= 158) return s;
  if (s.length > 158) {
    const cut = s.slice(0, 157);
    const lastSpace = cut.lastIndexOf(' ');
    const trimmed = (lastSpace > 130 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\s-]+$/, '');
    return `${trimmed}.`;
  }
  const pad = ' Free browser tool with zero popup ads.';
  const joined = `${s}${s.endsWith('.') ? '' : '.'}${pad}`;
  return joined.length <= 158 ? joined : clampDesc(joined);
}

function clampTitle(str) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  if (s.length <= 60 && s.length >= 25) return s;
  if (s.length > 60) {
    const suffix = ' — Unpause';
    const base = s.endsWith(suffix) ? s.slice(0, -suffix.length) : s;
    const maxBase = 60 - suffix.length;
    const cut = base.slice(0, maxBase);
    const sp = cut.lastIndexOf(' ');
    return `${(sp > 18 ? cut.slice(0, sp) : cut).replace(/[.,;:\s-]+$/, '')}${suffix}`;
  }
  return `${s} — Unpause`;
}

function formatEta(minutes) {
  const mins = Math.max(1, Math.round(minutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

function getGameMetaRows(gameId) {
  const pack = TOP_GAMES.find((g) => g.id === gameId);
  return Array.isArray(pack?.proMetaRows) ? pack.proMetaRows : [];
}

function getGameFaqs(gameId) {
  const pack = TOP_GAMES.find((g) => g.id === gameId);
  return Array.isArray(pack?.faqs) ? pack.faqs : [];
}

const CONSOLE_SEO_SPECS = [
  {
    slug: 'xbox-series-s-512gb',
    consoleId: 'xss-512',
    freeGb: 140,
    includePatch: false,
    shortLabel: 'Xbox Series S 512GB',
    title: 'GTA 6 Xbox Series S 512GB Fit Check (225 GB?) — Unpause',
    description:
      'Will GTA 6 fit on Xbox Series S 512GB? Calculate exact 225 GB vs 364 GB usable NVMe headroom, see which games to uninstall, and check expansion cards now.',
    h1: 'Will GTA VI Fit on Xbox Series S (512 GB)?',
    answer:
      'Xbox Series S (512 GB) provides 364 GB of usable internal NVMe space. At an estimated 225 GB Xbox install, GTA VI consumes 61.8% of your usable drive—leaving 139 GB free when empty, or requiring ~85 GB cleared if you only have 140 GB open.',
    faqs: [
      {
        q: 'Can Xbox Series S run GTA 6 off a cheap USB external drive?',
        a: 'No. Current-gen Xbox Series X|S titles must run from internal NVMe or an official Storage Expansion Card. Standard USB 3.0 drives only archive cold games.',
      },
      {
        q: 'Does the Xbox New Zealand trick work on Series S?',
        a: 'Historically, switching Xbox System Location to New Zealand unlocks participating digital titles at Nov 18 11:00 UTC (subject to publisher rollout).',
      },
    ],
  },
  {
    slug: 'xbox-series-s-1tb',
    consoleId: 'xss-1tb',
    freeGb: 320,
    includePatch: false,
    shortLabel: 'Xbox Series S 1TB',
    title: 'GTA 6 Xbox Series S 1TB Storage Check (225 GB) — Unpause',
    description:
      'Check GTA 6 fit on the Carbon Black Xbox Series S 1TB (802 GB usable). Compare 225 GB install + Day-1 patch headroom and download time in seconds, ad-free.',
    h1: 'GTA VI Storage Check for Xbox Series S (1 TB)',
    answer:
      'The 1 TB Xbox Series S exposes 802 GB of usable NVMe storage. An estimated 225 GB install leaves 577 GB for other titles—enough for Call of Duty HQ, Fortnite, and EA FC 27 alongside GTA VI with zero external card needed.',
  },
  {
    slug: 'xbox-series-x-1tb',
    consoleId: 'xsx-1tb',
    freeGb: 260,
    includePatch: false,
    shortLabel: 'Xbox Series X 1TB',
    title: 'GTA 6 Xbox Series X 1TB Storage & NZ Unlock — Unpause',
    description:
      'Calculate Xbox Series X 1TB (802 GB usable) headroom for GTA 6 225 GB preload, Day-1 patch space, Mbps download ETA, and Nov 18 New Zealand midnight unlock rules.',
    h1: 'GTA VI Storage Fit & NZ Unlock on Xbox Series X (1 TB)',
    answer:
      'Xbox Series X 1 TB provides 802 GB of usable internal storage, so an estimated 225 GB GTA VI install uses 28.1% of capacity (or 32.4% with a +35 GB Day-1 patch). Test your exact free space and download speed live below.',
  },
  {
    slug: 'ps5-base-825gb',
    consoleId: 'ps5-base',
    freeGb: 180,
    includePatch: false,
    shortLabel: 'PS5 Base 825GB',
    title: 'GTA 6 Base PS5 825GB Storage Check (212 GB) — Unpause',
    description:
      'Does 212 GB GTA 6 fit on a launch PS5 (667 GB usable)? Pick installed games to delete, calculate +35 GB Day-1 patch headroom, and export your Preload Spec Card.',
    h1: 'Will GTA VI Fit on Launch PS5 (825 GB / 667 GB Usable)?',
    answer:
      'Original launch PlayStation 5 consoles expose 667 GB of usable SSD space. An estimated 212 GB GTA VI install takes 31.8% of the drive (247 GB with a +35 GB Day-1 buffer), leaving room for two or three staples once older games are cleared.',
  },
  {
    slug: 'ps5-slim-1tb',
    consoleId: 'ps5-slim',
    freeGb: 310,
    includePatch: false,
    shortLabel: 'PS5 Slim 1TB',
    title: 'GTA 6 PS5 Slim 1TB Storage Fit & ETA Check — Unpause',
    description:
      'Test GTA 6 212 GB preload space on PS5 Slim 1TB (848 GB usable). Check remaining NVMe headroom, download ETA by Mbps, and official PSN region unlock timing.',
    h1: 'GTA VI Storage Check for PS5 Slim (1 TB · 848 GB Usable)',
    answer:
      'PS5 Slim models ship with 848 GB of usable internal SSD capacity—181 GB more than the launch PS5. GTA VI (est. 212 GB) fills exactly 25.0% of usable storage, leaving 636 GB for remaining games and capture clips.',
  },
  {
    slug: 'ps5-pro-2tb',
    consoleId: 'ps5-pro',
    freeGb: 950,
    includePatch: false,
    shortLabel: 'PS5 Pro 2TB',
    title: 'GTA 6 PS5 Pro 2TB Storage & Patch Check — Unpause',
    description:
      'Check GTA 6 212 GB + 35 GB patch impact on PS5 Pro (1,890 GB usable SSD), calculate gigabit preload ETA, and confirm PSN regional midnight launch timing now.',
    h1: 'GTA VI Storage & Gigabit ETA on PS5 Pro (2 TB)',
    answer:
      'PlayStation 5 Pro delivers 1,890 GB of usable SSD space, meaning an estimated 212 GB GTA VI preload uses just 11.2% of the internal drive. Calculate download duration at your fiber speed and check PSN disc-drive notes below.',
  },
  {
    slug: '212gb-day-one-patch',
    consoleId: 'ps5-base',
    freeGb: 190,
    includePatch: true,
    shortLabel: '212 GB + 35 GB Patch',
    title: 'GTA 6 212 GB + Day-1 Patch Storage Buffer — Unpause',
    description:
      'Plan for GTA 6 212–225 GB base install plus an estimated 35 GB Day-1 launch patch buffer across PS5 and Xbox consoles so your preload never stalls at 99%.',
    h1: 'GTA VI Base Install + Estimated 35 GB Day-1 Patch Check',
    answer:
      'Including an optional +35 GB Day-1 launch patch brings total required space to ~247 GB on PlayStation 5 and ~260 GB on Xbox Series X|S. Keeping this buffer free avoids failed midnight unpacking or emergency uninstalls.',
  },
  {
    slug: 'external-usb-drive-xbox-ps5',
    consoleId: 'xss-512',
    freeGb: 140,
    includePatch: false,
    shortLabel: 'USB vs NVMe Rules',
    title: 'Can GTA 6 Run From External USB Drive? Rules — Unpause',
    description:
      'Check PS5 and Xbox Series S|X external drive rules before preloading GTA 6: why USB 3.0 drives only store cold games and which NVMe expansions actually boot.',
    h1: 'External USB Drive vs NVMe Expansion Rules for GTA VI',
    answer:
      'Neither PS5 nor Xbox Series X|S can play current-gen titles from external USB 3.0 HDDs or SSDs. You can park Call of Duty or RDR2 on USB cold storage to clear 212–225 GB internally, or install a PCIe Gen4 M.2 SSD (PS5) / Xbox Expansion Card.',
  },
];

const UNLOCK_SEO_SPECS = [
  {
    slug: 'new-zealand-trick-xbox-ps5',
    path: '/gta-6/unlock-time/new-zealand-trick-xbox-ps5',
    consoleId: 'xsx-1tb',
    title: 'GTA 6 New Zealand Unlock Trick (Xbox vs PS5) — Unpause',
    description:
      'Does the GTA 6 New Zealand time trick work? Compare Xbox System Location vs PS5 PSN account locks, exact Nov 18 11:00 UTC countdown, and digital rollout rules.',
    h1: 'GTA VI New Zealand Unlock Rules: Xbox vs PS5',
    answer:
      'Midnight in New Zealand lands at Nov 18, 2026 at 11:00 UTC (6:00 AM EST / 1:00 PM SAST). Xbox Series X|S historically respects console Location settings on local midnight launches, whereas PS5 locks strictly to the country of your PSN purchase account.',
  },
  {
    slug: 'ps5-midnight-region-lock',
    path: '/gta-6/unlock-time/ps5-midnight-region-lock',
    consoleId: 'ps5-base',
    title: 'Why Changing PS5 Clock Does Not Unlock Early — Unpause',
    description:
      'Learn why switching PS5 timezone settings fails for early GTA 6 access, how PSN Store region locks work, and check your local preload timer without ads.',
    h1: 'PS5 Midnight Region-Lock Guide & Preload Timer',
    answer:
      'PlayStation 5 validates release timers against the PSN Store account that owns the digital license—never your system clock or timezone menu. Pre-loads typically unlock at midnight in that PSN store’s regional timezone (subject to publisher global sync).',
  },
];

const DOWNLOAD_SPEED_SPECS = [
  { slug: '25-mbps', mbps: 25, label: '25 Mbps DSL / LTE' },
  { slug: '50-mbps', mbps: 50, label: '50 Mbps Standard Broadband' },
  { slug: '100-mbps', mbps: 100, label: '100 Mbps Cable / Fiber' },
  { slug: '150-mbps', mbps: 150, label: '150 Mbps Broadband' },
  { slug: '250-mbps', mbps: 250, label: '250 Mbps Fast Fiber' },
  { slug: '300-mbps', mbps: 300, label: '300 Mbps Fiber' },
  { slug: '500-mbps', mbps: 500, label: '500 Mbps Fiber' },
  { slug: '1000-mbps-gigabit', mbps: 1000, label: '1,000 Mbps Gigabit' },
  { slug: 'starlink-satellite', mbps: 115, label: 'Starlink (~115 Mbps)' },
  { slug: '5g-home-internet', mbps: 180, label: '5G Home (~180 Mbps)' },
];

const DISTRICT_SPECS = [
  { slug: 'vice-beach', district: 'Vice Beach', query: 'Vice Beach' },
  { slug: 'port-gellhorn', district: 'Port Gellhorn', query: 'Port Gellhorn' },
  { slug: 'leonida-keys', district: 'Leonida Keys', query: 'Leonida Keys' },
  { slug: 'grassrivers', district: 'Grassrivers', query: 'Grassrivers' },
  { slug: 'ambrosia', district: 'Ambrosia', query: 'Ambrosia' },
  { slug: 'mount-kalaga', district: 'Mount Kalaga', query: 'Mount Kalaga' },
];

const HEIST_SPLIT_SPECS = [
  {
    slug: '2-player-duo',
    path: '/gta-6/heist-split/2-player-duo',
    title: 'GTA 6 2-Player Duo Heist Split Calculator — Unpause',
    description:
      'Split GTA 6 heist payouts cleanly for 2 players after NPC support fees, lock Host percentages to 100% exact sum, and share your Crew Payout Slip to Discord.',
    h1: 'GTA VI 2-Player Duo Heist Cut Splitter',
    preset: { subTab: 'heist', gross: 2450000, fee: 12, cuts: [55, 45] },
    answer:
      'On a $2,450,000 take with a 12% NPC support cut ($294,000), the $2,156,000 net pool splits 55/45 into $1,185,800 for Host and $970,200 for Co-Lead with zero rounding drift.',
  },
  {
    slug: '3-player-trio',
    path: '/gta-6/heist-split/3-player-trio',
    title: 'GTA 6 3-Player Trio Heist Split Calculator — Unpause',
    description:
      'Balance 3-player heist cuts automatically to 100%, deduct NPC support fees, test 40/30/30 splits, and export a PNG payout slip for party chat in seconds.',
    h1: 'GTA VI 3-Player Trio Heist Cut Splitter',
    preset: { subTab: 'heist', gross: 2450000, fee: 12, cuts: [40, 30, 30] },
    answer:
      'A 40/30/30 trio split across a $2,156,000 net heist pool pays $862,400 to the Host and $646,800 each to Crew #2 and #3 after deducting 12% NPC support fees.',
  },
  {
    slug: '4-player-squad',
    path: '/gta-6/heist-split/4-player-squad',
    title: 'GTA 6 4-Player Squad Heist Split Calculator — Unpause',
    description:
      'Calculate exact 4-player heist percentages (40/20/20/20 or locked crew shares), auto-deduct NPC cuts, and download a crisp Crew Payout Slip PNG instantly.',
    h1: 'GTA VI 4-Player Squad Heist Cut Splitter',
    preset: { subTab: 'heist', gross: 2450000, fee: 12, cuts: [40, 20, 20, 20] },
    answer:
      'With a $2,450,000 vault take and 12% NPC fee, a classic 40/20/20/20 4-player split allocates $862,400 to the Host and $431,200 to each crew member with exact 100% reconciliation.',
  },
  {
    slug: 'equal-25-percent',
    path: '/gta-6/heist-split/equal-25-percent',
    title: 'GTA 6 Equal 25% 4-Way Heist Split Math — Unpause',
    description:
      'Run a fair 25/25/25/25 equal 4-way heist payout split after NPC fees, compare greed ratings, and copy your clean squad summary to Discord in one tap.',
    h1: 'Equal 25/25/25/25 Four-Player Heist Payout Calculator',
    preset: { subTab: 'heist', gross: 2450000, fee: 12, cuts: [25, 25, 25, 25] },
    answer:
      'Splitting a $2,156,000 net heist pool evenly at 25% per player pays $539,000 to every squad member—earning an instant Fair Split rating on your exportable Crew Payout Slip.',
  },
  {
    slug: 'stock-market-planner',
    path: '/gta-6/stock-market-planner',
    title: 'GTA 6 Two-Character Stock Market Planner — Unpause',
    description:
      'Project multi-flip story stock compounding across two protagonists using seed heist capital, peak rebound timings, and zero-ad mobile second-screen presets.',
    h1: 'GTA VI Two-Character Story Stock Compounder (UI Preview)',
    preset: { subTab: 'market', gross: 2450000, fee: 12, cuts: [40, 20, 20, 20] },
    answer:
      'Compounding $1,600,000 seed heist capital across three multi-protagonist contract flips (+68%/+45%, +82%/+52%, +95%/+60%) demonstrates exponential post-heist bankroll scaling once verified contracts release.',
  },
];

const NIGHT_RUN_SPECS = [
  {
    path: '/gta-6/night-run/45-minute-route',
    title: 'GTA 6 45-Minute Express Weeknight Route — Unpause',
    description:
      'Play a focused 45-minute weeknight GTA 6 loop with display setup, early Port Gellhorn safe pickup, safehouse coupe save, and zero story spoilers.',
    h1: '45-Minute Express Weeknight Session Route (Free)',
    preset: { mins: 45 },
    answer:
      'The free 45-minute Express route sequences four time-boxed stops (8m display/audio setup, 12m pawn safe + suppressor pickup, 15m strip coupe bank, 10m clean save) for busy weeknight players.',
  },
  {
    path: '/gta-6/night-run/90-minute-route',
    title: 'GTA 6 90-Minute Standard Night Run Route — Unpause',
    description:
      'Chain five Leonida waypoints across Port Gellhorn, Vice Beach, Grassrivers, and Leonida Keys inside a clean 90-minute evening session with cloud sync.',
    h1: '90-Minute Standard Weeknight Circuit & Sector Map',
    preset: { mins: 90 },
    answer:
      'The 90-minute circuit links 5 sector stops across Port Gellhorn (28m), Vice Beach (22m), Grassrivers (25m), and Leonida Keys (15m) with zero backtracking and clear save-slot checkpoints.',
  },
  {
    path: '/gta-6/missables-shield',
    title: 'GTA 6 Spoiler-Free Missables Lockout Shield — Unpause',
    description:
      'Protect unique cars, safehouse garages, and dual-protagonist contract flips before crossing Act I–III mission gates without spoiling story plot twists.',
    h1: 'Spoiler-Free Missables Shield (Act I–III Checkpoints)',
    preset: { mins: 45 },
    answer:
      'The Missables Shield alerts you right before point-of-no-return gates across Port Gellhorn, Vice Beach burner contracts, and Keys marina staging—protecting 9 at-risk pickups with zero plot spoilers.',
  },
];

const EA_TAX_BREAKPOINTS = [
  { slug: '10k-coins', buy: 9000, sell: 10000, label: '10,000 Coin' },
  { slug: '25k-coins', buy: 22500, sell: 25000, label: '25,000 Coin' },
  { slug: '50k-coins', buy: 46000, sell: 50000, label: '50,000 Coin' },
  { slug: '100k-coins', buy: 92000, sell: 100000, label: '100,000 Coin' },
  { slug: '250k-coins', buy: 225000, sell: 250000, label: '250,000 Coin' },
  { slug: '500k-coins', buy: 450000, sell: 500000, label: '500,000 Coin' },
  { slug: '1-million-coins', buy: 900000, sell: 1000000, label: '1,000,000 Coin' },
];

const ROBLOX_MILESTONES = [
  { slug: '30000-robux-to-usd', robux: 30000, label: '30,000 R$' },
  { slug: '50000-robux-to-usd', robux: 50000, label: '50,000 R$' },
  { slug: '100000-robux-to-usd', robux: 100000, label: '100,000 R$' },
  { slug: '250000-robux-to-usd', robux: 250000, label: '250,000 R$' },
  { slug: '500000-robux-to-usd', robux: 500000, label: '500,000 R$' },
  { slug: '1000000-robux-to-usd', robux: 1000000, label: '1,000,000 R$' },
];

function buildProgrammaticRoutes() {
  const pages = [];

  // 1. GTA VI Consoles (8) + Unlock Guides (2) = 10
  for (const spec of CONSOLE_SEO_SPECS) {
    const consoleObj = gta6Pack.consoles.find((c) => c.id === spec.consoleId) || gta6Pack.consoles[0];
    pages.push({
      path: `/gta-6/storage/${spec.slug}`,
      gameId: 'gta-6',
      tab: 'storage',
      cluster: 'GTA VI Preload & Storage',
      shortLabel: spec.shortLabel,
      priority: '0.88',
      changefreq: 'daily',
      title: clampTitle(spec.title),
      description: clampDesc(spec.description),
      h1: spec.h1,
      answerSummary: spec.answer,
      ogImage: '/og/gta-6-storage.png',
      ogAlt: `Unpause GTA VI storage fit calculator for ${consoleObj.name}`,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'GTA VI Storage', path: '/gta-6/storage' },
        { name: spec.shortLabel, path: `/gta-6/storage/${spec.slug}` },
      ],
      preset: {
        consoleId: spec.consoleId,
        freeGb: spec.freeGb,
        includePatch: spec.includePatch,
        mbps: 120,
      },
      metaRows: [
        { label: 'Usable Internal Capacity', val: `${consoleObj.usableGb} GB` },
        { label: 'Estimated GTA VI Install', val: `${consoleObj.installGb} GB${spec.includePatch ? ' (+35 GB patch)' : ''}` },
        { label: 'New Zealand Rollout Rule', val: consoleObj.nzStatusShort },
      ],
      faqs: spec.faqs || getGameFaqs('gta-6'),
    });
  }

  for (const spec of UNLOCK_SEO_SPECS) {
    const consoleObj = gta6Pack.consoles.find((c) => c.id === spec.consoleId) || gta6Pack.consoles[0];
    pages.push({
      path: spec.path,
      gameId: 'gta-6',
      tab: 'storage',
      cluster: 'GTA VI Preload & Storage',
      shortLabel: spec.consoleId.startsWith('xs') ? 'NZ Trick Xbox vs PS5' : 'PS5 Region Lock',
      priority: '0.88',
      changefreq: 'daily',
      title: clampTitle(spec.title),
      description: clampDesc(spec.description),
      h1: spec.h1,
      answerSummary: spec.answer,
      ogImage: '/og/gta-6-storage.png',
      ogAlt: 'Unpause GTA VI New Zealand midnight unlock checker for Xbox and PS5',
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'GTA VI Storage', path: '/gta-6/storage' },
        { name: spec.h1, path: spec.path },
      ],
      preset: { consoleId: spec.consoleId, freeGb: 180, includePatch: false, mbps: 120 },
      metaRows: [
        { label: 'Earliest Rolling Unlock (NZ)', val: 'Nov 18, 2026 @ 11:00 UTC' },
        { label: 'Selected Console Rule', val: `${consoleObj.name}: ${consoleObj.nzStatusShort}` },
      ],
      faqs: getGameFaqs('gta-6'),
    });
  }

  // 2. GTA VI Download Times (10)
  for (const spd of DOWNLOAD_SPEED_SPECS) {
    const ps5Mins = (212 * 8000) / (Math.max(10, spd.mbps * 0.9) * 60);
    const xboxMins = (225 * 8000) / (Math.max(10, spd.mbps * 0.9) * 60);
    const ps5Eta = formatEta(ps5Mins);
    const xboxEta = formatEta(xboxMins);
    const cleanSpeed = spd.mbps === 1000 ? '1000 Mbps Gigabit' : `${spd.mbps} Mbps`;
    pages.push({
      path: `/gta-6/download-time/${spd.slug}`,
      gameId: 'gta-6',
      tab: 'storage',
      cluster: 'GTA VI Download Speeds',
      shortLabel: `${spd.mbps} Mbps ETA (${ps5Eta})`,
      priority: '0.82',
      changefreq: 'weekly',
      title: clampTitle(`GTA 6 Download Time on ${cleanSpeed} (${ps5Eta}) — Unpause`),
      description: clampDesc(
        `How long is a 212–225 GB GTA 6 preload on ${spd.label}? ${ps5Eta} on PS5 and ${xboxEta} on Xbox Series X|S with 10% protocol overhead. Adjust speed & patch live.`
      ),
      h1: `GTA VI Download Time on ${spd.label}: ${ps5Eta} (PS5) / ${xboxEta} (Xbox)`,
      answerSummary: `At ${spd.mbps} Mbps (accounting for realistic 90% sustained CDN throughput), downloading an estimated 212 GB PS5 preload takes ${ps5Eta}, while a 225 GB Xbox Series X|S download finishes in ${xboxEta}.`,
      ogImage: '/og/gta-6-storage.png',
      ogAlt: `GTA VI download duration at ${spd.mbps} Mbps on Unpause`,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'GTA VI Storage', path: '/gta-6/storage' },
        { name: `${spd.mbps} Mbps ETA`, path: `/gta-6/download-time/${spd.slug}` },
      ],
      preset: { consoleId: 'ps5-base', freeGb: 250, includePatch: false, mbps: spd.mbps },
      metaRows: [
        { label: `PS5 (212 GB) @ ${spd.mbps} Mbps`, val: `${ps5Eta} (with 10% overhead)` },
        { label: `Xbox Series (225 GB) @ ${spd.mbps} Mbps`, val: `${xboxEta} (with 10% overhead)` },
        { label: 'With +35 GB Day-1 Patch', val: formatEta((247 * 8000) / (Math.max(10, spd.mbps * 0.9) * 60)) },
      ],
      faqs: getGameFaqs('gta-6'),
    });
  }

  // 3. GTA VI Districts, Heists & Night Routes (14)
  for (const dist of DISTRICT_SPECS) {
    const safeSample = gta6Pack.safes.find((s) => s.district === dist.district);
    pages.push({
      path: `/gta-6/safe-codes/${dist.slug}`,
      gameId: 'gta-6',
      tab: 'safes',
      cluster: 'GTA VI Safe Vault & Heists',
      shortLabel: `${dist.district} Safes`,
      priority: '0.84',
      changefreq: 'daily',
      title: clampTitle(`GTA 6 ${dist.district} Safe Codes & Clues — Unpause`),
      description: clampDesc(
        `Search ${dist.district} GTA 6 safe combinations, play 10-key audio beeps, copy 4-digit codes in one tap, and track cracked doors locally (pre-launch UI preview until Nov 18).`
      ),
      h1: `GTA VI ${dist.district} Safe & Keypad Vault`,
      answerSummary: safeSample
        ? `${dist.district} entries include ${safeSample.title} (pre-launch UI demo code ${safeSample.code}; hint: ${safeSample.clueLocation}). Verified launch combinations update live starting Nov 18 at 11:00 UTC.`
        : `Instant ${dist.district} safe and door keypad filter with WebAudio playback and 1-tap clipboard copy.`,
      ogImage: '/og/gta-6-safes.png',
      ogAlt: `Unpause GTA VI ${dist.district} safe code vault`,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'Safe Keypads', path: '/gta-6/safe-codes' },
        { name: dist.district, path: `/gta-6/safe-codes/${dist.slug}` },
      ],
      preset: { district: dist.district, query: '', safeId: safeSample?.id || '' },
      metaRows: safeSample
        ? [
            { label: 'Featured Safe Preview', val: `${safeSample.title} (${safeSample.district})` },
            { label: 'Reward Preview', val: safeSample.reward },
            { label: 'Launch Sync Status', val: safeSample.verifiedStatus },
          ]
        : [],
      faqs: getGameFaqs('gta-6'),
    });
  }

  for (const hs of HEIST_SPLIT_SPECS) {
    pages.push({
      path: hs.path,
      gameId: 'gta-6',
      tab: 'squad',
      cluster: 'GTA VI Safe Vault & Heists',
      shortLabel: hs.h1.replace('GTA VI ', '').replace(' (UI Preview)', ''),
      priority: '0.82',
      changefreq: 'weekly',
      title: clampTitle(hs.title),
      description: clampDesc(hs.description),
      h1: hs.h1,
      answerSummary: hs.answer,
      ogImage: '/og/gta-6-heist.png',
      ogAlt: hs.h1,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'Squad & Heist Split', path: '/gta-6/heist-split' },
        { name: hs.h1, path: hs.path },
      ],
      preset: hs.preset,
      metaRows: [
        { label: 'Default Vault Take', val: `$${hs.preset.gross.toLocaleString('en-US')}` },
        { label: 'NPC Support Deduction', val: `${hs.preset.fee}%` },
        { label: 'Squad Share Split', val: hs.preset.cuts.map((c) => `${c}%`).join(' / ') },
      ],
      faqs: getGameFaqs('gta-6'),
    });
  }

  for (const nr of NIGHT_RUN_SPECS) {
    pages.push({
      path: nr.path,
      gameId: 'gta-6',
      tab: 'nightrun',
      cluster: 'GTA VI Safe Vault & Heists',
      shortLabel: nr.h1.split('(')[0].trim(),
      priority: '0.82',
      changefreq: 'weekly',
      title: clampTitle(nr.title),
      description: clampDesc(nr.description),
      h1: nr.h1,
      answerSummary: nr.answer,
      ogImage: '/og/gta-6-nightrun.png',
      ogAlt: nr.h1,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'Weeknight Routes', path: '/gta-6/night-run' },
        { name: nr.h1, path: nr.path },
      ],
      preset: nr.preset,
      metaRows: [
        { label: 'Free Express Track', val: '45 Minutes · 4 Zero-Spoiler Stops' },
        { label: 'Acts Protected', val: 'Act I Port Gellhorn · Act II Contracts · Act III Finale' },
      ],
      faqs: getGameFaqs('gta-6'),
    });
  }

  // 4. CoD Warzone Weapons & Matchups (16)
  const weaponSlugMap = {
    'c9-smg': 'c9-smg',
    'xm4-ar': 'xm4',
    'm4-classic': 'm4',
    'ak74-heavy': 'ak-74',
    'gpr91-ar': 'gpr-91',
    'jackal-pdw': 'jackal-pdw',
    'lachmann-sub': 'lachmann-sub',
    'ppsh-41': 'ppsh-41-open-bolt',
    'krig-c': 'krig-c',
    'raal-mg': 'raal-mg-open-bolt',
    'dm-10': 'dm-10',
  };
  for (const w of COD_MW4_WEAPONS) {
    const slug = weaponSlugMap[w.id] || w.id;
    const res300 = calcCodTtk({
      hp: 300,
      damage: w.damage,
      rpm: w.rpm,
      headshots: 1,
      headMult: w.headMult,
      openBoltMs: w.openBoltMs,
    });
    const res100 = calcCodTtk({
      hp: 100,
      damage: w.damage,
      rpm: w.rpm,
      headshots: 0,
      headMult: w.headMult,
      openBoltMs: w.openBoltMs,
    });
    const opponent = w.category.startsWith('SMG') ? 'c9-smg' : 'xm4-ar';
    const oppId = opponent === w.id ? 'jackal-pdw' : opponent;
    pages.push({
      path: `/cod-warzone/ttk/${slug}`,
      gameId: 'cod-warzone',
      cluster: 'Call of Duty & Warzone',
      shortLabel: `${w.name} TTK (${res300.ttkMs}ms)`,
      priority: '0.84',
      changefreq: 'weekly',
      title: clampTitle(`${w.name} Warzone TTK (${res300.ttkMs} ms @ 300 HP) — Unpause`),
      description: clampDesc(
        `${w.name} hits ${res300.ttkMs} ms 3-plate Warzone TTK (${res300.shotsToKill} shots at ${w.rpm} RPM${w.openBoltMs ? `, +${w.openBoltMs}ms bolt delay` : ''}). Compare head-to-head loadouts free.`
      ),
      h1: `${w.name} 300 HP Warzone & 100 HP Multiplayer TTK`,
      answerSummary: `At 300 HP with 1 headshot (${w.headMult}x multiplier), ${w.name} (${w.damage} DMG, ${w.rpm} RPM${w.openBoltMs ? `, +${w.openBoltMs} ms open-bolt delay` : ''}) kills in ${res300.shotsToKill} shots (${res300.ttkMs} ms TTK, ${res300.dps} DPS). In 100 HP Multiplayer it takes ${res100.shotsToKill} shots (${res100.ttkMs} ms).`,
      ogImage: '/og/cod-warzone.png',
      ogAlt: `${w.name} Warzone 300 HP TTK chart on Unpause`,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'CoD / Warzone', path: '/cod-warzone' },
        { name: `${w.name} TTK`, path: `/cod-warzone/ttk/${slug}` },
      ],
      preset: { weaponAId: w.id, weaponBId: oppId, codHp: 300, codHeadshots: 1, codOpenBolt: true },
      metaRows: [
        { label: '300 HP (3-Plate, 1 HS)', val: `${res300.ttkMs} ms · ${res300.shotsToKill} shots` },
        { label: '100 HP Multiplayer (Body)', val: `${res100.ttkMs} ms · ${res100.shotsToKill} shots` },
        { label: 'Fire Rate & Open-Bolt', val: `${w.rpm} RPM · +${w.openBoltMs} ms trigger delay` },
      ],
      faqs: getGameFaqs('cod-warzone'),
    });
  }

  const extraCodSpecs = [
    {
      path: '/cod-warzone/ttk/c9-vs-jackal-pdw',
      shortLabel: 'C9 vs Jackal PDW',
      title: 'C9 vs Jackal PDW Warzone TTK Compare — Unpause',
      h1: 'C9 SMG vs Jackal PDW: 300 HP Close-Range TTK Comparison',
      preset: { weaponAId: 'c9-smg', weaponBId: 'jackal-pdw', codHp: 300, codHeadshots: 1, codOpenBolt: true },
      description:
        'Compare C9 (36 DMG / 882 RPM) against Jackal PDW (35 DMG / 857 RPM) at 300 HP Warzone 3-plate armor with mixed headshots and open-bolt timing live.',
      answer:
        'At 300 HP with 1 headshot, the C9 SMG (36 DMG, 882 RPM) downs in 9 shots (544 ms), edging out the Jackal PDW (35 DMG, 857 RPM) at 9 shots (560 ms) within close-range dropoff.',
    },
    {
      path: '/cod-warzone/ttk/xm4-vs-krig-c',
      shortLabel: 'XM4 vs Krig C',
      title: 'XM4 vs Krig C Warzone AR TTK Compare — Unpause',
      h1: 'XM4 vs Krig C: 300 HP Mid-to-Long Range AR TTK',
      preset: { weaponAId: 'xm4-ar', weaponBId: 'krig-c', codHp: 300, codHeadshots: 1, codOpenBolt: true },
      description:
        'Compare XM4 (769 RPM / 34 DMG) vs Krig C (632 RPM / 39 DMG) at 300 HP Warzone armor. Adjust headshots, chest plates, and 250/200/100 HP modes free.',
      answer:
        'Both XM4 and Krig C stay within milliseconds across 300 HP armored engagements: Krig C delivers higher damage per bullet (39 DMG / 1.38x head) while XM4 fires 137 RPM faster for forgiving tracking.',
    },
    {
      path: '/cod-warzone/ttk/100-hp-multiplayer',
      shortLabel: '100 HP Multiplayer TTK',
      title: 'CoD 100 HP Multiplayer TTK Calculator — Unpause',
      h1: '100 HP Multiplayer TTK Calculator & Shot Counter',
      preset: { weaponAId: 'xm4-ar', weaponBId: 'c9-smg', codHp: 100, codHeadshots: 1, codOpenBolt: true },
      description:
        'Switch Warzone HP to 100 HP Core Multiplayer to test exact 3–4 shot kills, headshot breakpoints, and open-bolt trigger delays across 11 CoD presets.',
      answer:
        'In 100 HP Core Multiplayer, high-RPM SMGs and ARs kill in 3 to 4 rounds (180–240 ms), making any +42 ms or +50 ms open-bolt trigger delay dramatically more impactful than in Warzone.',
    },
    {
      path: '/cod-warzone/camo-tracker',
      shortLabel: 'Mastery Camo Tracker',
      title: 'CoD Mastery Camo Pace & Weapon Tracker — Unpause',
      h1: '33-Weapon Mastery Camo Pace Calculator',
      preset: { weaponAId: 'c9-smg', weaponBId: 'xm4-ar', codHp: 300, codHeadshots: 1, codOpenBolt: true },
      description:
        'Estimate exact matches and hours remaining to unlock final Mastery Camo across 33 weapons, adjust matches per gun, and pin milestones free with zero ads.',
      answer:
        'Reaching Mastery Camo requires completing 33 qualifying weapons. Tracking 6 matches per gun cuts remaining grind into clear daily batches while DLC additions let you skip difficult categories.',
    },
    {
      path: '/cod-warzone/33-weapons-mastery-skip-launchers',
      shortLabel: 'Skip Launchers Guide',
      title: 'Skip Launchers for CoD 33-Weapon Mastery — Unpause',
      h1: 'How DLC Guns Let You Skip Launchers for 33-Weapon Mastery',
      preset: { weaponAId: 'krig-c', weaponBId: 'c9-smg', codHp: 300, codHeadshots: 1, codOpenBolt: true },
      description:
        'Check your remaining weapon count for 33-weapon CoD Mastery Camo when swapping Launchers and Melee for Season 1 DLC rifles and SMGs. Instant free tracker.',
      answer:
        'Mastery unlocks once any 33 weapons clear base Gold/Diamond tiers. Replacing Launchers with Season 1 DLC assault rifles and SMGs preserves full eligibility while cutting camo frustration.',
    },
  ];
  for (const ec of extraCodSpecs) {
    pages.push({
      ...ec,
      gameId: 'cod-warzone',
      cluster: 'Call of Duty & Warzone',
      priority: '0.82',
      changefreq: 'weekly',
      title: clampTitle(ec.title),
      description: clampDesc(ec.description),
      answerSummary: ec.answer,
      ogImage: '/og/cod-warzone.png',
      ogAlt: ec.h1,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'CoD / Warzone', path: '/cod-warzone' },
        { name: ec.shortLabel, path: ec.path },
      ],
      metaRows: getGameMetaRows('cod-warzone'),
      faqs: getGameFaqs('cod-warzone'),
    });
  }

  // 5. EA FC 27 Tax Breakpoints (7) + SBC 82..90 Solvers (9) = 16
  for (const bp of EA_TAX_BREAKPOINTS) {
    const res = calcFc27Tax({ buyCoins: bp.buy, sellCoins: bp.sell, quantity: 1 });
    pages.push({
      path: `/ea-fc-27/tax/${bp.slug}`,
      gameId: 'ea-fc-27',
      cluster: 'EA Sports FC 27',
      shortLabel: `${bp.label} Tax & Profit`,
      priority: '0.83',
      changefreq: 'weekly',
      title: clampTitle(`EA FC 27 ${bp.label} Tax & Break-Even — Unpause`),
      description: clampDesc(
        `Selling a ${bp.label} card in EA FC 27 deducts ${res.taxPerCard.toLocaleString('en-US')} coins (5% tax). Test ${bp.buy.toLocaleString('en-US')} buy break-even steps & bulk flips.`
      ),
      h1: `EA Sports FC 27 ${bp.label} Transfer Tax & Snipe Calculator`,
      answerSummary: `Selling at ${bp.sell.toLocaleString('en-US')} coins incurs a 5% EA transfer tax of ${res.taxPerCard.toLocaleString('en-US')} coins (${res.netPerCard.toLocaleString('en-US')} net). Buying at ${bp.buy.toLocaleString('en-US')} requires listing at ${res.minBreakEvenSnapped.toLocaleString('en-US')}+ coins (legal market step) just to break even.`,
      ogImage: '/og/ea-fc-27.png',
      ogAlt: `EA FC 27 ${bp.label} 5% tax calculator on Unpause`,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'EA Sports FC 27', path: '/ea-fc-27' },
        { name: `${bp.label} Tax`, path: `/ea-fc-27/tax/${bp.slug}` },
      ],
      preset: { buyPrice: bp.buy, sellPrice: bp.sell, quantity: 1 },
      metaRows: [
        { label: '5% EA Transfer Tax', val: `-${res.taxPerCard.toLocaleString('en-US')} Coins` },
        { label: 'Net Coins Received', val: `${res.netPerCard.toLocaleString('en-US')} Coins` },
        { label: `Break-Even Sell (from ${bp.buy.toLocaleString('en-US')})`, val: `${res.minBreakEvenSnapped.toLocaleString('en-US')} Coins` },
      ],
      faqs: getGameFaqs('ea-fc-27'),
    });
  }

  for (let ovr = 82; ovr <= 90; ovr += 1) {
    const squad = [ovr + 1, ovr + 1, ovr, ovr, ovr, ovr - 1, ovr - 1, ovr - 1, ovr - 1, ovr - 1, ovr - 1];
    pages.push({
      path: `/ea-fc-27/sbc/${ovr}-rated-squad`,
      gameId: 'ea-fc-27',
      cluster: 'EA Sports FC 27',
      shortLabel: `${ovr}-Rated SBC Combo`,
      priority: '0.84',
      changefreq: 'weekly',
      title: clampTitle(`EA FC 27 ${ovr}-Rated SBC Formula & Solver — Unpause`),
      description: clampDesc(
        `Build the cheapest ${ovr}-rated SBC squad in EA FC 27 using exact 11-player excess-rating math (e.g. 2x${ovr + 1} + 3x${ovr} + 6x${ovr - 1}). Test your fodder free.`
      ),
      h1: `EA FC 27 ${ovr}-Rated Squad SBC Solver & Fodder Matrix`,
      answerSummary: `Using Ultimate Team's 11-player excess rating formula, a reliable cheap template for an ${ovr}-rated SBC combines 2× ${ovr + 1} OVR, 3× ${ovr} OVR, and 6× ${ovr - 1} OVR (or 9× ${ovr} + 2× ${ovr - 1}). Preloaded into the 11-slot solver below.`,
      ogImage: '/og/ea-fc-27.png',
      ogAlt: `EA FC 27 ${ovr}-rated SBC calculator on Unpause`,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'EA Sports FC 27', path: '/ea-fc-27' },
        { name: `${ovr} SBC Solver`, path: `/ea-fc-27/sbc/${ovr}-rated-squad` },
      ],
      preset: { sbcRatings: squad, buyPrice: 12000, sellPrice: 15000 },
      metaRows: [
        { label: `Proven ${ovr} OVR Combo A`, val: `9 × ${ovr} OVR + 2 × ${ovr - 1} OVR` },
        { label: `Proven ${ovr} OVR Combo B`, val: `2 × ${ovr + 1} + 3 × ${ovr} + 6 × ${ovr - 1} OVR` },
      ],
      faqs: getGameFaqs('ea-fc-27'),
    });
  }

  // 6. Minecraft Portals & Strongholds (10)
  const mcSpecs = [
    {
      slug: 'nether-portal-calculator',
      shortLabel: '8:1 Portal Calculator',
      title: 'Minecraft Nether Portal 8:1 Calculator — Unpause',
      h1: 'Minecraft Nether Portal 8:1 Coordinate Converter (Java & Bedrock)',
      preset: { mcDir: 'toNether', netherX: -20, netherY: 64, netherZ: 1023 },
      description:
        'Convert Overworld and Nether portal coordinates using exact Minecraft Math.floor rules, check chunk/region files, and verify 3D collision clearance instantly.',
      answer:
        'Overworld X and Z divide by 8 using integer Math.floor (never standard rounding), while Y altitude matches 1:1. For example, Overworld (-20, 64, 1023) maps to Nether (-3, 64, 127) inside region r.-1.1.mca.',
    },
    {
      slug: 'negative-coordinates-floor-math',
      shortLabel: 'Negative Coord Math',
      title: 'Minecraft Negative Coordinate Portal Fix — Unpause',
      h1: 'Why Negative Overworld Coordinates Break Rounding (Math.floor Guide)',
      preset: { mcDir: 'toNether', netherX: -20, netherY: 64, netherZ: -100 },
      description:
        'Stop mislinking negative-X/Z Nether portals: Minecraft rounds toward negative infinity (-20 / 8 = -3, not -2). Verify exact portal & chunk coords free.',
      answer:
        'Standard rounding turns -20 / 8 = -2.5 into -2, shifting your Nether portal by 8 Overworld blocks. Minecraft actually applies floor(-20 / 8) = -3 and floor(-100 / 8) = -13.',
    },
    {
      slug: 'portal-linking-128-block-radius',
      shortLabel: '128-Block Radius Check',
      title: 'Minecraft 128-Block Portal Collision Check — Unpause',
      h1: 'Two-Portal 3D Collision & 128-Block Search Radius Tester',
      preset: { mcDir: 'toNether', netherX: 0, netherY: 64, netherZ: 960 },
      description:
        'Test whether two nearby Overworld portals hijack each other inside Minecraft’s 128-block Overworld / 16-block Nether search radius before lighting obsidian.',
      answer:
        'Portals exiting the Nether search 128 Overworld blocks horizontally (16 in Nether). If two bases sit within 128 X/Z blocks of each other, you must manually build both Nether frames at their exact floor(X/8), Y, floor(Z/8) coords.',
    },
    {
      slug: 'bedrock-vs-java-nether-portals',
      shortLabel: 'Java vs Bedrock Parity',
      title: 'Minecraft Java vs Bedrock Portal Linking — Unpause',
      h1: 'Java vs Bedrock Nether Portal Search Radius & Y-Level Parity',
      preset: { mcDir: 'toNether', netherX: 400, netherY: 72, netherZ: -240 },
      description:
        'Compare Java 1.21+ and Bedrock Nether portal linking rules: exact 8:1 X/Z floor division, 128-block search differences, and Y-axis nearest 3D Euclidean tiebreakers.',
      answer:
        'Both Java and Bedrock share exact 8:1 floor division on X and Z and match Y closest in 3D Euclidean distance—meaning mismatched Y heights (e.g. Overworld Y=64 vs Nether Roof Y=120) cause unintended portal hijacks.',
    },
    {
      slug: 'nether-roof-y128-highway',
      shortLabel: 'Nether Roof Highway (Y=128)',
      title: 'Minecraft Nether Roof Y=128 Highway Linker — Unpause',
      h1: 'Nether Roof Ice Highway & Safe Y-Altitude Portal Linker',
      preset: { mcDir: 'toNether', netherX: 2400, netherY: 128, netherZ: -1600 },
      description:
        'Calculate exact X/Z coordinates for Y=128 Java Nether roof ice highways, verify 1:8 Overworld distance savings, and avoid bedrock ceiling desyncs immediately.',
      answer:
        'Linking a Nether roof portal at Y=128 requires matching 3D Euclidean proximity so Overworld bases stay isolated (>128 blocks apart), turning a 2,400-block Overworld run into a 300-block Nether ice-boat sprint.',
    },
    {
      slug: 'stronghold-triangulation-calculator',
      shortLabel: 'Stronghold 2-Throw',
      title: 'Minecraft Stronghold 2-Throw Triangulator — Unpause',
      h1: '2-Throw Eye of Ender Stronghold Triangulation Calculator',
      preset: { mcDir: 'toNether', netherX: 0, netherY: 64, netherZ: 0 },
      description:
        'Find your End Portal Stronghold using just two Eye of Ender throws: log X/Z coordinates + F3 facing angles and get exact Overworld & Nether tunnel targets.',
      answer:
        'Stand at Throw #1, face the floating Eye of Ender, record F3 X/Z + Yaw angle, walk 200+ blocks perpendicular, repeat Throw #2, and our solver computes exact intersection X/Z plus 1/8 Nether tunnel coordinates.',
    },
    {
      slug: 'chunk-border-mca-region-finder',
      shortLabel: 'Chunk & .mca Finder',
      title: 'Minecraft Chunk & .mca Region File Finder — Unpause',
      h1: 'Minecraft Chunk Coordinates & .mca Anvil Region File Calculator',
      preset: { mcDir: 'toNether', netherX: 512, netherY: 64, netherZ: -512 },
      description:
        'Convert any Minecraft X/Z block coordinate into chunk indexes, intra-chunk offsets (0–15), and exact r.X.Z.mca region filenames for server pruning & slime farms.',
      answer:
        'Every 16×16 chunk divides block X/Z by 16 with floor(), and 32×32 chunks form one .mca region file (e.g. X=512, Z=-512 sits inside chunk 32,-32 in region file r.1.-1.mca).',
    },
    {
      slug: '2-throw-eye-of-ender',
      shortLabel: 'Eye of Ender Math',
      title: 'Find End Portal With 2 Eyes of Ender — Unpause',
      h1: 'Speedrunner 2-Throw Eye of Ender Intersection Solver',
      preset: { mcDir: 'toNether', netherX: 120, netherY: 64, netherZ: -320 },
      description:
        'Save Eyes of Ender and travel 8x faster via the Nether: enter two throw coordinates and angles to calculate the Stronghold’s exact Nether tunnel drop.',
      answer:
        'By taking two angled Eye readings separated by ~200 blocks, trigonometric line intersection pinpoints the Stronghold staircase within a few blocks and outputs the exact 1:8 Nether dig coordinate.',
    },
    {
      slug: 'obsidian-portal-size-calculator',
      shortLabel: 'Obsidian Portal Count',
      title: 'Minecraft Nether Portal Obsidian Calculator — Unpause',
      h1: 'Minimum Obsidian Needed for Linked Nether Highway Portals',
      preset: { mcDir: 'toNether', netherX: 800, netherY: 64, netherZ: 800 },
      description:
        'Plan exact obsidian counts (10 minimum without corners or 14 full frame) alongside linked Overworld/Nether coordinate pairs in one clean zero-ad Minecraft deck.',
      answer:
        'A standard 4×5 Nether portal requires 10 obsidian blocks without corners (or 14 with corners), meaning 20 obsidian plus a Flint & Steel builds and links both the Overworld and Nether sides cleanly.',
    },
    {
      slug: 'overworld-to-nether-converter',
      shortLabel: 'Nether → Overworld (x8)',
      title: 'Nether to Overworld x8 Portal Converter — Unpause',
      h1: 'Nether to Overworld (×8) Reverse Coordinate Converter',
      preset: { mcDir: 'toOverworld', netherX: -3, netherY: 64, netherZ: 127 },
      description:
        'Built a portal inside the Nether first? Multiply Nether X/Z by 8 cleanly to calculate your exact Overworld emergence block and chunk coordinates in seconds.',
      answer:
        'Multiplying Nether (-3, 64, 127) by 8 places your target Overworld portal frame at (-24, 64, 1016)—helping you emerge cleanly at mountain bases or ocean monuments without underground cave spawns.',
    },
  ];
  for (const ms of mcSpecs) {
    const c = calcNetherCoords(ms.preset.netherX, ms.preset.netherY, ms.preset.netherZ, ms.preset.mcDir);
    pages.push({
      path: `/minecraft/${ms.slug}`,
      gameId: 'minecraft',
      cluster: 'Minecraft & Sandbox',
      shortLabel: ms.shortLabel,
      priority: '0.84',
      changefreq: 'weekly',
      title: clampTitle(ms.title),
      description: clampDesc(ms.description),
      h1: ms.h1,
      answerSummary: ms.answer,
      ogImage: '/og/minecraft.png',
      ogAlt: ms.h1,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'Minecraft', path: '/minecraft' },
        { name: ms.shortLabel, path: `/minecraft/${ms.slug}` },
      ],
      preset: ms.preset,
      metaRows: [
        { label: 'Sample Result (X / Y / Z)', val: `${c.output.x} / ${c.output.y} / ${c.output.z}` },
        { label: 'Region & Chunk', val: `Chunk ${c.chunk.cx}, ${c.chunk.cz} · r.${c.chunk.rx}.${c.chunk.rz}.mca` },
      ],
      faqs: getGameFaqs('minecraft'),
    });
  }

  // 7. Roblox DevEx & Marketplace (10)
  for (const rm of ROBLOX_MILESTONES) {
    const std = calcRobloxDevEx({ grossRobux: rm.robux, rateId: 'std-2025', groupSplitPct: 100 });
    const usdStr = (rm.robux * 0.0038).toFixed(2);
    const directStr = (rm.robux * 0.0054).toFixed(2);
    pages.push({
      path: `/roblox/devex/${rm.slug}`,
      gameId: 'roblox',
      cluster: 'Roblox DevEx & Creator',
      shortLabel: `${rm.label} → $${usdStr}`,
      priority: '0.84',
      changefreq: 'weekly',
      title: clampTitle(`${rm.label} to USD DevEx Payout ($${usdStr}) — Unpause`),
      description: clampDesc(
        `Convert ${rm.label} earned Robux to USD: $${usdStr} at $0.0038/R$ standard or $${directStr} US 18+ Direct Store. Includes 30% marketplace cut & 30K minimum guard.`
      ),
      h1: `How Much Is ${rm.label} in USD? ($${usdStr} DevEx Breakdown)`,
      answerSummary: `${rm.robux.toLocaleString('en-US')} earned DevEx Robux pays $${usdStr} USD at the standard $0.0038/R$ rate ($${(rm.robux * 0.0035).toFixed(2)} legacy, or $${directStr} US 18+ Direct Store). After Roblox's 30% Marketplace fee, net take from ${rm.label} gross sales is ${std.afterMarketFee.toLocaleString('en-US')} R$.`,
      ogImage: '/og/roblox.png',
      ogAlt: `Roblox ${rm.label} to USD DevEx calculator on Unpause`,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'Roblox DevEx', path: '/roblox' },
        { name: `${rm.label} to USD`, path: `/roblox/devex/${rm.slug}` },
      ],
      preset: { robux: rm.robux, devexRate: 'std-2025', groupSplit: 100 },
      metaRows: [
        { label: 'Earned Balance Cashout ($0.0038/R$)', val: `$${usdStr} USD` },
        { label: 'US 18+ Direct Store ($0.0054/R$)', val: `$${directStr} USD` },
        { label: 'Gross Sales After 30% Tax', val: `$${std.usdPayout.toFixed(2)} USD (${std.afterMarketFee.toLocaleString('en-US')} R$)` },
      ],
      faqs: getGameFaqs('roblox'),
    });
  }

  const robloxExtra = [
    {
      path: '/roblox/30-percent-marketplace-tax-calculator',
      shortLabel: '30% Marketplace Cut',
      title: 'Roblox 30% Marketplace Tax Calculator — Unpause',
      h1: 'Roblox 30% Marketplace Fee & Group Payout Splitter',
      preset: { robux: 100000, devexRate: 'std-2025', groupSplit: 100 },
      description:
        'See exact Robux kept after Roblox’s 30% Marketplace fee, split revenue by group percentage, and calculate Gamepass listing prices needed for your USD goal.',
      answer:
        'Roblox retains a 30% Marketplace fee on standard Gamepass and UGC sales, leaving 70% (700 R$ per 1,000 R$ gross) before any group payout split and subsequent DevEx cashout.',
    },
    {
      path: '/roblox/gamepass-price-calculator',
      shortLabel: 'Gamepass Reverse Price',
      title: 'Roblox Gamepass Price After 30% Tax — Unpause',
      h1: 'Reverse Roblox Gamepass Price Calculator (Net → List Price)',
      preset: { robux: 42858, devexRate: 'std-2025', desiredNet: 30000 },
      description:
        'Enter the exact net Robux you want to keep (e.g. 30,000 R$ DevEx minimum) and calculate the required Gamepass price including Roblox’s 30% cut automatically.',
      answer:
        'To receive an exact net amount after the 30% marketplace cut, divide desired net Robux by 0.70 and round up—so hitting the 30,000 R$ DevEx threshold takes 42,858 R$ in gross Gamepass sales.',
    },
    {
      path: '/roblox/devex-new-vs-old-rate',
      shortLabel: '$0.0038 vs $0.0035 Legacy',
      title: 'Roblox DevEx Rate: $0.0038 vs $0.0035 — Unpause',
      h1: 'Roblox DevEx New ($0.0038) vs Legacy ($0.0035) Rate Comparison',
      preset: { robux: 100000, devexRate: 'std-2025', groupSplit: 100 },
      description:
        'Compare the September 2025 $0.0038/R$ DevEx bump against the $0.0035/R$ legacy queue across 30K, 100K, and 1M Robux milestones in one instant browser deck.',
      answer:
        'The updated $0.0038/R$ rate yields $380.00 per 100,000 earned Robux compared to $350.00 under pre-September 2025 legacy balances—an extra $30 per 100K R$ cashed out.',
    },
    {
      path: '/roblox/us-direct-store-bonus-rate',
      shortLabel: 'US 18+ $0.0054 Rate',
      title: 'Roblox US 18+ Direct Store $0.0054 Rate — Unpause',
      h1: 'Roblox US 18+ Direct Store ($0.0054/R$) DevEx Estimator',
      preset: { robux: 100000, devexRate: 'us-direct', groupSplit: 100 },
      description:
        'Calculate Roblox creator payouts at the US 18+ Direct Store $0.0054/R$ tier alongside standard $0.0038 DevEx math and 30% fee calculations instantly.',
      answer:
        'Under the US 18+ Direct Store rate ($0.0054/R$), 100,000 qualifying earned Robux equals $540.00 USD (+42% above standard $0.0038/R$). Toggle between all three rates in one click below.',
    },
  ];
  for (const rx of robloxExtra) {
    pages.push({
      ...rx,
      gameId: 'roblox',
      cluster: 'Roblox DevEx & Creator',
      priority: '0.82',
      changefreq: 'weekly',
      title: clampTitle(rx.title),
      description: clampDesc(rx.description),
      answerSummary: rx.answer,
      ogImage: '/og/roblox.png',
      ogAlt: rx.h1,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: 'Roblox DevEx', path: '/roblox' },
        { name: rx.shortLabel, path: rx.path },
      ],
      metaRows: getGameMetaRows('roblox'),
      faqs: getGameFaqs('roblox'),
    });
  }

  // 8. Fortnite (6), CS2 (6), Valorant (5), Apex (5), GTA Online (6) = 28 routes
  const fn100 = calcFortniteXp({ currentLevel: 30, targetLevel: 100, daysRemaining: 24 });
  const fn200 = calcFortniteXp({ currentLevel: 44, targetLevel: 200, daysRemaining: 28, includeCreative: true });
  const remaining28Specs = [
    // Fortnite (6)
    {
      path: '/fortnite/xp-to-level-100',
      gameId: 'fortnite',
      cluster: 'Fortnite Battle Pass',
      shortLabel: 'XP to Level 100',
      title: 'Fortnite XP to Level 100 Calculator — Unpause',
      description: `Track remaining XP to Tier 100 at 80,000 XP per level (${fn100.xpPerDay.toLocaleString('en-US')} XP/day over 24 days). Combine BR Daily Quests and UEFN Creative free in seconds.`,
      h1: 'Fortnite XP Calculator: Reach Level 100 Battle Pass',
      answer: `Leveling from 30 to 100 requires 5,600,000 XP (70 levels × 80,000 XP). Over 24 days that averages ${fn100.xpPerDay.toLocaleString('en-US')} XP/day—achievable with 3× BR Daily Bonus Quests plus ~3 BR matches daily.`,
      ogImage: '/og/fortnite.png',
      preset: { fnLevel: 30, fnTarget: 100, fnDays: 24, fnCreative: false },
    },
    {
      path: '/fortnite/xp-to-level-140-vbucks',
      gameId: 'fortnite',
      cluster: 'Fortnite Battle Pass',
      shortLabel: 'Level 140 V-Bucks Break-Even',
      title: 'Fortnite Level 140 V-Bucks XP Pace — Unpause',
      description:
        'Hit Fortnite Level 140 to unlock all 1,500 Battle Pass V-Bucks (+500 net profit). Plan your daily Zero Build + Creative XP schedule in seconds, zero popup ads.',
      h1: 'Reach Level 140: Unlock All 1,500 Battle Pass V-Bucks',
      answer:
        'Unlocking the full 1,500 V-Bucks payout (+500 net over the 1,000 Pass cost) wraps around Level 140—requiring 8,800,000 XP from Level 30 at 80,000 XP per tier.',
      ogImage: '/og/fortnite.png',
      preset: { fnLevel: 40, fnTarget: 140, fnDays: 25, fnCreative: true },
    },
    {
      path: '/fortnite/xp-to-level-200-super-styles',
      gameId: 'fortnite',
      cluster: 'Fortnite Battle Pass',
      shortLabel: 'Level 200 Super Styles',
      title: 'Fortnite XP to Level 200 Super Styles — Unpause',
      description: `Plan exact daily matches to hit Fortnite Level 200 Super Styles (${fn200.xpPerDay.toLocaleString('en-US')} XP/day). Balance 60K Daily Quests, UEFN Creative, and LEGO XP modes live.`,
      h1: 'Fortnite Level 200 Super Styles Multi-Mode XP Calculator',
      answer: `Climbing from Level 44 to 200 needs 12,480,000 XP (${fn200.xpPerDay.toLocaleString('en-US')} XP/day over 28 days). Combining 60,000 Daily Quest XP with calibrated UEFN Creative cuts BR grind to ~${fn200.estMatchesPerDay} matches/day.`,
      ogImage: '/og/fortnite.png',
      preset: { fnLevel: 44, fnTarget: 200, fnDays: 28, fnCreative: true },
    },
    {
      path: '/fortnite/uefn-creative-weekly-xp-cap',
      gameId: 'fortnite',
      cluster: 'Fortnite Battle Pass',
      shortLabel: 'UEFN 4M Weekly Cap',
      title: 'Fortnite UEFN Creative Weekly XP Cap — Unpause',
      description:
        'Check Fortnite’s ~4,000,000 weekly UEFN Creative XP cap (~50 Battle Pass levels/week) and combine Creative playtime with Daily Quests cleanly.',
      h1: 'UEFN Creative Weekly XP Cap & Battle Pass Pacing',
      answer:
        'Calibrated UEFN Creative maps share an estimated ~4,000,000 XP weekly ceiling (~50 Battle Pass levels at 80,000 XP each), resetting weekly alongside Battle Royale Milestone quests.',
      ogImage: '/og/fortnite.png',
      preset: { fnLevel: 50, fnTarget: 200, fnDays: 21, fnCreative: true },
    },
    {
      path: '/fortnite/lego-festival-afk-playtime-xp',
      gameId: 'fortnite',
      cluster: 'Fortnite Battle Pass',
      shortLabel: 'LEGO & Festival XP',
      title: 'Fortnite LEGO & Festival XP Calculator — Unpause',
      description:
        'Calculate how LEGO Fortnite & Festival playtime XP (~120K/day passive boost) reduces daily Battle Royale match pressure to reach Level 200 before season end.',
      h1: 'LEGO Fortnite & Festival Playtime XP Schedule',
      answer:
        'LEGO Fortnite and Festival playtime yield ~24,000–30,000 XP per 15 minutes (~120,000 XP/day in casual sessions), lowering required active BR matches when combined with 60K Daily Bonus quests.',
      ogImage: '/og/fortnite.png',
      preset: { fnLevel: 60, fnTarget: 200, fnDays: 21, fnCreative: true, fnLego: true },
    },
    {
      path: '/fortnite/daily-xp-pace-calculator',
      gameId: 'fortnite',
      cluster: 'Fortnite Battle Pass',
      shortLabel: 'Daily XP Pace',
      title: 'Fortnite Daily XP Pace Calculator (80K/Lvl) — Unpause',
      description:
        'Enter your current Fortnite Battle Pass level, goal (100/140/200), and days remaining to compute exact XP/day and matches needed free in browser.',
      h1: 'Daily Fortnite XP Pace & Remaining Matches Calculator',
      answer:
        'Divide remaining tiers × 80,000 XP by days left in the season, subtract 60,000 Daily Bonus XP and UEFN Creative playtime, and see exact Battle Royale matches required nightly.',
      ogImage: '/og/fortnite.png',
      preset: { fnLevel: 75, fnTarget: 150, fnDays: 14, fnCreative: false },
    },

    // CS2 (6)
    {
      path: '/cs2/mr12-loss-bonus-table',
      gameId: 'cs2',
      cluster: 'CS2 MR12 Economy',
      shortLabel: 'MR12 Loss Ladder',
      title: 'CS2 MR12 Loss Bonus Table & Calculator — Unpause',
      description:
        'Simulate exact CS2 MR12 loss bonuses ($1,400 to $3,400), -1 win step-down mechanics, pistol round Level 1 start ($1,900), and next-round eco callouts free.',
      h1: 'CS2 Premier MR12 Loss Bonus Ladder ($1,400–$3,400)',
      answer:
        'CS2 MR12 pays $1,400 (Tier 0), $1,900 (Tier 1 — including Round 1 pistol losses), $2,400 (Tier 2), $2,900 (Tier 3), and $3,400 (Tier 4 cap). Every round win steps the counter down by -1 tier instead of resetting to zero.',
      ogImage: '/og/cs2.png',
      preset: { cs2Side: 'CT', cs2Cash: 3200, cs2Loss: 1, cs2Plant: false },
    },
    {
      path: '/cs2/pistol-round-loss-1900',
      gameId: 'cs2',
      cluster: 'CS2 MR12 Economy',
      shortLabel: 'Pistol Loss ($1,900)',
      title: 'CS2 Pistol Round Loss Bonus ($1,900 Rule) — Unpause',
      h1: 'Why Losing CS2 Pistol Round Starts at Level 1 ($1,900)',
      description:
        'Plan Round 2 CT & T buys after losing pistol in CS2 MR12: pistol losses pay $1,900 (Level 1), plus +$800 per Terrorist player if the C4 bomb was planted.',
      answer:
        'Unlike old CS:GO resets, losing Round 1 pistol in CS2 starts every teammate at Loss Level 1 ($1,900). If Terrorists planted the bomb (+$800 each = $2,700+), a Round 2 Galil/MAC-10 force is viable.',
      ogImage: '/og/cs2.png',
      preset: { cs2Side: 'T', cs2Cash: 1900, cs2Loss: 1, cs2Plant: true },
    },
    {
      path: '/cs2/ct-full-buy-cost-m4-util',
      gameId: 'cs2',
      cluster: 'CS2 MR12 Economy',
      shortLabel: 'CT Full Buy ($5,100+)',
      title: 'CS2 CT Full Buy Cost (M4 + Armor + Kit) — Unpause',
      description:
        'Check exact Counter-Terrorist full-buy ($5,100–$5,500) and core rifle ($4,300) budgets so your CT squad avoids broken round-3 buys in Premier MR12.',
      h1: 'CS2 CT-Side Full Buy Budget (M4A1-S/M4A4 + Armor + Defuse Kit)',
      answer: `At $2,200 cash on Loss Tier 1 ($1,900 guaranteed), safe eco spend is $${calcCs2Economy({ cash: 2200, lossLevel: 1, side: 'CT' }).maxSafeSpendForNextFullBuy}—CT squads need $5,100+ for M4 + Kevlar/Helm + Kit + full utility ($4,300 core rifle buy).`,
      ogImage: '/og/cs2.png',
      preset: { cs2Side: 'CT', cs2Cash: 4300, cs2Loss: 2, cs2Plant: false },
    },
    {
      path: '/cs2/t-side-ak47-bomb-plant-bonus',
      gameId: 'cs2',
      cluster: 'CS2 MR12 Economy',
      shortLabel: 'T-Side +$800 Bomb Plant',
      title: 'CS2 T-Side AK-47 & +$800 Bomb Plant Math — Unpause',
      description:
        'Factor the +$800 Terrorist bomb-plant bonus into CS2 MR12 loss streaks to see exact AK-47 ($2,700) + Head Armor ($1,000) + Utility ($1,000) next-round floors.',
      h1: 'CS2 T-Side Full Buy ($4,700) & +$800 Bomb Plant Bonus',
      answer:
        'Terrorist full buys cost $4,700 (AK-47 $2,700 + Kevlar/Helm $1,000 + Nades $1,000), $400 cheaper than CT. Landing a bomb plant adds +$800 to every surviving or dead T teammate next round.',
      ogImage: '/og/cs2.png',
      preset: { cs2Side: 'T', cs2Cash: 2100, cs2Loss: 1, cs2Plant: true },
    },
    {
      path: '/cs2/force-buy-vs-eco-calculator',
      gameId: 'cs2',
      cluster: 'CS2 MR12 Economy',
      shortLabel: 'Force vs Hard Save',
      title: 'CS2 Force Buy vs Hard Eco Callout Tool — Unpause',
      description:
        'Stop guessing whether to buy Deagle/MP9 or full-eco in CS2 MR12: calculate exact max safe spend before dropping below next round’s full-buy threshold.',
      h1: 'CS2 Max Safe Force Spend & Hard Save Callout Calculator',
      answer:
        'Subtract your team’s full-buy target ($5,100 CT / $4,700 T) from Current Cash + Guaranteed Next Loss Bonus to reveal the exact dollar amount you can safely spend on an eco/upgrade without ruining next round.',
      ogImage: '/og/cs2.png',
      preset: { cs2Side: 'CT', cs2Cash: 3100, cs2Loss: 2, cs2Plant: false },
    },
    {
      path: '/cs2/5-player-team-drop-calculator',
      gameId: 'cs2',
      cluster: 'CS2 MR12 Economy',
      shortLabel: '5-Player Drop Bank',
      title: 'CS2 5-Player Team Bank & Rifle Drop Tool — Unpause',
      description:
        'Log all 5 teammates’ cash in CS2 MR12 to see squad average, how many players hit rifle + armor, and how many spare AK/M4 drops rich teammates can fund.',
      h1: 'CS2 5-Player Squad Economy & Rifle Drop Estimator',
      answer:
        'Log all five players in the 5-Player Squad Bank to immediately see how many teammates hit core rifle buy ($4,300 CT / $3,700 T) and how many extra drops surplus cash covers.',
      ogImage: '/og/cs2.png',
      preset: { cs2Side: 'CT', cs2Cash: 5600, cs2Loss: 1, cs2Plant: false },
    },

    // Valorant (5)
    {
      path: '/valorant/round-buy-economy-calculator',
      gameId: 'valorant',
      cluster: 'Valorant Buy & RR',
      shortLabel: 'Round Buy Matrix',
      title: 'Valorant Round Buy & Shield Economy Tool — Unpause',
      description:
        'Test Valorant Vandal/Phantom, Outlaw, Light (400), Regen (650) & Heavy (1,000) Shield builds against 1,900–2,900 loss streak minimums to lock next round buys.',
      h1: 'Valorant Round Buy Economy & Loss-Streak Matrix',
      answer: `Pairing a Vandal/Phantom (2,900) with a Regen Shield (650) costs 3,550 creds—saving 350 creds versus Heavy Armor (1,000). Verify whether your leftover creds plus 1,900/2,400/2,900 loss reward secure 3,900+ next round.`,
      ogImage: '/og/valorant.png',
      preset: { valCreds: 3900, valWeapon: 2900, valArmor: 650, valUtil: 350, valLoss: 1 },
    },
    {
      path: '/valorant/vandal-phantom-heavy-shields-3900',
      gameId: 'valorant',
      cluster: 'Valorant Buy & RR',
      shortLabel: '3,900 Cred Floor',
      title: 'Valorant 3,900 Rifle + Heavy Shield Check — Unpause',
      description:
        'Calculate exact Round 2 save limits so you still afford a 2,900 Vandal/Phantom + 1,000 Heavy Shield (3,900 total) on Round 3 regardless of outcome.',
      h1: 'How to Guarantee 3,900+ (Vandal/Phantom + Heavy) Next Round',
      answer: `With 3,900 creds needed for Rifle (2,900) + Heavy Armor (1,000), a player on Loss 0 (1,900 next loss floor) can keep 2,000 minimum saved; on Loss 1 (2,400 floor), saving 1,500 guarantees a full buy.`,
      ogImage: '/og/valorant.png',
      preset: { valCreds: 3400, valWeapon: 1600, valArmor: 400, valUtil: 200, valLoss: 0 },
    },
    {
      path: '/valorant/ranked-rr-to-rank-up-calculator',
      gameId: 'valorant',
      cluster: 'Valorant Buy & RR',
      shortLabel: 'Ranked RR Climb Sim',
      title: 'Valorant Ranked RR Promotion Simulator — Unpause',
      description:
        'Project expected Ranked Rating (RR) per game and realistic matches to rank up using win rate, average +RR win, and average -RR loss offsets free online.',
      h1: 'Valorant Ranked RR Expected-Value Climb Simulator',
      answer:
        'Instead of dividing 100 - RR by win points alone, our simulator computes true EV per match: (Win% × Avg Win RR) - (Loss% × Avg Loss RR), predicting realistic rank-up games at 55% win rate.',
      ogImage: '/og/valorant.png',
      preset: { valCreds: 3900, valRr: 44, valWr: 55 },
    },
    {
      path: '/valorant/loss-streak-save-credits',
      gameId: 'valorant',
      cluster: 'Valorant Buy & RR',
      shortLabel: '1,900–2,900 Loss Tiers',
      title: 'Valorant Loss Streak Credits (1,900–2,900) — Unpause',
      description:
        'Understand Valorant’s 1,900 (1st loss), 2,400 (2nd loss), and 2,900 (3rd+ loss) credit floors and calculate exact safe eco buys in seconds.',
      h1: 'Valorant Loss-Streak Credit Tiers & Safe Eco Spending',
      answer: `Valorant grants 1,900 creds after one loss, 2,400 after two consecutive losses, and caps at 2,900 from three+ losses—while winning awards +${calcValorantEconomy({ credits: 3900, weaponCost: 2900, armorCost: 1000, utilCost: 0, lossStreak: 1 }).nextRoundMinOnWin} creds minimum, so saving 1,500 on Loss 1 locks 3,900+ next round.`,
      ogImage: '/og/valorant.png',
      preset: { valCreds: 2800, valWeapon: 800, valArmor: 400, valUtil: 200, valLoss: 1 },
    },
    {
      path: '/valorant/eco-bonus-thrifty-math',
      gameId: 'valorant',
      cluster: 'Valorant Buy & RR',
      shortLabel: 'Bonus & Outlaw Buys',
      title: 'Valorant Outlaw & Bonus Round Economy — Unpause',
      description:
        'Optimize Valorant Round 2–3 Outlaw (2,400) + Regen Shield (650) buys after winning pistol while keeping next-round full-buy flexibility cleanly.',
      h1: 'Valorant Outlaw (2,400) & Regen Shield Bonus-Round Economy',
      answer:
        'Buying an Outlaw (2,400 creds) + Regen Shield (650 creds) totals 3,050 creds—cheaper than a Vandal + Heavy while punishing light-armor forces on anti-eco bonus rounds.',
      ogImage: '/og/valorant.png',
      preset: { valCreds: 3650, valWeapon: 2400, valArmor: 650, valUtil: 350, valLoss: 0 },
    },

    // Apex Legends (5)
    {
      path: '/apex-legends/heirloom-500-pack-calculator',
      gameId: 'apex-legends',
      cluster: 'Apex Heirloom & Ranked',
      shortLabel: '500-Pack Heirloom Pity',
      title: 'Apex Legends 500-Pack Heirloom Calculator — Unpause',
      description:
        'Count earned free Apex Packs across Account Level (1–500) + Prestige Tiers (1–3) plus Battle Pass and purchased packs to pinpoint your 500-pack Heirloom pity.',
      h1: 'Apex Legends 500-Pack Heirloom Pity Counter (Prestige 0–3)',
      answer: `A Tier 0 Level 500 player has earned ${getFreeApexLevelPacks(500, 0)} free level packs (out of 544 total across Prestige Tiers 0–3). Add Battle Pass and store packs to see exact distance to guaranteed 150 Heirloom Shards.`,
      ogImage: '/og/apex-legends.png',
      preset: { apexLevel: 420, apexPrestige: 0, apexBp: 28, apexBought: 20 },
    },
    {
      path: '/apex-legends/level-500-prestige-free-packs',
      gameId: 'apex-legends',
      cluster: 'Apex Heirloom & Ranked',
      shortLabel: 'Prestige 0–3 Packs',
      title: 'Apex Legends Free Packs Level 1–2000 — Unpause',
      description:
        'See exact free Apex Packs earned at every level bracket from Level 1 to Prestige 3 Level 500 (544 packs total = guaranteed free Heirloom Shards).',
      h1: 'How Many Free Apex Packs Do Prestige Tiers 0–3 Grant? (544 Total)',
      answer: `Leveling from 1–500 in Tier 0 grants 199 free Apex Packs. Advancing through Prestige Tiers 1, 2, and 3 adds 345 more—reaching 544 total free level packs (past the 500-pack guaranteed Heirloom threshold).`,
      ogImage: '/og/apex-legends.png',
      preset: { apexLevel: 500, apexPrestige: 2, apexBp: 40, apexBought: 0 },
    },
    {
      path: '/apex-legends/ranked-rp-entry-cost-calculator',
      gameId: 'apex-legends',
      cluster: 'Apex Heirloom & Ranked',
      shortLabel: 'Ranked RP Entry Costs',
      title: 'Apex Legends Ranked RP Entry Cost Planner — Unpause',
      description:
        'Check Ranked RP entry costs across Silver (-20), Gold (-35), Platinum (-55), Diamond (-75), and Master (-100) and estimate net RP games to promote.',
      h1: 'Apex Ranked RP Entry Costs & Games-to-Promote Estimator',
      answer:
        'Ranked entry fees scale from 20 RP in Silver and 35 RP in Gold to 55 RP in Platinum, 75 RP in Diamond, and 100 RP in Master—making consistent Top-5 placement + KP essential for positive RP/match.',
      ogImage: '/og/apex-legends.png',
      preset: { apexRp: 8400, apexTier: 'diamond', apexAvgRp: 95 },
    },
    {
      path: '/apex-legends/diamond-to-master-rp-grind',
      gameId: 'apex-legends',
      cluster: 'Apex Heirloom & Ranked',
      shortLabel: 'Diamond → Master RP',
      title: 'Apex Diamond to Master RP Grind Calculator — Unpause',
      description:
        'Calculate exact RP needed from 15,000 Diamond to 21,000 Master (6,000 RP gap) based on your squad’s net RP per match. Fast, ad-free companion deck.',
      h1: 'Diamond (15,000 RP) to Master (21,000 RP) Match Estimator',
      answer:
        'Climbing from Diamond IV (15,000 RP) to Master (21,000 RP) requires +6,000 net RP despite -75 RP lobby entry fees—averaging ~75 games at +80 net RP per match.',
      ogImage: '/og/apex-legends.png',
      preset: { apexRp: 15000, apexTier: 'master', apexAvgRp: 80 },
    },
    {
      path: '/apex-legends/heirloom-shards-pity-tracker',
      gameId: 'apex-legends',
      cluster: 'Apex Heirloom & Ranked',
      shortLabel: 'Collection Event Rules',
      title: 'Do Event Packs Count Toward Apex 500 Pity? — Unpause',
      description:
        'Track your exact standard Apex Pack count toward 150 Heirloom Shards and check why Collection Event packs do not advance the 500-pack pity counter.',
      h1: 'Heirloom Shards Pity Counter & Event Pack Rules',
      answer:
        'Only standard Apex Packs (and Legendary/Epic thematic standard-pool packs) advance the 500-pack Heirloom Shard pity counter; Milestone/Collection Event packs are excluded, and pulling Shards resets the counter to 0.',
      ogImage: '/og/apex-legends.png',
      preset: { apexLevel: 350, apexPrestige: 1, apexBp: 55, apexBought: 50 },
    },

    // GTA Online Cayo Perico (6)
    {
      path: '/gta-online/cayo-perico-payout-calculator',
      gameId: 'gta-v',
      cluster: 'GTA Online Cayo Perico',
      shortLabel: 'Cayo Perico Payouts',
      title: 'GTA Online Cayo Perico Payout Calculator — Unpause',
      description:
        'Calculate exact Cayo Perico net payouts with Pavel 2%, Fence 10%, $100K setup fee, +10% Hard Mode, Elite bonus, and GTA’s mandatory 15% crew share floor.',
      h1: 'Cayo Perico Payout Splitter (Pavel, Fence & 15% Crew Floor)',
      answer: `With a $1,300,000 Pink Diamond on Hard Mode ($1,430,000) + $495K Gold bag ($1,925,000 gross), deducting Pavel (2%) and Fence (10%) leaves $${calcGtaOnlineHeist({ primaryValue: 1300000, secondaryValue: 495000, players: 2, hostPct: 85, hardMode: true }).netPool.toLocaleString('en-US')} net before host/crew cuts.`,
      ogImage: '/og/gta-online.png',
      preset: { cayoPrimary: 1300000, cayoSecondary: 495000, cayoPlayers: 2, cayoHostPct: 85, cayoHard: true },
    },
    {
      path: '/gta-online/cayo-perico-pink-diamond-gold',
      gameId: 'gta-v',
      cluster: 'GTA Online Cayo Perico',
      shortLabel: 'Pink Diamond + Gold',
      title: 'Cayo Perico Pink Diamond + Gold Duo Payout — Unpause',
      description:
        'Test Hard Mode Pink Diamond ($1.43M) + Duo Gold stacks (~$660K+) with an 85/15 split, automatic 12% Pavel+Fence cuts, and Elite +$100K bonus in seconds.',
      h1: 'Pink Diamond + Full Gold Duo Cayo Perico Payout Breakdown',
      answer:
        'Pink Diamond on Hard Mode ($1,430,000) paired with Duo Gold stacks inside the compound maximizes per-minute GTA$ after deducting Pavel’s 2%, Madrazo’s 10%, and the $100K Kosatka setup fee.',
      ogImage: '/og/gta-online.png',
      preset: { cayoPrimary: 1300000, cayoSecondary: 495000, cayoPlayers: 2, cayoHostPct: 85, cayoHard: true },
    },
    {
      path: '/gta-online/cayo-perico-panther-statue',
      gameId: 'gta-v',
      cluster: 'GTA Online Cayo Perico',
      shortLabel: 'Panther Statue ($1.9M)',
      title: 'Cayo Perico Panther Statue Hard Mode Math — Unpause',
      description:
        'Calculate exact Panther Statue payouts ($1.90M Normal / $2.09M Hard Mode) across 1–4 players with Gold or Cocaine bags and +$100K Elite challenge bonus.',
      h1: 'Panther Statue ($1.9M / $2.09M Hard) Cayo Perico Payouts',
      answer: `On Hard Mode, the event-week Panther Statue jumps +10% to $2,090,000 primary value—paying a solo or 85% Duo Host over $${calcGtaOnlineHeist({ primaryValue: 1900000, secondaryValue: 495000, players: 2, hostPct: 85, hardMode: true }).hostProfitAfterSetup.toLocaleString('en-US')} net after fees.`,
      ogImage: '/og/gta-online.png',
      preset: { cayoPrimary: 1900000, cayoSecondary: 495000, cayoPlayers: 2, cayoHostPct: 85, cayoHard: true },
    },
    {
      path: '/gta-online/cayo-perico-solo-cocaine-elite',
      gameId: 'gta-v',
      cluster: 'GTA Online Cayo Perico',
      shortLabel: 'Solo Cocaine + Elite',
      title: 'Cayo Perico Solo Cocaine Bag & Elite Pay — Unpause',
      description:
        'Optimize solo Cayo Perico runs: 2× Cocaine stacks (~$400K) yield higher profit than Paintings or Weed. Check 100% Host net cash + $100K Hard Mode Elite.',
      h1: 'Solo Cayo Perico Cocaine Bag Priority & Net Take',
      answer: `For solo runners locked out of compound Gold doors, two stacks of Cocaine (50% bag each = ~$400,000) deliver the top solo loot value—yielding $${calcGtaOnlineHeist({ primaryValue: 1100000, secondaryValue: 400000, players: 1, hostPct: 100, hardMode: true }).hostProfitAfterSetup.toLocaleString('en-US')} net on Hard Bearer Bonds (+ $100K Elite).`,
      ogImage: '/og/gta-online.png',
      preset: { cayoPrimary: 1100000, cayoSecondary: 400000, cayoPlayers: 1, cayoHostPct: 100, cayoHard: true },
    },
    {
      path: '/gta-online/cayo-perico-duo-85-15-cut',
      gameId: 'gta-v',
      cluster: 'GTA Online Cayo Perico',
      shortLabel: '85/15 Duo Split',
      title: 'Cayo Perico 85/15 Duo Cut Payout Math — Unpause',
      description:
        'Check exact dollar splits for an 85% Host / 15% Crew Cayo Perico Duo heist across Pink Diamond, Bearer Bonds, and Tequila with Hard Mode & Elite toggles.',
      h1: '85% / 15% Duo Cayo Perico Maximum Host Payout Guide',
      answer:
        'GTA Online enforces a strict 15% minimum share per guest, capping a 2-player Host at 85%—yet unlocking two-person Gold doors often pays both players more net dollars than running solo.',
      ogImage: '/og/gta-online.png',
      preset: { cayoPrimary: 1300000, cayoSecondary: 495000, cayoPlayers: 2, cayoHostPct: 85, cayoHard: true },
    },
    {
      path: '/gta-online/cayo-perico-4-player-cut',
      gameId: 'gta-v',
      cluster: 'GTA Online Cayo Perico',
      shortLabel: '4-Player 55/15/15/15',
      title: 'Cayo Perico 4-Player 55/15 Split Math — Unpause',
      description:
        'See why 4-player Cayo Perico caps the Host at 55% (15% × 3 mandatory crew floor) and compute exact per-player cash after Pavel, Fence & $100K setup.',
      h1: '4-Player Cayo Perico (55% / 15% / 15% / 15%) Payout Calculator',
      answer: `In a 4-player Cayo Perico squad, three mandatory 15% guest cuts lock the Host ceiling at 55%. Adjust Host cut, Hard Mode (+10%), and Gold bags to see exact take-home per player.`,
      ogImage: '/og/gta-online.png',
      preset: { cayoPrimary: 1300000, cayoSecondary: 495000, cayoPlayers: 4, cayoHostPct: 55, cayoHard: true },
    },
  ];

  for (const item of remaining28Specs) {
    pages.push({
      path: item.path,
      gameId: item.gameId,
      cluster: item.cluster,
      shortLabel: item.shortLabel,
      priority: '0.83',
      changefreq: 'weekly',
      title: clampTitle(item.title),
      description: clampDesc(item.description),
      h1: item.h1,
      answerSummary: item.answer,
      ogImage: item.ogImage,
      ogAlt: item.h1,
      breadcrumbs: [
        { name: 'Unpause', path: '/' },
        { name: TOP_GAMES.find((g) => g.id === item.gameId)?.shortTitle || item.gameId, path: GAME_TO_CANONICAL_PATH[item.gameId] || '/' },
        { name: item.shortLabel, path: item.path },
      ],
      preset: item.preset,
      metaRows: getGameMetaRows(item.gameId),
      faqs: getGameFaqs(item.gameId),
    });
  }

  return pages;
}

export const CORE_ROUTES = [
  {
    path: '/',
    gameId: 'gta-6',
    tab: 'storage',
    cluster: 'Core Game Hubs',
    shortLabel: 'Home (GTA VI + All 10)',
    priority: '1.0',
    changefreq: 'daily',
    title: clampTitle('Unpause — Instant Console Storage & Game Math Tools'),
    description: clampDesc(
      'Check GTA VI 212–225 GB SSD fit on PS5 or Xbox in seconds, compare Warzone 300 HP TTK, link Minecraft Nether portals, and solve EA FC 27 tax cleanly free.'
    ),
    h1: 'Will GTA VI fit on your console?',
    answerSummary:
      'Check exact PS5 & Xbox SSD headroom (212 GB PS5 / 225 GB Xbox est.), download ETA, keypad vaults, heist splits, and 9 instant top-game math decks — free, zero popups, no account.',
    ogImage: '/og-cover.png',
    ogAlt: 'Unpause — Clean second-screen calculators across 10 games',
    breadcrumbs: [],
    preset: { consoleId: 'xss-512', freeGb: 140, mbps: 120 },
    metaRows: [],
    faqs: getGameFaqs('gta-6'),
  },
  {
    path: '/gta-6/storage',
    gameId: 'gta-6',
    tab: 'storage',
    cluster: 'GTA VI Launch Suite',
    shortLabel: 'Preload & SSD Surgery',
    priority: '0.95',
    changefreq: 'daily',
    title: clampTitle('GTA 6 Storage Fit Check (212–225 GB) — Unpause'),
    description: clampDesc(
      'Test if GTA 6 (212 GB PS5 / 225 GB Xbox) fits on Series S, Series X, or PS5 SSDs, pick games to clear, check NZ unlock timing, and export a Preload Spec Card.'
    ),
    h1: 'GTA VI Preload & Console Storage Surgery (PS5 & Xbox)',
    answerSummary:
      'Compare your exact console usable NVMe (364 GB Series S up to 1,890 GB PS5 Pro) against estimated 212 GB PlayStation 5 and 225 GB Xbox Series X|S installs, toggle a +35 GB Day-1 patch buffer, and calculate download ETA by Mbps.',
    ogImage: '/og/gta-6-storage.png',
    ogAlt: 'Unpause GTA VI Console Storage Fit & Download ETA Calculator',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'GTA VI Storage', path: '/gta-6/storage' },
    ],
    preset: { consoleId: 'xss-512', freeGb: 140, mbps: 120 },
    metaRows: [
      { label: 'PS5 Base / Slim / Pro Estimate', val: '212 GB base (+35 GB optional patch)' },
      { label: 'Xbox Series S / X Estimate', val: '225 GB base (+35 GB optional patch)' },
      { label: 'Earliest Rolling Unlock (NZ)', val: 'Nov 18, 2026 @ 11:00 UTC (Xbox Settings)' },
    ],
    faqs: getGameFaqs('gta-6'),
  },
  {
    path: '/gta-6/safe-codes',
    gameId: 'gta-6',
    tab: 'safes',
    cluster: 'GTA VI Launch Suite',
    shortLabel: 'Safe Keypad Vault',
    priority: '0.95',
    changefreq: 'daily',
    title: clampTitle('GTA 6 Safe & Door Combinations Keypad — Unpause'),
    description: clampDesc(
      'Search GTA 6 safe codes by district, play interactive 10-key WebAudio sequences, copy 4-digit codes in one tap, and track cracked doors locally without ads.'
    ),
    h1: 'GTA VI Safe & Door Combinations Keypad Vault',
    answerSummary:
      'Search Leonida districts instantaneously, replay 4-digit keypad rhythms with tactile WebAudio tones, copy codes cleanly on phone or desktop, and check off opened doors locally (UI demo codes shown pre-launch; verified launch codes publish Nov 18).',
    ogImage: '/og/gta-6-safes.png',
    ogAlt: 'Unpause GTA VI Safe & Door Keypad Combination Vault',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Safe Keypads', path: '/gta-6/safe-codes' },
    ],
    preset: { district: 'All Districts', query: '' },
    metaRows: [
      { label: 'Covered Leonida Regions', val: 'Port Gellhorn, Vice Beach, Keys, Grassrivers, Ambrosia, Mt. Kalaga' },
      { label: 'Live Launch Update', val: 'Verified release combinations sync Nov 18 (11:00 UTC)' },
    ],
    faqs: getGameFaqs('gta-6'),
  },
  {
    path: '/gta-6/heist-split',
    gameId: 'gta-6',
    tab: 'squad',
    cluster: 'GTA VI Launch Suite',
    shortLabel: 'Squad Heist Splitter',
    priority: '0.90',
    changefreq: 'weekly',
    title: clampTitle('GTA 6 Heist Cut Splitter & Stock Flip — Unpause'),
    description: clampDesc(
      'Split squad heist percentages to an exact 100%, auto-deduct NPC fees, export Crew Payout Slip PNGs to Discord, and model two-character story stock flips.'
    ),
    h1: 'Squad Heist Cut Splitter & Two-Character Stock Planner',
    answerSummary:
      'Lock crew cuts with integer-exact 100% reconciliation after NPC support fees, export transparent Crew Payout Slips to party chat, and preview two-protagonist stock compounding timelines free with zero popup ads.',
    ogImage: '/og/gta-6-heist.png',
    ogAlt: 'Unpause GTA VI Squad Heist Cut Splitter & Payout Slip',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Squad & Heist Split', path: '/gta-6/heist-split' },
    ],
    preset: { subTab: 'heist', gross: 2450000, fee: 12, cuts: [40, 20, 20, 20] },
    metaRows: [
      { label: 'Preset Heist Takes', val: '$145K Early Run up to $2.45M Vice Beach Reserve' },
      { label: 'Share Format', val: '1-Tap Crew Payout Slip PNG & Discord Clipboard' },
    ],
    faqs: getGameFaqs('gta-6'),
  },
  {
    path: '/gta-6/night-run',
    gameId: 'gta-6',
    tab: 'nightrun',
    cluster: 'GTA VI Launch Suite',
    shortLabel: 'Weeknight Route & Shield',
    priority: '0.90',
    changefreq: 'daily',
    title: clampTitle('GTA 6 Weeknight Routes & Missables Shield — Unpause'),
    description: clampDesc(
      'Follow time-boxed 45m/90m/120m GTA 6 weeknight loops on an interactive Leonida waypoint grid and avoid permanent mission lockouts with zero story spoilers.'
    ),
    h1: 'Weeknight Session Routes & Spoiler-Free Missables Shield',
    answerSummary:
      'Pick a free 45-minute express run (or extended 90m/120m Sync Pass chains) across Port Gellhorn, Grassrivers, Vice Beach, and Leonida Keys, paired with spoiler-free Act I–III pause alerts.',
    ogImage: '/og/gta-6-nightrun.png',
    ogAlt: 'Unpause GTA VI Weeknight Route Map & Missables Shield',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Weeknight Routes', path: '/gta-6/night-run' },
    ],
    preset: { mins: 45 },
    metaRows: [
      { label: 'Free Express Track', val: '45 Minutes · 4 High-Impact Stops' },
      { label: 'Spoiler Protection', val: 'Act gates flagged with zero plot spoilers' },
    ],
    faqs: getGameFaqs('gta-6'),
  },
  {
    path: '/cod-warzone',
    gameId: 'cod-warzone',
    cluster: 'Core Game Hubs',
    shortLabel: 'CoD / Warzone TTK',
    priority: '0.92',
    changefreq: 'weekly',
    title: clampTitle('CoD Warzone 300 HP TTK & Camo Tracker — Unpause'),
    description: clampDesc(
      'Compare Season 1 Warzone guns head-to-head at 300/250/200/100 HP with headshot multipliers, open-bolt trigger delays, and 33-weapon Mastery Camo progress.'
    ),
    h1: 'Call of Duty: Warzone & MW4 300 HP TTK Comparator',
    answerSummary:
      'Compare 11 Season 1 weapon presets (including PPSh-41 +42ms & RAAL MG +50ms open-bolt delays) across 300 HP 3-plate Warzone and 100 HP Multiplayer, plus track 33-weapon Mastery Camo progress cleanly.',
    ogImage: '/og/cod-warzone.png',
    ogAlt: 'Unpause Warzone 300 HP TTK Comparator & Camo Tracker',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'CoD / Warzone', path: '/cod-warzone' },
    ],
    preset: { weaponAId: 'raal-mg', weaponBId: 'c9-smg', codHp: 300, codHeadshots: 1, codOpenBolt: true },
    metaRows: getGameMetaRows('cod-warzone'),
    faqs: getGameFaqs('cod-warzone'),
  },
  {
    path: '/fortnite',
    gameId: 'fortnite',
    cluster: 'Core Game Hubs',
    shortLabel: 'Fortnite XP Pace',
    priority: '0.92',
    changefreq: 'weekly',
    title: clampTitle('Fortnite Battle Pass XP Pace Calculator — Unpause'),
    description: clampDesc(
      'Calculate daily XP and matches to reach Level 100, Level 140 V-Bucks break-even, or Level 200 Super Styles with Daily Quests, Creative & LEGO.'
    ),
    h1: 'Fortnite Battle Pass Level 100/140/200 Multi-Mode XP Pace',
    answerSummary:
      'Every Battle Pass tier from 1 to 200 requires 80,000 XP. Balance Daily Bonus Quests (60,000 XP), weekly UEFN Creative (~4M XP cap), and LEGO/Festival playtime to hit Level 200 effortlessly.',
    ogImage: '/og/fortnite.png',
    ogAlt: 'Unpause Fortnite Level 200 Multi-Mode XP Pace Calculator',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Fortnite XP', path: '/fortnite' },
    ],
    preset: { fnLevel: 44, fnTarget: 200, fnDays: 28, fnCreative: true },
    metaRows: getGameMetaRows('fortnite'),
    faqs: getGameFaqs('fortnite'),
  },
  {
    path: '/minecraft',
    gameId: 'minecraft',
    cluster: 'Core Game Hubs',
    shortLabel: 'Minecraft 8:1 Linker',
    priority: '0.92',
    changefreq: 'weekly',
    title: clampTitle('Minecraft 8:1 Nether Portal & Stronghold — Unpause'),
    description: clampDesc(
      'Convert Overworld & Nether coordinates using exact Java/Bedrock Math.floor rules, test 128-block portal collisions, and triangulate Strongholds in 2 throws.'
    ),
    h1: 'Minecraft Nether 8:1 Linker, 3D Collision & Stronghold Solver',
    answerSummary:
      'Divides X and Z toward negative infinity (fixing negative-coord bugs like -20 → -3), checks 3D 128-block Overworld / 16-block Nether portal hijacks, resolves .mca region files, and triangulates End Portals from 2 Eye throws.',
    ogImage: '/og/minecraft.png',
    ogAlt: 'Unpause Minecraft 8:1 Nether Portal Linker & Stronghold Finder',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Minecraft', path: '/minecraft' },
    ],
    preset: { mcDir: 'toNether', netherX: -20, netherY: 64, netherZ: 1023 },
    metaRows: getGameMetaRows('minecraft'),
    faqs: getGameFaqs('minecraft'),
  },
  {
    path: '/ea-fc-27',
    gameId: 'ea-fc-27',
    cluster: 'Core Game Hubs',
    shortLabel: 'EA FC 27 Tax & SBC',
    priority: '0.92',
    changefreq: 'weekly',
    title: clampTitle('EA Sports FC 27 5% Tax & SBC Solver — Unpause'),
    description: clampDesc(
      'Calculate exact 5% EA transfer tax, legal FUT market price-step break-evens, multi-card trading profits, and the exact 11-player SBC Excess-Rating solver.'
    ),
    h1: 'EA Sports FC 27 5% Transfer Tax & 11-Player SBC Solver',
    answerSummary:
      'Computes exact 5% EA transfer market tax deductions, snaps break-even targets to official FUT auction increments, totals batch sniping profits, and solves 11-slot Ultimate Team SBC rating math live.',
    ogImage: '/og/ea-fc-27.png',
    ogAlt: 'Unpause EA Sports FC 27 5% Transfer Tax & SBC Rating Solver',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'EA Sports FC 27', path: '/ea-fc-27' },
    ],
    preset: { buyPrice: 185000, sellPrice: 215000, quantity: 1 },
    metaRows: getGameMetaRows('ea-fc-27'),
    faqs: getGameFaqs('ea-fc-27'),
  },
  {
    path: '/roblox',
    gameId: 'roblox',
    cluster: 'Core Game Hubs',
    shortLabel: 'Roblox DevEx USD',
    priority: '0.90',
    changefreq: 'weekly',
    title: clampTitle('Roblox DevEx USD & 30% Marketplace Calc — Unpause'),
    description: clampDesc(
      'Convert earned Robux at $0.0038/R$ Standard, $0.0035 Legacy, or $0.0054 US Direct Store rates, enforce the 30,000 R$ floor, and price Gamepasses after 30% fees.'
    ),
    h1: 'Roblox DevEx Cashout ($0.0038/R$) & 30% Fee Calculator',
    answerSummary:
      'Models all three official DevEx tiers ($0.0038 Standard, $0.0035 Legacy, $0.0054 US 18+ Direct Store), validates the 30,000 R$ minimum cashout gate, and calculates reverse Gamepass pricing after 30% Marketplace cuts.',
    ogImage: '/og/roblox.png',
    ogAlt: 'Unpause Roblox DevEx USD & 30% Marketplace Fee Calculator',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Roblox DevEx', path: '/roblox' },
    ],
    preset: { robux: 50000, devexRate: 'std-2025', groupSplit: 100 },
    metaRows: getGameMetaRows('roblox'),
    faqs: getGameFaqs('roblox'),
  },
  {
    path: '/cs2',
    gameId: 'cs2',
    cluster: 'Core Game Hubs',
    shortLabel: 'CS2 MR12 Economy',
    priority: '0.90',
    changefreq: 'weekly',
    title: clampTitle('CS2 MR12 Loss Bonus & 5-Man Bank Tool — Unpause'),
    description: clampDesc(
      'Simulate authentic CS2 MR12 loss tiers ($1,400–$3,400), -1 win step-downs, Level 1 pistol losses, T +$800 bomb plants, and 5-player rifle drop balancing.'
    ),
    h1: 'CS2 Premier MR12 Loss-Bonus Ladder & 5-Player Bank Matrix',
    answerSummary:
      'Uses real Valve MR12 economy mechanics: $1,900 Round 1 pistol loss start, -1 loss-counter step-down on wins, CT ($5,100) vs T ($4,700 + $800 plant) buy tiers, and 5-teammate drop tracking.',
    ogImage: '/og/cs2.png',
    ogAlt: 'Unpause CS2 Premier MR12 Loss Bonus & Team Buy Calculator',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Counter-Strike 2', path: '/cs2' },
    ],
    preset: { cs2Side: 'CT', cs2Cash: 3200, cs2Loss: 1, cs2Plant: false },
    metaRows: getGameMetaRows('cs2'),
    faqs: getGameFaqs('cs2'),
  },
  {
    path: '/valorant',
    gameId: 'valorant',
    cluster: 'Core Game Hubs',
    shortLabel: 'Valorant Buy & RR',
    priority: '0.90',
    changefreq: 'weekly',
    title: clampTitle('Valorant Round Buy Matrix & Ranked RR — Unpause'),
    description: clampDesc(
      'Plan Valorant buys across Light (400), Regen (650), Heavy (1,000) shields & Vandal/Outlaw against 1,900–2,900 loss minimums, plus simulate Ranked RR climbs.'
    ),
    h1: 'Valorant Round Buy Economy Matrix & Ranked RR Simulator',
    answerSummary:
      'Test live Weapon + Shield (Light 400 / Regen 650 / Heavy 1,000) + Utility loadouts against 1,900–2,900 loss streak guarantees to secure 3,900+ full buys, paired with EV-accurate Ranked RR climb estimates.',
    ogImage: '/og/valorant.png',
    ogAlt: 'Unpause Valorant Round Buy Matrix & Ranked RR Simulator',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Valorant', path: '/valorant' },
    ],
    preset: { valCreds: 3900, valWeapon: 2900, valArmor: 650, valUtil: 350, valLoss: 1 },
    metaRows: getGameMetaRows('valorant'),
    faqs: getGameFaqs('valorant'),
  },
  {
    path: '/apex-legends',
    gameId: 'apex-legends',
    cluster: 'Core Game Hubs',
    shortLabel: 'Apex Packs & RP',
    priority: '0.90',
    changefreq: 'weekly',
    title: clampTitle('Apex Heirloom 500-Pack & Ranked RP Tool — Unpause'),
    description: clampDesc(
      'Calculate earned free Apex Packs across Prestige Tiers 0–3 (up to 544 packs), track 500-pack Heirloom pity, and estimate Ranked RP promotion games free.'
    ),
    h1: 'Apex Legends 500-Pack Heirloom Pity & Ranked RP Planner',
    answerSummary:
      'Computes exact level-earned Apex Packs across Tier 0 (199 free packs, Lvl 1–500) and Prestige Tiers 1–3 (544 cumulative packs) alongside Battle Pass/store packs and Silver-to-Master RP match estimators.',
    ogImage: '/og/apex-legends.png',
    ogAlt: 'Unpause Apex Legends 500-Pack Heirloom & Ranked RP Calculator',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'Apex Legends', path: '/apex-legends' },
    ],
    preset: { apexLevel: 420, apexPrestige: 0, apexBp: 28, apexBought: 20 },
    metaRows: getGameMetaRows('apex-legends'),
    faqs: getGameFaqs('apex-legends'),
  },
  {
    path: '/gta-online',
    gameId: 'gta-v',
    cluster: 'Core Game Hubs',
    shortLabel: 'GTA Online Cayo',
    priority: '0.90',
    changefreq: 'weekly',
    title: clampTitle('GTA Online Cayo Perico Payout Splitter — Unpause'),
    description: clampDesc(
      'Calculate Cayo Perico net payouts with Pavel 2%, Fence 10%, $100K setup fee, +10% Hard Mode, Gold/Cocaine bag fills, and mandatory 15% crew floors.'
    ),
    h1: 'GTA Online Cayo Perico Splitter & Bag Fill Optimizer',
    answerSummary:
      'Automatically deducts Pavel (2%), Fence (10%), and $100K setup fee, enforces GTA Online’s 15% minimum share per invited player (85/70/55% host ceilings), and calculates Primary + Gold/Cocaine + Elite bonuses.',
    ogImage: '/og/gta-online.png',
    ogAlt: 'Unpause GTA Online Cayo Perico Heist Payout Splitter',
    breadcrumbs: [
      { name: 'Unpause', path: '/' },
      { name: 'GTA Online', path: '/gta-online' },
    ],
    preset: { cayoPrimary: 1300000, cayoSecondary: 495000, cayoPlayers: 2, cayoHostPct: 85, cayoHard: true },
    metaRows: getGameMetaRows('gta-v'),
    faqs: getGameFaqs('gta-v'),
  },
];

export const LEGAL_ROUTES = Object.entries(LEGAL_META).map(([key, meta]) => ({
  path: meta.path,
  legal: key,
  gameId: 'gta-6',
  tab: 'storage',
  cluster: 'Legal & Compliance',
  shortLabel: key.toUpperCase(),
  priority: '0.4',
  changefreq: 'monthly',
  title: clampTitle(meta.title),
  description: clampDesc(meta.description),
  h1: meta.h1,
  answerSummary: meta.body,
  ogImage: '/og-cover.png',
  ogAlt: meta.h1,
  breadcrumbs: [
    { name: 'Unpause', path: '/' },
    { name: meta.h1, path: meta.path },
  ],
  metaRows: [],
  faqs: [],
}));

export const PSEO_ROUTES = buildProgrammaticRoutes();
export const ALL_CANONICAL_ROUTES = [...CORE_ROUTES, ...PSEO_ROUTES, ...LEGAL_ROUTES];

const CANONICAL_ROUTE_MAP = new Map(ALL_CANONICAL_ROUTES.map((r) => [r.path, r]));

export const EMBED_ELIGIBLE_PATHS = [
  '/gta-6/storage',
  '/gta-6/safe-codes',
  '/gta-6/heist-split',
  '/gta-6/night-run',
  '/cod-warzone',
  '/fortnite',
  '/minecraft',
  '/ea-fc-27',
  '/roblox',
  '/cs2',
  '/valorant',
  '/apex-legends',
  '/gta-online',
];

export const EMBED_ROUTES = EMBED_ELIGIBLE_PATHS.map((parentPath) => {
  const parent = CANONICAL_ROUTE_MAP.get(parentPath);
  return {
    ...parent,
    path: `/embed${parentPath}`,
    parentCanonicalPath: parentPath,
    isEmbed: true,
    title: clampTitle(`${parent.shortLabel} Embed — Unpause`),
  };
});

const EMBED_ROUTE_MAP = new Map(EMBED_ROUTES.map((r) => [r.path, r]));

function cleanPathStr(rawPathname) {
  let p = String(rawPathname || '/').split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  return p;
}

/**
 * Resolves any incoming URL path + query params into:
 * - { status: 301, redirectTo } for trailing slashes and legacy ?game=, ?tab=, ?legal= URLs
 * - { status: 200, route, isEmbed } for valid canonical, programmatic, legal, or /embed/* routes
 * - { status: 404, notFound: true, route: null } for unknown paths
 */
export function resolveSeoRequest(rawPathname = '/', searchParamsInput = null) {
  const pathname = cleanPathStr(rawPathname);
  const params =
    searchParamsInput instanceof URLSearchParams
      ? new URLSearchParams(searchParamsInput.toString())
      : new URLSearchParams(searchParamsInput || '');

  // 1. Trailing slash cleanup (except root '/')
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const trimmed = pathname.slice(0, -1);
    const qs = params.toString();
    return {
      status: 301,
      redirectTo: `${CANONICAL_ORIGIN}${trimmed}${qs ? `?${qs}` : ''}`,
    };
  }

  // 2. Legacy query routing redirect: ?legal=, ?game=, ?tab=
  if (pathname === '/' || pathname === '/index.html') {
    if (pathname === '/index.html') {
      const qs = params.toString();
      return { status: 301, redirectTo: `${CANONICAL_ORIGIN}/${qs ? `?${qs}` : ''}` };
    }
    const rawLegal = (params.get('legal') || '').trim().toLowerCase();
    const rawGame = (params.get('game') || '').trim();
    const rawTab = (params.get('tab') || '').trim().toLowerCase();

    if (rawLegal && LEGAL_META[rawLegal]) {
      params.delete('legal');
      params.delete('game');
      params.delete('tab');
      const qs = params.toString();
      return {
        status: 301,
        redirectTo: `${CANONICAL_ORIGIN}${LEGAL_META[rawLegal].path}${qs ? `?${qs}` : ''}`,
      };
    }

    if (rawGame) {
      const resolvedId = resolveGameIdFromSlug(rawGame);
      params.delete('game');
      let targetPath = GAME_TO_CANONICAL_PATH[resolvedId] || '/';
      if (resolvedId === 'gta-6' && rawTab && TAB_TO_CANONICAL_PATH[rawTab]) {
        targetPath = TAB_TO_CANONICAL_PATH[rawTab];
      }
      params.delete('tab');
      const qs = params.toString();
      return {
        status: 301,
        redirectTo: `${CANONICAL_ORIGIN}${targetPath}${qs ? `?${qs}` : ''}`,
      };
    }

    if (rawTab && TAB_TO_CANONICAL_PATH[rawTab]) {
      params.delete('tab');
      const qs = params.toString();
      return {
        status: 301,
        redirectTo: `${CANONICAL_ORIGIN}${TAB_TO_CANONICAL_PATH[rawTab]}${qs ? `?${qs}` : ''}`,
      };
    }
  }

  // 3. Direct embed convenience redirect (/embed -> /embed/gta-6/storage)
  if (pathname === '/embed') {
    return { status: 301, redirectTo: `${CANONICAL_ORIGIN}/embed/gta-6/storage` };
  }

  // 4. Match embed route or canonical indexable route
  const lowerPath = pathname.toLowerCase();
  if (EMBED_ROUTE_MAP.has(lowerPath)) {
    const route = EMBED_ROUTE_MAP.get(lowerPath);
    return { status: 200, route, isEmbed: true };
  }

  if (CANONICAL_ROUTE_MAP.has(lowerPath)) {
    const route = CANONICAL_ROUTE_MAP.get(lowerPath);
    return { status: 200, route, isEmbed: false };
  }

  return { status: 404, notFound: true, route: null, isEmbed: false };
}

const VALID_CONSOLE_IDS = new Set((gta6Pack.consoles || []).map((c) => c.id));
const VALID_WEAPON_IDS = new Set(COD_MW4_WEAPONS.map((w) => w.id));
const VALID_ROBLOX_RATES = new Set(['std-2025', 'legacy', 'us-direct']);
const VALID_APEX_TIERS = new Set(['bronze', 'silver', 'gold', 'plat', 'diamond', 'master']);

function safeInt(raw, fallback, min, max) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(clampNum(n, min, max));
}

const VALID_SAFE_IDS = new Set((gta6Pack.safeCodes || []).map((s) => s.id));

function parseBoolParam(params, key) {
  if (!params.has(key)) return undefined;
  const v = String(params.get(key) || '').trim().toLowerCase();
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return undefined;
}

/**
 * Sanitizes and clamps shareable URL query state against strict bounds & ID whitelists.
 * Guarantees zero NaN, Infinity, or unsafe payload pass-through.
 */
export function parseSafeStatefulQuery(searchParamsInput = null, basePreset = {}) {
  const params =
    searchParamsInput instanceof URLSearchParams
      ? searchParamsInput
      : new URLSearchParams(searchParamsInput || '');

  const clean = { ...(basePreset && typeof basePreset === 'object' ? basePreset : {}) };
  if (clean.subTab === 'stocks') clean.subTab = 'market';

  const c = params.get('c');
  if (c && VALID_CONSOLE_IDS.has(c.trim())) clean.consoleId = c.trim();

  if (params.has('free')) clean.freeGb = safeInt(params.get('free'), clean.freeGb ?? 140, 0, 2000);
  if (params.has('mbps')) clean.mbps = safeInt(params.get('mbps'), clean.mbps ?? 120, 10, 2500);
  const patchBool = parseBoolParam(params, 'patch');
  if (patchBool !== undefined) clean.includePatch = patchBool;

  if (params.has('q')) {
    clean.query = String(params.get('q') || '').replace(/[<>"'`]/g, '').trim().slice(0, 60);
  }
  if (params.has('dist')) {
    const d = String(params.get('dist') || '').trim();
    if ((gta6Pack.districts || []).includes(d)) clean.district = d;
  }
  if (params.has('safe')) {
    const sid = String(params.get('safe') || '').trim();
    if (VALID_SAFE_IDS.has(sid)) clean.safeId = sid;
  }

  if (params.has('sub')) {
    const sub = String(params.get('sub') || '').trim().toLowerCase();
    if (sub === 'heist') clean.subTab = 'heist';
    else if (sub === 'market' || sub === 'stocks') clean.subTab = 'market';
  }
  if (params.has('gross')) clean.gross = safeInt(params.get('gross'), clean.gross ?? 2450000, 10000, 25000000);
  if (params.has('fee')) clean.fee = safeInt(params.get('fee'), clean.fee ?? 12, 0, 35);
  if (params.has('cuts')) {
    const parts = String(params.get('cuts') || '')
      .split(',')
      .slice(0, 4)
      .map((s) => safeInt(s, -1, 0, 100))
      .filter((n) => n >= 0);
    if (parts.length >= 2 && parts.length <= 4 && parts.reduce((a, b) => a + b, 0) === 100) {
      clean.cuts = parts;
    }
  }
  if (params.has('mins')) {
    const m = safeInt(params.get('mins'), 45, 45, 120);
    if ([45, 90, 120].includes(m)) clean.mins = m;
  }

  if (params.has('a') && VALID_WEAPON_IDS.has(params.get('a').trim())) clean.weaponAId = params.get('a').trim();
  if (params.has('b') && VALID_WEAPON_IDS.has(params.get('b').trim())) clean.weaponBId = params.get('b').trim();
  if (params.has('hp')) {
    const hp = safeInt(params.get('hp'), 300, 100, 300);
    if ([100, 200, 250, 300].includes(hp)) clean.codHp = hp;
  }
  if (params.has('hs')) clean.codHeadshots = safeInt(params.get('hs'), clean.codHeadshots ?? 1, 0, 8);
  const boltBool = parseBoolParam(params, 'bolt');
  if (boltBool !== undefined) clean.codOpenBolt = boltBool;

  if (params.has('x')) clean.netherX = safeInt(params.get('x'), clean.netherX ?? -20, -30000000, 30000000);
  if (params.has('y')) clean.netherY = safeInt(params.get('y'), clean.netherY ?? 64, -64, 320);
  if (params.has('z')) clean.netherZ = safeInt(params.get('z'), clean.netherZ ?? 1023, -30000000, 30000000);
  if (params.get('dir') === 'toOverworld' || params.get('dir') === 'toNether') {
    clean.mcDir = params.get('dir');
  }

  if (params.has('buy')) clean.buyPrice = safeInt(params.get('buy'), clean.buyPrice ?? 185000, 150, 15000000);
  if (params.has('sell')) clean.sellPrice = safeInt(params.get('sell'), clean.sellPrice ?? 215000, 200, 15000000);
  if (params.has('qty')) clean.quantity = safeInt(params.get('qty'), clean.quantity ?? 1, 1, 100);
  if (params.has('net')) clean.desiredNet = safeInt(params.get('net'), clean.desiredNet ?? 25000, 0, 15000000);
  if (params.has('sbc')) {
    const ratings = String(params.get('sbc') || '')
      .split(',')
      .slice(0, 11)
      .map((s) => safeInt(s, -1, 45, 99))
      .filter((n) => n >= 45);
    if (ratings.length === 11) clean.sbcRatings = ratings;
  }

  if (params.has('robux')) clean.robux = safeInt(params.get('robux'), clean.robux ?? 50000, 0, 50000000);
  if (params.has('rate') && VALID_ROBLOX_RATES.has(params.get('rate').trim())) clean.devexRate = params.get('rate').trim();
  if (params.has('split')) clean.groupSplit = safeInt(params.get('split'), clean.groupSplit ?? 100, 1, 100);

  if (params.has('cash')) clean.cs2Cash = safeInt(params.get('cash'), clean.cs2Cash ?? 3200, 0, 16000);
  if (params.has('loss')) clean.cs2Loss = safeInt(params.get('loss'), clean.cs2Loss ?? 1, 0, 4);
  if (params.get('side') === 'CT' || params.get('side') === 'T') clean.cs2Side = params.get('side');
  const plantBool = parseBoolParam(params, 'plant');
  if (plantBool !== undefined) clean.cs2Plant = plantBool;

  if (params.has('cred')) clean.valCreds = safeInt(params.get('cred'), clean.valCreds ?? 3900, 0, 9000);
  if (params.has('vw')) clean.valWeapon = safeInt(params.get('vw'), clean.valWeapon ?? 2900, 0, 4700);
  if (params.has('va')) clean.valArmor = safeInt(params.get('va'), clean.valArmor ?? 1000, 0, 1000);
  if (params.has('vu')) clean.valUtil = safeInt(params.get('vu'), clean.valUtil ?? 400, 0, 1200);
  if (params.has('vl')) clean.valLoss = safeInt(params.get('vl'), clean.valLoss ?? 1, 0, 2);
  if (params.has('rr')) clean.valRr = safeInt(params.get('rr'), clean.valRr ?? 44, 0, 99);
  if (params.has('wr')) clean.valWr = safeInt(params.get('wr'), clean.valWr ?? 55, 20, 90);

  if (params.has('lvl')) clean.fnLevel = safeInt(params.get('lvl'), clean.fnLevel ?? 44, 1, 200);
  if (params.has('target')) clean.fnTarget = safeInt(params.get('target'), clean.fnTarget ?? 200, 1, 200);
  if (clean.fnLevel !== undefined && clean.fnTarget !== undefined && clean.fnTarget < clean.fnLevel) {
    clean.fnTarget = clean.fnLevel;
  }
  if (params.has('days')) clean.fnDays = safeInt(params.get('days'), clean.fnDays ?? 28, 1, 120);
  const fnCrBool = parseBoolParam(params, 'creative');
  if (fnCrBool !== undefined) clean.fnCreative = fnCrBool;
  const fnLegoBool = parseBoolParam(params, 'lego');
  if (fnLegoBool !== undefined) clean.fnLego = fnLegoBool;

  if (params.has('apexLvl')) clean.apexLevel = safeInt(params.get('apexLvl'), clean.apexLevel ?? 420, 1, 500);
  if (params.has('prestige')) clean.apexPrestige = safeInt(params.get('prestige'), clean.apexPrestige ?? 0, 0, 3);
  if (params.has('bp')) clean.apexBp = safeInt(params.get('bp'), clean.apexBp ?? 0, 0, 200);
  if (params.has('bought')) clean.apexBought = safeInt(params.get('bought'), clean.apexBought ?? 0, 0, 500);
  if (params.has('apexRp')) clean.apexRp = safeInt(params.get('apexRp'), clean.apexRp ?? 0, 0, 30000);
  if (params.has('avgRp')) clean.apexAvgRp = safeInt(params.get('avgRp'), clean.apexAvgRp ?? 120, 10, 600);
  if (params.has('tier') && VALID_APEX_TIERS.has(params.get('tier').trim())) clean.apexTier = params.get('tier').trim();

  if (params.has('cayo')) clean.cayoPrimary = safeInt(params.get('cayo'), clean.cayoPrimary ?? 1300000, 630000, 2500000);
  if (params.has('csec')) clean.cayoSecondary = safeInt(params.get('csec'), clean.cayoSecondary ?? 495000, 0, 2500000);
  if (params.has('players')) clean.cayoPlayers = safeInt(params.get('players'), clean.cayoPlayers ?? 2, 1, 4);
  if (params.has('hostPct')) clean.cayoHostPct = safeInt(params.get('hostPct'), clean.cayoHostPct ?? 85, 15, 100);
  const hardBool = parseBoolParam(params, 'hard');
  if (hardBool !== undefined) clean.cayoHard = hardBool;

  return clean;
}

export function getSitemapRoutes() {
  return ALL_CANONICAL_ROUTES;
}

export function getRelatedRoutesFor(route, maxCount = 8) {
  if (!route) return CORE_ROUTES.slice(0, maxCount);
  const sameGame = ALL_CANONICAL_ROUTES.filter(
    (r) => !r.legal && r.path !== route.path && r.gameId === route.gameId
  );
  const crossHubs = CORE_ROUTES.filter(
    (r) => r.path !== route.path && r.gameId !== route.gameId
  );
  return [...sameGame.slice(0, 6), ...crossHubs].slice(0, maxCount);
}

export function getGroupedDirectoryLinks() {
  const order = [
    'GTA VI Preload & Storage',
    'GTA VI Download Speeds',
    'GTA VI Safe Vault & Heists',
    'Call of Duty & Warzone',
    'EA Sports FC 27',
    'Minecraft & Sandbox',
    'Roblox DevEx & Creator',
    'Fortnite Battle Pass',
    'CS2 MR12 Economy',
    'Valorant Buy & RR',
    'Apex Heirloom & Ranked',
    'GTA Online Cayo Perico',
  ];
  const groups = new Map(order.map((k) => [k, []]));
  for (const r of [...CORE_ROUTES, ...PSEO_ROUTES]) {
    if (r.path === '/') continue;
    const key = r.cluster === 'GTA VI Launch Suite' ? 'GTA VI Preload & Storage' : r.cluster === 'Core Game Hubs' ? null : r.cluster;
    if (key && groups.has(key)) {
      groups.get(key).push({ path: r.path, label: r.shortLabel, gameId: r.gameId });
    } else if (r.cluster === 'Core Game Hubs') {
      const targetCluster =
        r.gameId === 'cod-warzone'
          ? 'Call of Duty & Warzone'
          : r.gameId === 'ea-fc-27'
            ? 'EA Sports FC 27'
            : r.gameId === 'minecraft'
              ? 'Minecraft & Sandbox'
              : r.gameId === 'roblox'
                ? 'Roblox DevEx & Creator'
                : r.gameId === 'fortnite'
                  ? 'Fortnite Battle Pass'
                  : r.gameId === 'cs2'
                    ? 'CS2 MR12 Economy'
                    : r.gameId === 'valorant'
                      ? 'Valorant Buy & RR'
                      : r.gameId === 'apex-legends'
                        ? 'Apex Heirloom & Ranked'
                        : 'GTA Online Cayo Perico';
      groups.get(targetCluster).unshift({ path: r.path, label: `${r.shortLabel} Hub`, gameId: r.gameId });
    }
  }
  return order.map((cluster) => ({ cluster, links: groups.get(cluster) || [] }));
}

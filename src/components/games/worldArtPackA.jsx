import React from 'react';

/**
 * WORLD_STRIP_PACK_A & WORLD_ART_PACK_A
 * Original procedural vector scenery (strict CSP: zero inline style props, zero external URLs, zero style-tag injection).
 * Covers: gta-6, cod-warzone, fortnite, minecraft, ea-fc-27.
 */

export const WORLD_STRIP_PACK_A = {
  'gta-6': {
    leftLabel: 'LAUNCH DAY · LIVE',
    centerTicks: '212 GB BASE · PATCH 1.002.001 · OUT NOW',
    rightReadout: 'NOV 19 · LIVE',
  },
  'cod-warzone': {
    leftLabel: 'NIGHT OPS · RADAR',
    centerTicks: '240° SW ··· W 270° ··· 300° NW',
    rightReadout: '300 HP · 3-PLATE',
  },
  fortnite: {
    leftLabel: 'STORM-VERSE · XP',
    centerTicks: 'CH6 PACE · DAILY 60K · UEFN CAP',
    rightReadout: 'TIER 200',
  },
  minecraft: {
    leftLabel: '8:1 NETHER · GRID',
    centerTicks: 'FLOOR(X/8) · Y-LOCKED · 128-BLOCK LINK',
    rightReadout: '2-THROW SOLVER',
  },
  'ea-fc-27': {
    leftLabel: 'STADIUM · FUT LAB',
    centerTicks: '5% EA TAX · SNAPPED STEP · 11-SLOT SBC',
    rightReadout: '+90 OVR SBC',
  },
};

function Gta6ViceDuskArt({ theme }) {
  const isPaper = theme === 'paper';
  const rimStroke = isPaper ? '#9D174D' : '#F472B6';
  const silhouette = isPaper ? '#2B123F' : '#110924';
  const bridgeDark = isPaper ? '#3B1D54' : '#160C30';
  const bayRim = isPaper ? '#0E7490' : '#38BDF8';
  const horizonGlow = isPaper ? '#FDE68A' : '#FB923C';

  return (
    <div className="gw-art-stage" data-art-game="gta-6" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-gta6-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isPaper ? '#312E81' : '#130D36'} />
            <stop offset="42%" stopColor={isPaper ? '#9D174D' : '#831843'} />
            <stop offset="76%" stopColor="#E8308C" />
            <stop offset="100%" stopColor="#E88C30" />
          </linearGradient>
          <linearGradient id="gw-gta6-sun" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="48%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#E8308C" />
          </linearGradient>
          <linearGradient id="gw-gta6-bay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isPaper ? '#4C1D95' : '#2E1065'} />
            <stop offset="45%" stopColor={isPaper ? '#1E1B4B' : '#120A33'} />
            <stop offset="100%" stopColor={isPaper ? '#0F172A' : '#080518'} />
          </linearGradient>
          <radialGradient id="gw-gta6-halo" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#E8308C" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0C0916" stopOpacity="0" />
          </radialGradient>
          <clipPath id="gw-gta6-sun-clip">
            <rect x="190" y="42" width="140" height="58" />
            <rect x="190" y="104" width="140" height="10" />
            <rect x="190" y="118" width="140" height="8" />
            <rect x="190" y="130" width="140" height="6" />
            <rect x="190" y="140" width="140" height="5" />
          </clipPath>
          <clipPath id="gw-gta6-frame-clip">
            <rect x="6" y="6" width="508" height="248" rx="18" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-gta6-frame-clip)">
          {/* Sky Dome */}
          <rect x="6" y="6" width="508" height="150" fill="url(#gw-gta6-sky)" />
          <ellipse cx="260" cy="116" rx="165" ry="96" fill="url(#gw-gta6-halo)" />

          {/* Dusk Grid Lines on Upper Sky */}
          <path
            d="M 18 34 H 502 M 18 64 H 502 M 18 94 H 502"
            stroke="#FDE68A"
            strokeOpacity="0.14"
            strokeWidth="1"
          />

          {/* Sliced Synthwave Sun Disc */}
          <circle
            cx="260"
            cy="112"
            r="60"
            fill="url(#gw-gta6-sun)"
            clipPath="url(#gw-gta6-sun-clip)"
          />

          {/* Distant Art-Deco Bay Skyline */}
          <path
            d="M 96 154 V 132 H 112 V 122 H 124 V 154 H 134 V 116 H 152 V 136 H 164 V 126 H 180 V 154 H 336 V 128 H 352 V 110 H 368 V 136 H 382 V 118 H 400 V 138 H 416 V 124 H 428 V 154 Z"
            fill={silhouette}
            opacity="0.88"
          />
          {/* Tiny Skyline Neon Windows */}
          <g fill={bayRim} opacity="0.72">
            <rect x="138" y="122" width="3" height="6" rx="1" />
            <rect x="144" y="122" width="3" height="6" rx="1" />
            <rect x="357" y="116" width="4" height="5" rx="1" />
            <rect x="387" y="124" width="4" height="5" rx="1" />
          </g>
          <g fill="#F472B6" opacity="0.78">
            <rect x="116" y="128" width="4" height="4" rx="1" />
            <rect x="169" y="132" width="4" height="5" rx="1" />
            <rect x="341" y="134" width="4" height="5" rx="1" />
          </g>

          {/* Horizon Glow Seam */}
          <rect x="6" y="152" width="508" height="3" fill={horizonGlow} opacity="0.8" />

          {/* Shimmering Bay Water */}
          <rect x="6" y="154" width="508" height="100" fill="url(#gw-gta6-bay)" />

          {/* Neon Bay Reflections (Magenta + Cyan) */}
          <g className="gw-anim-pulse">
            <rect x="202" y="164" width="116" height="4" rx="2" fill="#FDE047" opacity="0.78" />
            <rect x="214" y="175" width="92" height="3.5" rx="1.75" fill="#F472B6" opacity="0.8" />
            <rect x="188" y="187" width="144" height="3" rx="1.5" fill="#38BDF8" opacity="0.62" />
            <rect x="220" y="199" width="80" height="3.5" rx="1.75" fill="#E8308C" opacity="0.75" />
            <rect x="196" y="212" width="128" height="2.5" rx="1.25" fill="#38BDF8" opacity="0.55" />
            <rect x="232" y="226" width="56" height="3" rx="1.5" fill="#F59E0B" opacity="0.65" />
            <rect x="176" y="239" width="168" height="2.5" rx="1.25" fill="#F472B6" opacity="0.45" />
          </g>

          {/* Causeway Bridge Deck + Perspective Arches */}
          <path
            d="M 6 168 H 514 V 178 H 482 Q 464 178 464 194 H 442 Q 442 178 418 178 H 394 Q 372 178 372 194 H 348 Q 348 178 322 178 H 200 Q 174 178 174 194 H 150 Q 150 178 126 178 H 102 Q 80 178 80 194 H 56 Q 56 178 36 178 H 6 Z"
            fill={bridgeDark}
          />
          <line x1="6" y1="168" x2="514" y2="168" stroke="#38BDF8" strokeOpacity="0.6" strokeWidth="1.5" />

          {/* Highway Tail-Light Streaks Along Causeway */}
          <g className="gw-anim-shimmer">
            <rect x="36" y="170" width="52" height="2.5" rx="1.25" fill="#FF5964" />
            <rect x="148" y="171" width="70" height="2" rx="1" fill="#FDE047" />
            <rect x="284" y="170" width="64" height="2.5" rx="1.25" fill="#38BDF8" />
            <rect x="398" y="171" width="76" height="2" rx="1" fill="#FF5964" />
          </g>

          {/* Left Foreground Palm Trunk & Curved Fronds */}
          <path
            d="M 52 254 C 58 205 68 158 84 110 L 92 112 C 79 160 72 206 67 254 Z"
            fill={silhouette}
          />
          <g fill={silhouette}>
            <path d="M 88 112 C 62 92 34 94 14 114 C 38 106 62 108 86 116 Z" />
            <path d="M 88 111 C 54 108 26 122 12 146 C 34 128 58 120 86 116 Z" />
            <path d="M 89 110 C 76 74 52 54 26 48 C 54 62 72 84 85 112 Z" />
            <path d="M 90 110 C 98 76 120 56 148 52 C 122 66 102 86 92 112 Z" />
            <path d="M 90 112 C 118 92 146 96 168 116 C 142 108 118 108 92 116 Z" />
            <path d="M 89 114 C 114 118 134 134 144 156 C 128 138 110 124 89 118 Z" />
          </g>

          {/* Right Foreground Palm Trunk & Curved Fronds */}
          <path
            d="M 468 254 C 460 202 448 154 430 102 L 422 104 C 436 156 446 204 453 254 Z"
            fill={silhouette}
          />
          <g fill={silhouette}>
            <path d="M 426 104 C 452 84 480 86 502 106 C 478 98 452 100 428 108 Z" />
            <path d="M 426 103 C 460 102 488 118 504 142 C 482 124 456 114 428 108 Z" />
            <path d="M 425 102 C 438 66 462 46 488 40 C 460 54 442 76 429 104 Z" />
            <path d="M 424 102 C 414 68 392 48 364 44 C 390 58 410 78 422 104 Z" />
            <path d="M 424 104 C 396 86 368 90 346 110 C 372 102 396 102 422 108 Z" />
            <path d="M 425 106 C 400 112 380 128 370 150 C 386 132 404 118 425 110 Z" />
          </g>

          {/* Subtle Corner HUD Telemetry */}
          <g fontFamily="ui-monospace, monospace" fontSize="9.5" fontWeight="700">
            <rect x="20" y="18" width="188" height="20" rx="10" fill="#120829" fillOpacity="0.72" stroke={rimStroke} strokeOpacity="0.65" />
            <text x="31" y="31.5" fill="#FDE68A" letterSpacing="0.8">VICE BAY · LAUNCH LIVE</text>
          </g>
        </g>

        <rect
          x="6"
          y="6"
          width="508"
          height="248"
          rx="18"
          fill="none"
          stroke={rimStroke}
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

function CodWarzoneRadarArt({ theme }) {
  const isPaper = theme === 'paper';
  const bgA = isPaper ? '#EAE6DA' : '#080C0A';
  const bgB = isPaper ? '#DFDAC8' : '#101813';
  const gridCol = isPaper ? '#166534' : '#22C55E';
  const inkCol = isPaper ? '#14532D' : '#86EFAC';
  const crimson = isPaper ? '#9F1239' : '#F43F5E';
  const amber = isPaper ? '#92400E' : '#F59E0B';
  const cyan = isPaper ? '#075985' : '#38BDF8';
  const cardFill = isPaper ? '#F7F5EE' : '#0E1511';

  return (
    <div className="gw-art-stage" data-art-game="cod-warzone" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-cod-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={bgA} />
            <stop offset="100%" stopColor={bgB} />
          </linearGradient>
          <radialGradient id="gw-cod-radar" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gridCol} stopOpacity={isPaper ? '0.16' : '0.24'} />
            <stop offset="75%" stopColor={gridCol} stopOpacity="0.06" />
            <stop offset="100%" stopColor={gridCol} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="gw-cod-sweep" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gridCol} stopOpacity="0.45" />
            <stop offset="100%" stopColor={gridCol} stopOpacity="0" />
          </linearGradient>
          <clipPath id="gw-cod-scope-clip">
            <rect x="6" y="6" width="508" height="248" rx="4" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-cod-scope-clip)">
          <rect x="6" y="6" width="508" height="248" fill="url(#gw-cod-bg)" />

          {/* Top Compass Bearing Strip */}
          <rect x="14" y="14" width="492" height="24" fill={cardFill} fillOpacity="0.85" stroke={gridCol} strokeOpacity="0.35" />
          <path
            d="M 40 34 V 38 M 80 32 V 38 M 120 34 V 38 M 160 32 V 38 M 200 34 V 38 M 240 32 V 38 M 280 34 V 38 M 320 32 V 38 M 360 34 V 38 M 400 32 V 38 M 440 34 V 38 M 480 32 V 38"
            stroke={inkCol}
            strokeOpacity="0.55"
            strokeWidth="1.2"
          />
          <g fontFamily="ui-monospace, monospace" fontSize="9.5" fontWeight="700" fill={inkCol}>
            <text x="68" y="28">240° SW</text>
            <text x="228" y="28">W 270°</text>
            <text x="386" y="28">300° NW</text>
          </g>
          <polygon points="260,38 256,44 264,44" fill={crimson} />

          {/* Left Topographic UAV Radar Circle */}
          <circle cx="152" cy="148" r="88" fill="url(#gw-cod-radar)" />
          <g fill="none" stroke={gridCol} strokeOpacity={isPaper ? '0.32' : '0.26'} strokeWidth="1">
            {/* Elevation Topo Loops */}
            <path d="M 96 132 C 110 100 175 94 202 122 C 224 146 210 198 164 204 C 122 210 82 170 96 132 Z" />
            <path d="M 116 138 C 126 118 166 114 184 134 C 198 150 186 180 156 184 C 130 188 106 162 116 138 Z" />
            <path d="M 76 146 C 84 96 148 72 198 92 C 236 108 242 178 200 212 C 154 242 66 206 76 146 Z" strokeDasharray="3 4" />
            {/* Range Circles + Axes */}
            <circle cx="152" cy="148" r="82" strokeOpacity="0.45" />
            <circle cx="152" cy="148" r="54" strokeDasharray="4 4" />
            <circle cx="152" cy="148" r="27" />
            <line x1="64" y1="148" x2="240" y2="148" strokeOpacity="0.35" />
            <line x1="152" y1="60" x2="152" y2="236" strokeOpacity="0.35" />
          </g>

          {/* Sweeping UAV Radar Wedge */}
          <path
            d="M 152 148 L 210 90 A 82 82 0 0 1 234 148 Z"
            fill="url(#gw-cod-sweep)"
            className="gw-anim-pulse"
          />

          {/* Hostile Pings & Laser Scope Reticle */}
          <g transform="translate(184, 114)">
            <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="none" stroke={crimson} strokeWidth="1.6" />
            <circle cx="0" cy="0" r="2.2" fill={crimson} />
          </g>
          <circle cx="122" cy="176" r="3" fill={amber} />
          <circle cx="196" cy="166" r="2.5" fill={cyan} />
          {/* Center Reticle */}
          <path
            d="M 138 148 H 146 M 158 148 H 166 M 152 134 V 142 M 152 154 V 162"
            stroke={crimson}
            strokeWidth="1.8"
          />

          {/* Right Panel: 3-Plate Armor Stack (300 HP) */}
          <rect x="268" y="54" width="234" height="58" fill={cardFill} stroke={gridCol} strokeOpacity="0.45" />
          <g fontFamily="ui-monospace, monospace" fontSize="10" fontWeight="700">
            <text x="280" y="72" fill={inkCol}>ARMOR PLATES · 300 HP MAX</text>
            <text x="444" y="72" fill={crimson}>3-PLATE</text>
          </g>
          <rect x="280" y="82" width="66" height="16" rx="2" fill={cyan} fillOpacity="0.9" />
          <rect x="352" y="82" width="66" height="16" rx="2" fill={cyan} fillOpacity="0.9" />
          <rect x="424" y="82" width="66" height="16" rx="2" fill={cyan} fillOpacity="0.9" />

          {/* Right Bottom Panel: Dual-Weapon TTK Oscilloscope */}
          <rect x="268" y="122" width="234" height="120" fill={cardFill} stroke={gridCol} strokeOpacity="0.45" />
          <g fontFamily="ui-monospace, monospace" fontSize="9.5" fontWeight="700">
            <text x="280" y="139" fill={inkCol}>TTK WAVEFORM SCOPE (MS)</text>
            <text x="438" y="139" fill={amber}>+50ms OB</text>
          </g>
          {/* Oscilloscope Grid */}
          <path
            d="M 280 156 H 490 M 280 180 H 490 M 280 204 H 490 M 332 148 V 222 M 385 148 V 222 M 438 148 V 222"
            stroke={gridCol}
            strokeOpacity="0.2"
            strokeWidth="1"
          />
          {/* Weapon A Waveform (Stepped Fast TTK) */}
          <path
            d="M 282 214 H 302 V 196 H 332 V 178 H 362 V 162 H 490"
            fill="none"
            stroke={crimson}
            strokeWidth="2.4"
          />
          {/* Weapon B Waveform (Delayed Open-Bolt) */}
          <path
            d="M 282 220 H 324 V 202 H 358 V 184 H 396 V 168 H 490"
            fill="none"
            stroke={cyan}
            strokeWidth="2.2"
            strokeDasharray="6 3"
          />
          <g fontFamily="ui-monospace, monospace" fontSize="8.5" fontWeight="700">
            <text x="282" y="234" fill={crimson}>WEP-A 490ms</text>
            <text x="382" y="234" fill={cyan}>WEP-B 615ms</text>
          </g>

          {/* L-Bracket Targeting Corner Mounts */}
          <path
            d="M 14 58 V 46 H 26 M 494 46 H 506 V 58 M 14 236 V 248 H 26 M 494 248 H 506 V 236"
            fill="none"
            stroke={inkCol}
            strokeWidth="2"
          />
        </g>

        <rect x="6" y="6" width="508" height="248" rx="4" fill="none" stroke={gridCol} strokeOpacity="0.5" />
      </svg>
    </div>
  );
}

function FortniteStormVerseArt({ theme }) {
  const isPaper = theme === 'paper';
  const skyTop = isPaper ? '#DBEAFE' : '#1E1042';
  const skyBot = isPaper ? '#93C5FD' : '#0F0B1F';
  const stormFillA = isPaper ? '#A78BFA' : '#4C1D95';
  const stormFillB = isPaper ? '#8B5CF6' : '#2E1065';
  const slurp = isPaper ? '#0284C7' : '#38BDF8';
  const mythic = isPaper ? '#CA8A04' : '#FACC15';
  const terrainA = isPaper ? '#1E3A8A' : '#1A143A';
  const terrainB = isPaper ? '#312E81' : '#110D28';

  return (
    <div className="gw-art-stage" data-art-game="fortnite" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-fn-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={skyTop} />
            <stop offset="100%" stopColor={skyBot} />
          </linearGradient>
          <radialGradient id="gw-fn-vortex" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.92" />
            <stop offset="45%" stopColor={slurp} stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="gw-fn-pillar-gold" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={mythic} stopOpacity="0.88" />
            <stop offset="100%" stopColor={mythic} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gw-fn-pillar-blue" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={slurp} stopOpacity="0.85" />
            <stop offset="100%" stopColor={slurp} stopOpacity="0" />
          </linearGradient>
          <clipPath id="gw-fn-storm-clip">
            <rect x="6" y="6" width="508" height="248" rx="16" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-fn-storm-clip)">
          <rect x="6" y="6" width="508" height="248" fill="url(#gw-fn-sky)" />

          {/* Swirling Violet Storm-Eye Cloud Banks */}
          <path
            d="M 6 6 H 210 C 178 46 140 62 96 84 C 66 98 34 102 6 94 Z"
            fill={stormFillA}
            opacity={isPaper ? '0.35' : '0.72'}
          />
          <path
            d="M 514 6 H 314 C 350 48 394 64 432 86 C 464 104 492 106 514 96 Z"
            fill={stormFillB}
            opacity={isPaper ? '0.38' : '0.82'}
          />

          {/* Concentric Slurp-Cyan Storm Vortex Core */}
          <circle cx="260" cy="116" r="108" fill="url(#gw-fn-vortex)" />
          <g fill="none" stroke="#67E8F9" className="gw-anim-pulse">
            <circle cx="260" cy="116" r="78" strokeWidth="2.5" strokeDasharray="24 14 10 14" strokeOpacity="0.72" />
            <circle cx="260" cy="116" r="56" strokeWidth="2" strokeDasharray="16 10" strokeOpacity="0.85" />
            <circle cx="260" cy="116" r="34" strokeWidth="3" strokeOpacity="0.9" />
          </g>

          {/* Upward Rarity Light Pillars (Mythic Gold + Rare Blue) */}
          <polygon points="104,220 124,220 142,18 86,18" fill="url(#gw-fn-pillar-blue)" />
          <polygon points="392,226 416,226 436,14 372,14" fill="url(#gw-fn-pillar-gold)" />

          {/* Floating Supply Crate & Parachute Glider */}
          <g className="gw-anim-float">
            {/* Canopy Arch */}
            <path
              d="M 214 62 Q 260 28 306 62 Q 282 54 260 62 Q 238 54 214 62 Z"
              fill={slurp}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <line x1="220" y1="61" x2="246" y2="96" stroke="#E2E8F0" strokeWidth="1.2" />
            <line x1="260" y1="62" x2="260" y2="94" stroke="#E2E8F0" strokeWidth="1.2" />
            <line x1="300" y1="61" x2="274" y2="96" stroke="#E2E8F0" strokeWidth="1.2" />
            {/* Crate Body */}
            <polygon points="242,96 278,96 278,132 242,132" fill="#0284C7" stroke="#E0F2FE" strokeWidth="2" />
            <polygon points="242,110 278,110 278,118 242,118" fill={mythic} />
            <line x1="260" y1="96" x2="260" y2="132" stroke="#E0F2FE" strokeWidth="2" />
          </g>

          {/* Skewed Ridge Terrain Silhouette */}
          <polygon points="6,254 6,214 96,192 184,218 274,196 364,220 452,188 514,208 514,254" fill={terrainA} />
          <polygon points="6,254 134,222 252,240 378,214 514,234 514,254" fill={terrainB} />

          {/* Arcade Star Sparks */}
          <g fill={mythic}>
            <polygon points="168,78 172,88 182,92 172,96 168,106 164,96 154,92 164,88" />
            <polygon points="348,86 351,93 358,96 351,99 348,106 345,99 338,96 345,93" />
          </g>
          <polygon points="74,146 77,153 84,156 77,159 74,166 71,159 64,156 71,153" fill="#67E8F9" />

          {/* Skewed XP Telemetry Pill */}
          <g transform="translate(22, 20) skewX(-8)">
            <rect x="0" y="0" width="128" height="22" fill={mythic} />
            <text
              x="10"
              y="14.5"
              fontFamily="system-ui, sans-serif"
              fontSize="10"
              fontWeight="900"
              fill="#0F172A"
            >
              60K DAILY + UEFN
            </text>
          </g>
        </g>

        <rect x="6" y="6" width="508" height="248" rx="16" fill="none" stroke={slurp} strokeOpacity="0.65" strokeWidth="2" />
      </svg>
    </div>
  );
}

function isoCube(cx, cy, s, topFill, leftFill, rightFill, stroke) {
  const w = s * 0.866;
  const h = s * 0.5;
  const topPts = `${cx},${cy - s} ${cx + w},${cy - h} ${cx},${cy} ${cx - w},${cy - h}`;
  const leftPts = `${cx - w},${cy - h} ${cx},${cy} ${cx},${cy + s} ${cx - w},${cy + h}`;
  const rightPts = `${cx},${cy} ${cx + w},${cy - h} ${cx + w},${cy + h} ${cx},${cy + s}`;
  return (
    <g>
      <polygon points={topPts} fill={topFill} stroke={stroke} strokeWidth="1" />
      <polygon points={leftPts} fill={leftFill} stroke={stroke} strokeWidth="1" />
      <polygon points={rightPts} fill={rightFill} stroke={stroke} strokeWidth="1" />
    </g>
  );
}

function MinecraftVoxelPortalArt({ theme }) {
  const isPaper = theme === 'paper';
  const skyA = isPaper ? '#DFE6D8' : '#09100C';
  const skyB = isPaper ? '#CDD8C5' : '#131D17';
  const gridStroke = isPaper ? '#84A07C' : '#22C55E';
  const strokeVoxel = isPaper ? '#1E2920' : '#090F0B';

  const islandBlocks = [];
  const s = 18;
  // Build deterministic back-to-front 5x4 isometric grass+dirt voxel baseplate
  for (let gx = 0; gx < 5; gx += 1) {
    for (let gz = 0; gz < 4; gz += 1) {
      const cx = 248 + (gx - gz) * (s * 0.866);
      const cy = 148 + (gx + gz) * (s * 0.5);
      // Lower dirt/stone foundation
      if (gx === 4 || gz === 3 || gx === 0 || gz === 0) {
        islandBlocks.push(
          <g key={`d-${gx}-${gz}`}>
            {isoCube(cx, cy + s, s, '#78523A', '#5C3D28', '#462D1D', strokeVoxel)}
          </g>
        );
      }
      // Top emerald grass block
      islandBlocks.push(
        <g key={`g-${gx}-${gz}`}>
          {isoCube(cx, cy, s, '#22C55E', '#15803D', '#166534', strokeVoxel)}
        </g>
      );
    }
  }

  // 4x4 Isometric Obsidian Nether Portal Frame rising above middle row (gz = 1, gx = 1..3)
  const portalBlocks = [];
  const pOriginX = 248 + (1 - 1) * (s * 0.866);
  const pOriginY = 148 + (1 + 1) * (s * 0.5) - s;
  const colDx = s * 0.866;
  const colDy = s * 0.5;
  const obsTop = '#3B265E';
  const obsLeft = '#24153E';
  const obsRight = '#160B28';

  // Bottom sill blocks (gx 0..3)
  for (let i = 0; i < 4; i += 1) {
    const bx = pOriginX + i * colDx;
    const by = pOriginY + i * colDy;
    portalBlocks.push(
      <g key={`pb-${i}`}>{isoCube(bx, by, s, obsTop, obsLeft, obsRight, '#6D28D9')}</g>
    );
  }
  // Left and Right vertical obsidian pillars (levels 1..3)
  for (let lvl = 1; lvl <= 3; lvl += 1) {
    const lx = pOriginX;
    const ly = pOriginY - lvl * s;
    const rx = pOriginX + 3 * colDx;
    const ry = pOriginY + 3 * colDy - lvl * s;
    portalBlocks.push(
      <g key={`pl-${lvl}`}>{isoCube(lx, ly, s, obsTop, obsLeft, obsRight, '#6D28D9')}</g>,
      <g key={`pr-${lvl}`}>{isoCube(rx, ry, s, obsTop, obsLeft, obsRight, '#6D28D9')}</g>
    );
  }
  // Top lintel blocks (level 4)
  for (let i = 0; i < 4; i += 1) {
    const tx = pOriginX + i * colDx;
    const ty = pOriginY + i * colDy - 4 * s;
    portalBlocks.push(
      <g key={`pt-${i}`}>{isoCube(tx, ty, s, obsTop, obsLeft, obsRight, '#7C3AED')}</g>
    );
  }

  // Portal interior quad coordinates spanning inner columns i=1..2
  const innerX0 = pOriginX + 0.5 * colDx;
  const innerY0 = pOriginY + 0.5 * colDy - 3.5 * s;
  const innerX1 = pOriginX + 2.5 * colDx;
  const innerY1 = pOriginY + 2.5 * colDy - 3.5 * s;
  const innerPoly = `${innerX0},${innerY0} ${innerX1},${innerY1} ${innerX1},${innerY1 + 3 * s} ${innerX0},${innerY0 + 3 * s}`;

  return (
    <div className="gw-art-stage" data-art-game="minecraft" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-mc-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={skyA} />
            <stop offset="100%" stopColor={skyB} />
          </linearGradient>
          <pattern id="gw-mc-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 H 0 V 20" fill="none" stroke={gridStroke} strokeOpacity={isPaper ? '0.28' : '0.16'} strokeWidth="1" />
          </pattern>
          <linearGradient id="gw-mc-portal-inner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" stopOpacity="0.92" />
            <stop offset="52%" stopColor="#9333EA" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="gw-mc-glow" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="4" y="4" width="512" height="252" fill="url(#gw-mc-sky)" />
        <rect x="4" y="4" width="512" height="252" fill="url(#gw-mc-grid)" />
        <ellipse cx="272" cy="116" rx="130" ry="88" fill="url(#gw-mc-glow)" />

        {/* Isometric Island Platform */}
        {islandBlocks}

        {/* Glowing Violet Portal Curtain */}
        <polygon points={innerPoly} fill="url(#gw-mc-portal-inner)" className="gw-anim-pulse" />

        {/* Isometric Voxel Portal Frame */}
        {portalBlocks}

        {/* Drifting Square Pixel Particles */}
        <g className="gw-anim-float">
          <rect x="192" y="76" width="6" height="6" fill="#C084FC" />
          <rect x="206" y="102" width="4" height="4" fill="#E879F9" />
          <rect x="330" y="68" width="6" height="6" fill="#A855F7" />
          <rect x="346" y="112" width="5" height="5" fill="#34D399" />
          <rect x="176" y="138" width="5" height="5" fill="#34D399" />
          <rect x="358" y="88" width="4" height="4" fill="#F472B6" />
        </g>

        {/* Chiseled Pixel Readout Tag */}
        <rect x="18" y="18" width="134" height="22" fill={isPaper ? '#14532D' : '#10B981'} />
        <text
          x="27"
          y="33"
          fontFamily="ui-monospace, monospace"
          fontSize="10"
          fontWeight="800"
          fill={isPaper ? '#FFFFFF' : '#052E16'}
        >
          8:1 FLOOR(-20)=-3
        </text>

        {/* 0px Pixel Frame Border */}
        <rect x="4" y="4" width="512" height="252" fill="none" stroke={gridStroke} strokeOpacity="0.65" strokeWidth="2" />
      </svg>
    </div>
  );
}

function EaFc27StadiumArt({ theme }) {
  const isPaper = theme === 'paper';
  const skyA = isPaper ? '#E2EDE5' : '#06120B';
  const skyB = isPaper ? '#CFE2D5' : '#0B1E13';
  const chalk = isPaper ? '#065F46' : '#ECFDF5';
  const goldAccent = isPaper ? '#92400E' : '#FACC15';
  const shieldFill = isPaper ? '#F7FBF8' : '#0F2418';

  return (
    <div className="gw-art-stage" data-art-game="ea-fc-27" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-fc-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={skyA} />
            <stop offset="100%" stopColor={skyB} />
          </linearGradient>
          <linearGradient id="gw-fc-beam-l" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity={isPaper ? '0.28' : '0.32'} />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gw-fc-beam-r" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34D399" stopOpacity={isPaper ? '0.25' : '0.3'} />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gw-fc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <clipPath id="gw-fc-shield-clip">
            <rect x="6" y="6" width="508" height="248" rx="14" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-fc-shield-clip)">
          <rect x="6" y="6" width="508" height="248" fill="url(#gw-fc-sky)" />

          {/* Twin Stadium Floodlight Towers + Crossing Beams */}
          <polygon points="34,26 78,26 300,220 118,220" fill="url(#gw-fc-beam-l)" />
          <polygon points="442,26 486,26 402,220 220,220" fill="url(#gw-fc-beam-r)" />
          {/* Tower Lamp Clusters */}
          <g fill="#FEF9C3" opacity="0.9">
            <rect x="36" y="18" width="40" height="12" rx="2" fill="#1E293B" />
            <circle cx="44" cy="24" r="2.2" />
            <circle cx="52" cy="24" r="2.2" />
            <circle cx="60" cy="24" r="2.2" />
            <circle cx="68" cy="24" r="2.2" />
            <rect x="444" y="18" width="40" height="12" rx="2" fill="#1E293B" />
            <circle cx="452" cy="24" r="2.2" />
            <circle cx="460" cy="24" r="2.2" />
            <circle cx="468" cy="24" r="2.2" />
            <circle cx="476" cy="24" r="2.2" />
          </g>

          {/* Perspective Emerald Mowed Turf Pitch */}
          <polygon points="6,154 514,154 514,254 6,254" fill={isPaper ? '#86EFAC' : '#0F3822'} />
          <rect x="6" y="168" width="508" height="18" fill={isPaper ? '#4ADE80' : '#14532D'} opacity="0.72" />
          <rect x="6" y="204" width="508" height="20" fill={isPaper ? '#4ADE80' : '#14532D'} opacity="0.72" />
          <rect x="6" y="240" width="508" height="14" fill={isPaper ? '#4ADE80' : '#14532D'} opacity="0.72" />

          {/* Chalk Lines & Perspective Center Circle / Box */}
          <g fill="none" stroke={chalk} strokeOpacity={isPaper ? '0.55' : '0.45'} strokeWidth="1.8">
            <line x1="6" y1="154" x2="514" y2="154" />
            <line x1="260" y1="154" x2="260" y2="254" />
            <ellipse cx="260" cy="204" rx="68" ry="24" />
            <polygon points="154,154 366,154 398,186 122,186" />
          </g>

          {/* Glowing Chemistry Pass Vectors Connecting Side Nodes */}
          <g stroke="url(#gw-fc-gold)" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.85">
            <line x1="126" y1="118" x2="260" y2="108" />
            <line x1="394" y1="118" x2="260" y2="108" />
          </g>
          <g className="gw-anim-pulse">
            <circle cx="126" cy="118" r="14" fill={shieldFill} stroke="#22C55E" strokeWidth="2.2" />
            <text x="116" y="121.5" fontFamily="ui-monospace, monospace" fontSize="9.5" fontWeight="800" fill={chalk}>88</text>
            <circle cx="394" cy="118" r="14" fill={shieldFill} stroke="#22C55E" strokeWidth="2.2" />
            <text x="384" y="121.5" fontFamily="ui-monospace, monospace" fontSize="9.5" fontWeight="800" fill={chalk}>89</text>
          </g>

          {/* Gold-Foil Hexagonal Rating Shield Frame */}
          <g className="gw-anim-float">
            <polygon
              points="260,36 312,60 304,132 260,162 216,132 208,60"
              fill={shieldFill}
              stroke="url(#gw-fc-gold)"
              strokeWidth="3.5"
            />
            <polygon
              points="260,46 301,65 294,126 260,150 226,126 219,65"
              fill="none"
              stroke={goldAccent}
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
            <text
              x="234"
              y="98"
              fontFamily="ui-monospace, monospace"
              fontSize="26"
              fontWeight="900"
              fill={goldAccent}
            >
              +90
            </text>
            <text
              x="229"
              y="118"
              fontFamily="ui-monospace, monospace"
              fontSize="9.5"
              fontWeight="800"
              fill={chalk}
              letterSpacing="1.2"
            >
              SBC · 5% TAX
            </text>
          </g>
        </g>

        <rect x="6" y="6" width="508" height="248" rx="14" fill="none" stroke={goldAccent} strokeOpacity="0.5" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export const WORLD_ART_PACK_A = {
  'gta-6': Gta6ViceDuskArt,
  'cod-warzone': CodWarzoneRadarArt,
  fortnite: FortniteStormVerseArt,
  minecraft: MinecraftVoxelPortalArt,
  'ea-fc-27': EaFc27StadiumArt,
};

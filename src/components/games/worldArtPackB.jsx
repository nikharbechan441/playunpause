import React from 'react';

const DEG = Math.PI / 180;

function polar(cx, cy, r, deg) {
  const rad = deg * DEG;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function ringSectorPath(cx, cy, rInner, rOuter, startDeg, endDeg) {
  const [x1, y1] = polar(cx, cy, rOuter, startDeg);
  const [x2, y2] = polar(cx, cy, rOuter, endDeg);
  const [x3, y3] = polar(cx, cy, rInner, endDeg);
  const [x4, y4] = polar(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    `L ${x3.toFixed(1)} ${y3.toFixed(1)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4.toFixed(1)} ${y4.toFixed(1)}`,
    'Z',
  ].join(' ');
}

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const [x, y] = polar(cx, cy, r, i * 60);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function isoPoint(ox, oy, ix, iy, iz, dx = 22, dy = 11, dz = 22) {
  return [ox + (ix - iy) * dx, oy + (ix + iy) * dy - iz * dz];
}

function polyStr(pts) {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function IsoBrick({ ox, oy, ix, iy, iz, w = 1, d = 1, h = 0.92, top, left, right, stroke, studs = true }) {
  const p = (x, y, z) => isoPoint(ox, oy, x, y, z);
  const topPts = [p(ix, iy, iz + h), p(ix + w, iy, iz + h), p(ix + w, iy + d, iz + h), p(ix, iy + d, iz + h)];
  const leftPts = [p(ix, iy + d, iz + h), p(ix + w, iy + d, iz + h), p(ix + w, iy + d, iz), p(ix, iy + d, iz)];
  const rightPts = [p(ix + w, iy, iz + h), p(ix + w, iy + d, iz + h), p(ix + w, iy + d, iz), p(ix + w, iy, iz)];

  const studCenters = [];
  if (studs) {
    for (let sx = 0; sx < w; sx += 1) {
      for (let sy = 0; sy < d; sy += 1) {
        studCenters.push(p(ix + sx + 0.5, iy + sy + 0.5, iz + h));
      }
    }
  }

  return (
    <g>
      <polygon points={polyStr(leftPts)} fill={left} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <polygon points={polyStr(rightPts)} fill={right} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <polygon points={polyStr(topPts)} fill={top} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      {studCenters.map(([cx, cy], idx) => (
        <g key={idx}>
          <ellipse cx={cx} cy={cy - 1} rx="6.2" ry="3.2" fill={left} stroke={stroke} strokeWidth="0.7" />
          <rect x={cx - 6.2} y={cy - 4.4} width="12.4" height="3.4" fill={left} />
          <ellipse cx={cx} cy={cy - 4.4} rx="6.2" ry="3.2" fill={top} stroke={stroke} strokeWidth="0.7" />
        </g>
      ))}
    </g>
  );
}

/* 1. ROBLOX — Isometric 3D Studded Brick Workshop */
function RobloxArtSvg({ theme }) {
  const isPaper = theme === 'paper';
  const ink = isPaper ? '#141926' : '#f5f7fc';
  const muted = isPaper ? '#4338ca' : '#a5b4fc';
  const panelFill = isPaper ? '#e6eaf0' : '#161926';
  const panelStroke = isPaper ? 'rgba(67,56,202,0.28)' : 'rgba(156,167,255,0.26)';
  const baseTop = isPaper ? '#dbe3f4' : '#23283d';
  const baseLeft = isPaper ? '#bcc7e0' : '#181c2c';
  const baseRight = isPaper ? '#9fb0d4' : '#121522';
  const brickStroke = isPaper ? 'rgba(15,23,42,0.22)' : 'rgba(8,10,18,0.6)';

  const ox = 236;
  const oy = 148;
  const studSpots = [];
  for (let gx = 0; gx < 4; gx += 1) {
    for (let gy = 0; gy < 4; gy += 1) {
      studSpots.push(isoPoint(ox, oy, gx + 0.5, gy + 0.5, 0));
    }
  }

  return (
    <div className="gw-art-stage" data-art-game="roblox" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-rbx-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isPaper ? '#eef2fb' : '#141728'} />
            <stop offset="100%" stopColor={isPaper ? '#e0e7f5' : '#0f111c'} />
          </linearGradient>
          <radialGradient id="gw-rbx-glow" cx="46%" cy="54%" r="50%">
            <stop offset="0%" stopColor={isPaper ? 'rgba(67,56,202,0.16)' : 'rgba(129,140,248,0.28)'} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <clipPath id="gw-rbx-clip">
            <rect x="4" y="4" width="512" height="252" rx="10" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-rbx-clip)">
          <rect x="4" y="4" width="512" height="252" rx="10" fill="url(#gw-rbx-bg)" stroke={panelStroke} strokeWidth="1.5" />
          <rect x="4" y="4" width="512" height="252" fill="url(#gw-rbx-glow)" />

          {/* Studio CAD axis guides */}
          <g stroke={isPaper ? 'rgba(67,56,202,0.1)' : 'rgba(156,167,255,0.1)'} strokeWidth="1">
            <line x1="20" y1="52" x2="500" y2="52" />
            <line x1="20" y1="220" x2="500" y2="220" />
            <line x1="78" y1="18" x2="78" y2="246" strokeDasharray="3 4" />
            <line x1="418" y1="18" x2="418" y2="246" strokeDasharray="3 4" />
          </g>

          {/* Isometric molded 4x4 studio baseplate */}
          <IsoBrick
            ox={ox}
            oy={oy}
            ix={0}
            iy={0}
            iz={-0.36}
            w={4}
            d={4}
            h={0.36}
            top={baseTop}
            left={baseLeft}
            right={baseRight}
            stroke={brickStroke}
            studs={false}
          />
          {studSpots.map(([sx, sy], i) => (
            <ellipse
              key={i}
              cx={sx}
              cy={sy}
              rx="4.8"
              ry="2.4"
              fill={isPaper ? '#c7d2ea' : '#2e3552'}
              stroke={isPaper ? 'rgba(67,56,202,0.22)' : 'rgba(156,167,255,0.2)'}
              strokeWidth="0.7"
            />
          ))}

          {/* Stacked isometric 3-face studded blocks */}
          <IsoBrick
            ox={ox}
            oy={oy}
            ix={1}
            iy={0.8}
            iz={0}
            w={1}
            d={1}
            h={0.95}
            top="#fb7185"
            left="#e11d48"
            right="#9f1239"
            stroke={brickStroke}
          />
          <IsoBrick
            ox={ox}
            oy={oy}
            ix={1}
            iy={1.9}
            iz={0}
            w={2}
            d={1}
            h={0.95}
            top="#60a5fa"
            left="#2563eb"
            right="#1e40af"
            stroke={brickStroke}
          />
          <IsoBrick
            ox={ox}
            oy={oy}
            ix={2}
            iy={0.8}
            iz={0}
            w={1}
            d={1}
            h={0.95}
            top="#34d399"
            left="#059669"
            right="#065f46"
            stroke={brickStroke}
          />
          <IsoBrick
            ox={ox}
            oy={oy}
            ix={1.4}
            iy={1.35}
            iz={0.95}
            w={1}
            d={1}
            h={0.95}
            top="#fbbf24"
            left="#d97706"
            right="#92400e"
            stroke={brickStroke}
          />

          {/* Levitating studio indigo block */}
          <g className="gw-float-slow">
            <IsoBrick
              ox={ox}
              oy={oy}
              ix={0.25}
              iy={2.35}
              iz={1.4}
              w={1}
              d={1}
              h={0.82}
              top="#a5b4fc"
              left="#6366f1"
              right="#4338ca"
              stroke={brickStroke}
            />
          </g>

          {/* Floating Creator Payout Token 1 */}
          <g className="gw-float-alt">
            <rect x="26" y="70" width="112" height="50" rx="8" fill={panelFill} stroke={panelStroke} strokeWidth="1.2" />
            <circle cx="48" cy="95" r="12" fill={isPaper ? '#4338ca' : '#818cf8'} />
            <text x="48" y="99" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="800" fill={isPaper ? '#ffffff' : '#0b1020'}>
              R$
            </text>
            <text x="68" y="91" fontFamily="Space Grotesk, sans-serif" fontSize="11" fontWeight="700" fill={ink}>
              70% NET
            </text>
            <text x="68" y="106" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="600" fill={muted}>
              30% MKT CUT
            </text>
          </g>

          {/* Floating Creator Payout Token 2 */}
          <g className="gw-float-slow">
            <rect x="372" y="148" width="126" height="54" rx="8" fill={panelFill} stroke={panelStroke} strokeWidth="1.2" />
            <text x="386" y="169" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill={muted}>
              DEVEX MINIMUM
            </text>
            <text x="386" y="188" fontFamily="JetBrains Mono, monospace" fontSize="13" fontWeight="800" fill={ink}>
              30K → $114
            </text>
          </g>

          {/* Header corner stamp */}
          <text x="26" y="34" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill={muted} letterSpacing="1.5">
            ISO BRICK // CREATOR PAYOUT LEDGER
          </text>
        </g>
      </svg>
    </div>
  );
}

/* 2. CS2 — Source-2 Radial Buy Wheel & Premier Chassis */
function Cs2ArtSvg({ theme }) {
  const isPaper = theme === 'paper';
  const ink = isPaper ? '#101722' : '#f3f6fb';
  const muted = isPaper ? '#4c5b70' : '#97a4b8';
  const brass = isPaper ? '#92400e' : '#f59e0b';
  const brassFill = isPaper ? 'rgba(146,64,14,0.16)' : 'rgba(245,158,11,0.22)';
  const wedgeFill = isPaper ? '#e2e7ee' : '#182130';
  const wedgeStroke = isPaper ? 'rgba(16,23,34,0.18)' : 'rgba(198,208,223,0.18)';
  const cyan = isPaper ? '#075985' : '#38bdf8';

  const cx = 176;
  const cy = 136;
  const sectors = [
    { label: 'RIFLES', start: -124, end: -56, active: true },
    { label: 'GEAR', start: -52, end: 16, active: false },
    { label: 'UTIL', start: 20, end: 88, active: false },
    { label: 'PISTOLS', start: 92, end: 160, active: false },
    { label: 'MID-TIER', start: 164, end: 232, active: false },
  ];

  const ladder = [
    { h: 24, val: '$1.4K', active: false },
    { h: 38, val: '$1.9K', active: false },
    { h: 52, val: '$2.4K', active: false },
    { h: 66, val: '$2.9K', active: true },
    { h: 80, val: '$3.4K', active: false },
  ];

  return (
    <div className="gw-art-stage" data-art-game="cs2" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-cs2-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isPaper ? '#edf1f7' : '#111722'} />
            <stop offset="100%" stopColor={isPaper ? '#e2e8f0' : '#0b0f17'} />
          </linearGradient>
          <radialGradient id="gw-cs2-smoke" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isPaper ? 'rgba(7,89,133,0.14)' : 'rgba(56,189,248,0.18)'} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <clipPath id="gw-cs2-clip">
            <rect x="4" y="4" width="512" height="252" rx="4" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-cs2-clip)">
          <rect x="4" y="4" width="512" height="252" rx="4" fill="url(#gw-cs2-bg)" stroke={wedgeStroke} strokeWidth="1.5" />
          {/* 4px left brass bar mirroring industrial buy-menu card */}
          <rect x="4" y="4" width="5" height="252" fill={brass} />

          {/* Volumetric smoke circles behind ladder */}
          <g className="gw-float-alt">
            <circle cx="408" cy="96" r="64" fill="url(#gw-cs2-smoke)" />
            <circle cx="458" cy="146" r="48" fill="url(#gw-cs2-smoke)" />
          </g>

          {/* Outer precision rotating caliper ring */}
          <g transform={`translate(${cx}, ${cy})`}>
            <circle className="gw-spin-slow" cx="0" cy="0" r="102" fill="none" stroke={cyan} strokeWidth="1.2" strokeDasharray="14 8 4 8" opacity="0.65" />
          </g>

          {/* 5-Sector Radial Buy Wheel */}
          {sectors.map((s) => {
            const mid = (s.start + s.end) / 2;
            const [lx, ly] = polar(cx, cy, 69, mid);
            return (
              <g key={s.label}>
                <path
                  d={ringSectorPath(cx, cy, 43, 94, s.start, s.end)}
                  fill={s.active ? brassFill : wedgeFill}
                  stroke={s.active ? brass : wedgeStroke}
                  strokeWidth={s.active ? '1.8' : '1'}
                />
                <text
                  x={lx}
                  y={ly + 3}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="8.2"
                  fontWeight="800"
                  fill={s.active ? brass : ink}
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          {/* Digital Bank Core */}
          <circle cx={cx} cy={cy} r="36" fill={isPaper ? '#ffffff' : '#0c1017'} stroke={brass} strokeWidth="1.5" />
          <text x={cx} y={cy - 3} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13.5" fontWeight="800" fill={ink}>
            $16K
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5" fontWeight="700" fill={brass}>
            FULL BUY
          </text>

          {/* Right side: MR12 5-step Loss Bonus Ladder */}
          <rect x="306" y="28" width="190" height="204" rx="4" fill={isPaper ? 'rgba(255,255,255,0.72)' : 'rgba(12,16,23,0.72)'} stroke={wedgeStroke} strokeWidth="1" />
          <text x="320" y="48" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill={cyan} letterSpacing="1">
            MR12 LOSS BONUS LADDER
          </text>

          {ladder.map((step, i) => {
            const bx = 322 + i * 33;
            const by = 186 - step.h;
            return (
              <g key={step.val}>
                <rect
                  x={bx}
                  y={by}
                  width="24"
                  height={step.h}
                  rx="2"
                  fill={step.active ? brass : isPaper ? '#cbd5e1' : '#243044'}
                  stroke={step.active ? ink : 'none'}
                  strokeWidth="1"
                />
                <text
                  x={bx + 12}
                  y="202"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="7.8"
                  fontWeight="700"
                  fill={step.active ? brass : muted}
                >
                  {step.val}
                </text>
              </g>
            );
          })}

          <text x="320" y="220" fontFamily="JetBrains Mono, monospace" fontSize="8.5" fontWeight="700" fill={muted}>
            CT $5.1K · T $4.7K · +$800 PLANT
          </text>
        </g>
      </svg>
    </div>
  );
}

/* 3. VALORANT — Neo-Brutalist Protocol Poster & 45-Deg Polygon Grid */
function ValorantArtSvg({ theme }) {
  const isPaper = theme === 'paper';
  const bgA = isPaper ? '#ece8e1' : '#0f1923';
  const bgB = isPaper ? '#e0dbd2' : '#182534';
  const ink = isPaper ? '#0f1923' : '#f8f7f4';
  const crimson = isPaper ? '#b91c3a' : '#ff4655';
  const teal = isPaper ? '#0f766e' : '#2dd4bf';
  const gridLine = isPaper ? 'rgba(15,25,35,0.09)' : 'rgba(248,247,244,0.08)';

  return (
    <div className="gw-art-stage" data-art-game="valorant" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-val-crystal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={crimson} />
            <stop offset="100%" stopColor={teal} />
          </linearGradient>
          <clipPath id="gw-val-clip">
            <polygon points="0,0 504,0 520,16 520,260 16,260 0,244" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-val-clip)">
          <rect x="0" y="0" width="520" height="260" fill={bgA} />
          {/* Asymmetric Neo-Brutalist color-blocked planes */}
          <polygon points="0,0 286,0 214,260 0,260" fill={bgB} />
          <polygon points="286,0 326,0 254,260 214,260" fill={crimson} opacity={isPaper ? '0.92' : '0.88'} />
          <polygon points="440,0 520,0 520,118 390,118" fill={isPaper ? 'rgba(15,25,35,0.07)' : 'rgba(255,255,255,0.04)'} />

          {/* 45-degree geometric protocol grid */}
          <g stroke={gridLine} strokeWidth="1">
            <line x1="-20" y1="220" x2="220" y2="-20" />
            <line x1="60" y1="260" x2="340" y2="-20" />
            <line x1="160" y1="260" x2="440" y2="-20" />
            <line x1="260" y1="260" x2="540" y2="-20" />
            <line x1="160" y1="-20" x2="440" y2="260" />
          </g>

          {/* Oversized outlined geometric stencil // 08 */}
          <text
            x="24"
            y="148"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="74"
            fontWeight="800"
            fill="none"
            stroke={ink}
            strokeWidth="1.5"
            opacity="0.24"
          >
            // 08
          </text>

          {/* Left poster callout blocks */}
          <rect x="24" y="28" width="144" height="26" fill={ink} />
          <text x="34" y="45" fontFamily="JetBrains Mono, monospace" fontSize="10.5" fontWeight="800" fill={bgA} letterSpacing="1.2">
            PROTOCOL // ECON
          </text>
          <text x="24" y="198" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="800" fill={ink}>
            MIN FLOOR: 3,900 CR
          </text>
          <text x="24" y="216" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill={crimson}>
            LOSS +1,900 → +2,900
          </text>

          {/* Diamond tactical reticle */}
          <g transform="translate(388, 134)">
            <rect x="-70" y="-70" width="140" height="140" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.32" transform="rotate(45)" />
            <rect className="gw-pulse-soft" x="-52" y="-52" width="104" height="104" fill="none" stroke={crimson} strokeWidth="1.6" transform="rotate(45)" />
            <line x1="-92" y1="0" x2="92" y2="0" stroke={ink} strokeWidth="1" opacity="0.35" strokeDasharray="6 6" />
            <line x1="0" y1="-92" x2="0" y2="92" stroke={ink} strokeWidth="1" opacity="0.35" strokeDasharray="6 6" />

            {/* Crystal wireframe polyhedron */}
            <g className="gw-float-slow">
              <polygon points="0,-54 34,-12 20,48 -20,48 -34,-12" fill="url(#gw-val-crystal)" opacity="0.88" stroke={ink} strokeWidth="1.5" />
              <polyline points="0,-54 0,48" fill="none" stroke={ink} strokeWidth="1.1" opacity="0.7" />
              <polyline points="-34,-12 34,-12" fill="none" stroke={ink} strokeWidth="1.1" opacity="0.7" />
              <polyline points="-34,-12 0,14 34,-12" fill="none" stroke={isPaper ? '#ffffff' : '#f8f7f4'} strokeWidth="1.2" opacity="0.85" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* 4. APEX LEGENDS — Frontier Dropship & 3-Shard Heirloom Prism */
function ApexArtSvg({ theme }) {
  const isPaper = theme === 'paper';
  const bgA = isPaper ? '#f4ede8' : '#160f0f';
  const bgB = isPaper ? '#e7ddd6' : '#0f0a0a';
  const ink = isPaper ? '#1d1413' : '#fcf6f4';
  const accent = isPaper ? '#991b1b' : '#fb923c';
  const crimson = isPaper ? '#b91c1c' : '#ef4444';
  const hexStroke = isPaper ? 'rgba(153,27,27,0.16)' : 'rgba(251,146,60,0.18)';

  const hexCells = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const cx = 64 + col * 62 + (row % 2 ? 31 : 0);
      const cy = 44 + row * 46;
      hexCells.push({ cx, cy, hot: (row === 1 || row === 2) && col >= 2 && col <= 4 });
    }
  }

  return (
    <div className="gw-art-stage" data-art-game="apex-legends" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-apex-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={bgA} />
            <stop offset="100%" stopColor={bgB} />
          </linearGradient>
          <radialGradient id="gw-apex-glow" cx="52%" cy="46%" r="48%">
            <stop offset="0%" stopColor={isPaper ? 'rgba(185,28,28,0.18)' : 'rgba(251,146,60,0.34)'} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="gw-apex-shard-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="45%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="gw-apex-shard-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <clipPath id="gw-apex-clip">
            <rect x="4" y="4" width="512" height="252" rx="6" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-apex-clip)">
          <rect x="4" y="4" width="512" height="252" rx="6" fill="url(#gw-apex-bg)" stroke={hexStroke} strokeWidth="1.5" />
          <rect x="4" y="4" width="512" height="252" fill="url(#gw-apex-glow)" />

          {/* Hex Evo-shield honeycomb lattice */}
          {hexCells.map((h, i) => (
            <polygon
              key={i}
              points={hexPoints(h.cx, h.cy, 24)}
              fill={h.hot ? (isPaper ? 'rgba(153,27,27,0.06)' : 'rgba(251,146,60,0.07)') : 'none'}
              stroke={h.hot ? accent : hexStroke}
              strokeWidth={h.hot ? '1.3' : '0.9'}
              opacity={h.hot ? '0.65' : '0.45'}
            />
          ))}

          {/* Angled caution chevron stripes */}
          <g fill={crimson} opacity="0.82">
            {[0, 1, 2, 3].map((i) => (
              <polygon key={i} points={`${388 + i * 24},14 ${402 + i * 24},14 ${390 + i * 24},26 ${376 + i * 24},26`} />
            ))}
          </g>

          {/* Left shard */}
          <g transform="translate(174, 118) rotate(-14)">
            <g className="gw-float-slow">
              <polygon points="0,-42 18,4 0,44 -18,4" fill="url(#gw-apex-shard-a)" stroke={ink} strokeWidth="1.2" />
              <polygon points="0,-42 18,4 0,44" fill="url(#gw-apex-shard-b)" opacity="0.55" />
            </g>
          </g>

          {/* Right shard */}
          <g transform="translate(346, 118) rotate(14)">
            <g className="gw-float-alt">
              <polygon points="0,-42 18,4 0,44 -18,4" fill="url(#gw-apex-shard-a)" stroke={ink} strokeWidth="1.2" />
              <polygon points="0,-42 18,4 0,44" fill="url(#gw-apex-shard-b)" opacity="0.55" />
            </g>
          </g>

          {/* Center Hero Shard */}
          <g transform="translate(260, 108)">
            <g className="gw-float-slow">
              <polygon points="0,-66 26,-6 14,62 0,74 -14,62 -26,-6" fill="url(#gw-apex-shard-a)" stroke={ink} strokeWidth="1.5" />
              <polygon points="0,-66 26,-6 14,62 0,74" fill="url(#gw-apex-shard-b)" opacity="0.58" />
              <line x1="-18" y1="-4" x2="0" y2="-16" stroke="#fef3c7" strokeWidth="1.3" opacity="0.9" />
              <line x1="0" y1="-16" x2="18" y2="-4" stroke="#fef3c7" strokeWidth="1.3" opacity="0.9" />
            </g>
          </g>

          {/* Electric vector energy arcs crackling between shards */}
          <g className="gw-pulse-soft" fill="none" stroke={isPaper ? '#b91c1c' : '#fde68a'} strokeWidth="1.6" strokeLinecap="round">
            <polyline points="190,104 212,92 222,102 242,88" />
            <polyline points="278,90 296,104 308,92 330,106" />
            <polyline points="196,144 224,132 238,142" stroke={accent} />
          </g>

          {/* Frontier Dropship vector silhouette at bottom horizon */}
          <g transform="translate(260, 212)" fill={isPaper ? '#4a3735' : '#261d1d'} stroke={accent} strokeWidth="1.3">
            <polygon points="-74,10 -44,-8 44,-8 74,10 52,18 -52,18" />
            <polygon points="-24,-8 0,-18 24,-8" fill={crimson} />
          </g>

          <text x="22" y="32" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="800" fill={accent} letterSpacing="1.2">
            500-PACK PITY // 150 HEIRLOOM SHARDS
          </text>
          <text x="22" y="238" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill={ink}>
            EVO CORE + RANKED RP ENTRY TRACKER
          </text>
        </g>
      </svg>
    </div>
  );
}

/* 5. GTA V — Kosatka Submarine Phosphor Sonar & Recon Scope */
function GtaVArtSvg({ theme }) {
  const isPaper = theme === 'paper';
  const bgA = isPaper ? '#e8f4f1' : '#05110f';
  const bgB = isPaper ? '#d9ece8' : '#091c19';
  const ink = isPaper ? '#0c211d' : '#ecfcf8';
  const sonar = isPaper ? '#0f766e' : '#2ce5b5';
  const sonarSoft = isPaper ? 'rgba(15,118,110,0.22)' : 'rgba(44,229,181,0.24)';
  const ringStroke = isPaper ? 'rgba(15,118,110,0.34)' : 'rgba(44,229,181,0.34)';

  const cx = 186;
  const cy = 132;
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = i * 15;
    const major = i % 3 === 0;
    const [x1, y1] = polar(cx, cy, major ? 88 : 93, a);
    const [x2, y2] = polar(cx, cy, 98, a);
    return { x1, y1, x2, y2, major };
  });

  return (
    <div className="gw-art-stage" data-art-game="gta-v" aria-hidden="true">
      <svg className="gw-hero-svg" viewBox="0 0 520 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="gw-gtav-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={bgA} />
            <stop offset="100%" stopColor={bgB} />
          </linearGradient>
          <linearGradient id="gw-gtav-beam" x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0%" stopColor={sonar} stopOpacity="0.45" />
            <stop offset="100%" stopColor={sonar} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="gw-gtav-clip">
            <rect x="4" y="4" width="512" height="252" rx="6" />
          </clipPath>
        </defs>

        <g clipPath="url(#gw-gtav-clip)">
          <rect x="4" y="4" width="512" height="252" rx="6" fill="url(#gw-gtav-bg)" stroke={ringStroke} strokeWidth="1.5" />

          {/* Hydrographic gridlines */}
          <g stroke={isPaper ? 'rgba(15,118,110,0.09)' : 'rgba(44,229,181,0.08)'} strokeWidth="1">
            <line x1="20" y1="70" x2="500" y2="70" />
            <line x1="20" y1="132" x2="500" y2="132" />
            <line x1="20" y1="194" x2="500" y2="194" />
            <line x1="186" y1="16" x2="186" y2="248" />
          </g>

          {/* Concentric 360-deg sonar rings & degree ticks */}
          <circle cx={cx} cy={cy} r="98" fill={isPaper ? 'rgba(255,255,255,0.45)' : 'rgba(4,15,13,0.65)'} stroke={sonar} strokeWidth="1.4" />
          <circle cx={cx} cy={cy} r="66" fill="none" stroke={ringStroke} strokeWidth="1" strokeDasharray="4 4" />
          <circle cx={cx} cy={cy} r="34" fill="none" stroke={ringStroke} strokeWidth="1" />

          {ticks.map((t, idx) => (
            <line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={sonar}
              strokeWidth={t.major ? '1.6' : '0.9'}
              opacity={t.major ? '0.9' : '0.5'}
            />
          ))}

          {/* Island Archipelago bathymetry contours inside sonar */}
          <path
            d="M 142,118 Q 160,92 198,96 Q 230,100 232,126 Q 222,162 184,166 Q 154,160 142,118 Z"
            fill={sonarSoft}
            stroke={sonar}
            strokeWidth="1.2"
          />
          <path
            d="M 160,122 Q 178,108 202,112 Q 214,126 196,146 Q 170,150 160,122 Z"
            fill="none"
            stroke={sonar}
            strokeWidth="1"
            opacity="0.7"
          />

          {/* Sweeping phosphor radar sector pivoting around 0,0 */}
          <g transform={`translate(${cx}, ${cy})`}>
            <g className="gw-sonar-sweep">
              <path d="M 0,0 L 0,-96 A 96 96 0 0 1 82,-50 Z" fill="url(#gw-gtav-beam)" />
              <line x1="0" y1="0" x2="0" y2="-96" stroke={sonar} strokeWidth="1.8" />
            </g>
          </g>

          {/* Pulsing [ + ] Target Brackets */}
          <g className="gw-pulse-soft" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="800" fill={isPaper ? '#9f1239' : '#fbbf24'}>
            <text x="179" y="129" textAnchor="middle">[ + ]</text>
            <text x="148" y="152" textAnchor="middle">[+]</text>
          </g>

          {/* Right side Kosatka Recon Telemetry Readouts */}
          <rect x="312" y="28" width="186" height="204" rx="5" fill={isPaper ? 'rgba(255,255,255,0.78)' : 'rgba(6,19,17,0.82)'} stroke={ringStroke} strokeWidth="1" />
          <text x="326" y="48" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill={sonar} letterSpacing="1">
            SONAR // RECON DECK
          </text>
          <text x="326" y="76" fontFamily="JetBrains Mono, monospace" fontSize="15" fontWeight="800" fill={ink}>
            PINK DIAMOND
          </text>
          <text x="326" y="95" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill={sonar}>
            BAG: 2× GOLD · 100% CAP
          </text>

          {/* Signal strength bars */}
          <text x="326" y="132" fontFamily="JetBrains Mono, monospace" fontSize="8.8" fontWeight="700" fill={ink}>
            SIGNAL LOCK: 98%
          </text>
          {[0, 1, 2, 3, 4, 5, 6].map((b) => (
            <rect
              key={b}
              x={326 + b * 20}
              y={142 + (6 - b) * 3}
              width="14"
              height={32 - (6 - b) * 3}
              rx="1.5"
              fill={b < 6 ? sonar : ringStroke}
            />
          ))}

          <text x="326" y="200" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill={ink}>
            MIN CREW FLOOR: 15%
          </text>
          <text x="326" y="218" fontFamily="JetBrains Mono, monospace" fontSize="8.5" fontWeight="700" fill={sonar}>
            FENCING FEE: -10% · +2% ELITE
          </text>
        </g>
      </svg>
    </div>
  );
}

export const WORLD_ART_PACK_B = {
  roblox: RobloxArtSvg,
  cs2: Cs2ArtSvg,
  valorant: ValorantArtSvg,
  'apex-legends': ApexArtSvg,
  'gta-v': GtaVArtSvg,
};

export const WORLD_STRIP_PACK_B = {
  roblox: {
    leftLabel: 'STUDIO DECK // 30K DEVEX',
    centerTicks: 'BASEPLATE 16×16 · 70% CREATOR · 30% CUT',
    rightReadout: '$0.0038 / R$',
  },
  cs2: {
    leftLabel: 'PREMIER // MR12 ECONOMY',
    centerTicks: 'PISTOLS · MID · RIFLES · GEAR · UTIL',
    rightReadout: 'CAP $16,000',
  },
  valorant: {
    leftLabel: 'PROTOCOL BUY // MATRIX',
    centerTicks: '3,900 FLOOR · +1,900 LOSS · +3,000 WIN',
    rightReadout: 'ECON READY',
  },
  'apex-legends': {
    leftLabel: 'OUTLANDS // 500-PACK PITY',
    centerTicks: 'APEX PACKS · EVO MATRIX · RP FLOOR',
    rightReadout: '150 SHARDS',
  },
  'gta-v': {
    leftLabel: 'KOSATKA SONAR // RECON',
    centerTicks: 'DEPTH 142M · 360° SCAN · BAG SOLVER',
    rightReadout: 'CREW >= 15%',
  },
};

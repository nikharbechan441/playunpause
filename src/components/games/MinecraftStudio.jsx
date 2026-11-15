import React from 'react';
import { Box, Compass, Copy, Check, TriangleAlert } from 'lucide-react';
import { clampNum, parseSafeNum } from '../../utils/gameMath.js';
import {
  AnimatedValue,
  SegmentedSpringTabs,
  SpotlightPanel,
} from '../../utils/motionPrimitives.jsx';
import { NumericField, PinButton } from './GameStudioDock.jsx';

export default function MinecraftStudio({
  game,
  soundEnabled,
  playTick,
  onPinSnapshot,
  copyText,
  copiedKey,
  mcDir,
  setMcDir,
  mcX,
  setMcX,
  mcY,
  setMcY,
  mcZ,
  setMcZ,
  portalBX,
  setPortalBX,
  portalBY,
  setPortalBY,
  portalBZ,
  setPortalBZ,
  throw1X,
  setThrow1X,
  throw1Z,
  setThrow1Z,
  throw1Deg,
  setThrow1Deg,
  throw2X,
  setThrow2X,
  throw2Z,
  setThrow2Z,
  throw2Deg,
  setThrow2Deg,
  mcResult,
  mcCollision,
  strongholdResult,
  mcTab,
  setMcTab,
}) {
  // Portal search radar projection (centered on Portal A Overworld X/Z)
  const owAX = mcDir === 'toNether' ? mcResult.input.x : mcResult.output.x;
  const owAZ = mcDir === 'toNether' ? mcResult.input.z : mcResult.output.z;
  const owBX = clampNum(parseSafeNum(portalBX, 45), -30000000, 30000000);
  const owBZ = clampNum(parseSafeNum(portalBZ, 980), -30000000, 30000000);
  const deltaX = owBX - owAX;
  const deltaZ = owBZ - owAZ;
  const maxSpan = Math.max(200, Math.abs(deltaX) * 1.35, Math.abs(deltaZ) * 1.35);
  const toRadarX = (dx) => 110 + (dx / maxSpan) * 86;
  const toRadarY = (dz) => 110 + (dz / maxSpan) * 86;
  const radiusBoxHalf = (128 / maxSpan) * 86;

  // Vertical Y-altitude column marker (-64 .. 320)
  const curY = mcResult.output.y;
  const yPct = Math.min(100, Math.max(0, ((curY + 64) / 384) * 100));

  // Stronghold SVG projection
  const t1x = clampNum(parseSafeNum(throw1X, 0), -30000000, 30000000);
  const t1z = clampNum(parseSafeNum(throw1Z, 0), -30000000, 30000000);
  const t1d = (clampNum(parseSafeNum(throw1Deg, -45), -3600, 3600) * Math.PI) / 180;
  const t2x = clampNum(parseSafeNum(throw2X, 200), -30000000, 30000000);
  const t2z = clampNum(parseSafeNum(throw2Z, 0), -30000000, 30000000);
  const t2d = (clampNum(parseSafeNum(throw2Deg, 45), -3600, 3600) * Math.PI) / 180;

  const shPts = [{ x: t1x, z: t1z }, { x: t2x, z: t2z }];
  if (strongholdResult.valid) {
    shPts.push({ x: strongholdResult.x, z: strongholdResult.z });
  }
  const minX = Math.min(...shPts.map((p) => p.x));
  const maxX = Math.max(...shPts.map((p) => p.x));
  const minZ = Math.min(...shPts.map((p) => p.z));
  const maxZ = Math.max(...shPts.map((p) => p.z));
  const span = Math.max(260, maxX - minX, maxZ - minZ) * 1.3;
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  const mapShX = (wx) => 120 + ((wx - midX) / span) * 164;
  const mapShZ = (wz) => 98 + ((wz - midZ) / span) * 124;
  const rayLen = span * 0.55;
  const r1x = t1x + -Math.sin(t1d) * rayLen;
  const r1z = t1z + Math.cos(t1d) * rayLen;
  const r2x = t2x + -Math.sin(t2d) * rayLen;
  const r2z = t2z + Math.cos(t2d) * rayLen;

  return (
    <div className="gs-studio-stack gs-mc-cartography">
      {/* MANDATORY MOJANG NON-AFFILIATION NOTICE */}
      <div className="gs-mc-mojang-banner" role="note">
        <TriangleAlert size={15} aria-hidden="true" />
        <span>
          <strong>NOT AN OFFICIAL MINECRAFT PRODUCT.</strong> NOT APPROVED BY OR ASSOCIATED WITH
          MOJANG OR MICROSOFT.
        </span>
      </div>

      {/* CARTROGRAPHY WORKBENCH HEADER */}
      <SpotlightPanel className="gs-hero-instrument gs-mc-banner">
        <div className="gs-cod-top-row">
          <div className="gs-studio-identity">
            <span className="gs-kicker-badge">
              <Box size={13} aria-hidden="true" />
              <span>VOXEL CARTOGRAPHY &amp; DIMENSION ATLAS</span>
            </span>
            <h2 className="gs-bench-heading">
              {mcTab === 'portals'
                ? '8:1 Nether Portal & 128-Block Linker'
                : '2-Throw Eye of Ender Triangulator'}
            </h2>
          </div>

          <SegmentedSpringTabs
            ariaLabel="Minecraft Tool Modes"
            value={mcTab}
            onChange={(next) => {
              playTick?.(soundEnabled, 680);
              setMcTab(next);
            }}
            options={[
              { id: 'portals', label: 'Nether Portals', icon: Box },
              { id: 'stronghold', label: 'Stronghold Eyes', icon: Compass },
            ]}
          />
        </div>

        {/* Dimension Output Coordinate Display */}
        <div className="gs-mc-coord-hero">
          <div>
            <span className="mono gs-micro-label">
              {mcTab === 'stronghold'
                ? 'TRIANGULATED END PORTAL TARGET'
                : mcDir === 'toNether'
                  ? 'BUILD PAIRED NETHER PORTAL AT (FLOOR ÷ 8)'
                  : 'OVERWORLD EMERGENCE TARGET (× 8)'}
            </span>
            <div className="gs-mc-xyz-readout mono" aria-live="polite">
              {mcTab === 'stronghold' ? (
                strongholdResult.valid ? (
                  <>
                    OW <AnimatedValue value={strongholdResult.x} /> /{' '}
                    <AnimatedValue value={strongholdResult.z} />{' '}
                    <span className="gs-mc-nether-sub">
                      (Nether {strongholdResult.netherX}, {strongholdResult.netherZ})
                    </span>
                  </>
                ) : (
                  <span className="gs-mc-warn-inline">{strongholdResult.reason}</span>
                )
              ) : (
                <>
                  <span>
                    X <AnimatedValue value={mcResult.output.x} />
                  </span>
                  <span>
                    Y <AnimatedValue value={mcResult.output.y} />
                  </span>
                  <span>
                    Z <AnimatedValue value={mcResult.output.z} />
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="gs-pill-cluster">
            {mcTab === 'portals' && (
              <button
                type="button"
                className="secondary-key-btn"
                onClick={() =>
                  copyText(
                    `${mcResult.output.x} ${mcResult.output.y} ${mcResult.output.z}`,
                    'mc-coords'
                  )
                }
              >
                {copiedKey === 'mc-coords' ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
                <span>{copiedKey === 'mc-coords' ? 'Copied' : 'Copy XYZ'}</span>
              </button>
            )}
            <PinButton
              label={mcTab === 'portals' ? 'Pin Portal' : 'Pin Stronghold'}
              onClick={() =>
                mcTab === 'portals'
                  ? onPinSnapshot(
                      `${mcDir === 'toNether' ? 'OW→Nether' : 'Nether→OW'}`,
                      `X:${mcResult.output.x} Y:${mcResult.output.y} Z:${mcResult.output.z}`
                    )
                  : onPinSnapshot(
                      'Stronghold Target',
                      strongholdResult.valid
                        ? `OW X:${strongholdResult.x} Z:${strongholdResult.z} (Nether ${strongholdResult.netherX}, ${strongholdResult.netherZ})`
                        : strongholdResult.reason
                    )
              }
            />
          </div>
        </div>
      </SpotlightPanel>

      {mcTab === 'portals' ? (
        <div className="gs-mc-atlas-grid">
          {/* LEFT: COORDINATES + ALTITUDE STRIP + 16x16 CHUNK CELL */}
          <SpotlightPanel className="gs-work-card">
            <div className="filter-row">
              <button
                type="button"
                aria-pressed={mcDir === 'toNether'}
                className={`filter-pill ${mcDir === 'toNether' ? 'active' : ''}`}
                onClick={() => {
                  playTick?.(soundEnabled, 700);
                  setMcDir('toNether');
                }}
              >
                Overworld → Nether (÷ 8 floor)
              </button>
              <button
                type="button"
                aria-pressed={mcDir === 'toOverworld'}
                className={`filter-pill ${mcDir === 'toOverworld' ? 'active' : ''}`}
                onClick={() => {
                  playTick?.(soundEnabled, 700);
                  setMcDir('toOverworld');
                }}
              >
                Nether → Overworld (× 8)
              </button>
            </div>

            <div className="mg-field-grid">
              <div className="mg-field">
                <label htmlFor="mc-x">X Coordinate</label>
                <NumericField
                  id="mc-x"
                  min={-30000000}
                  max={30000000}
                  fallback={0}
                  emptyFallback={0}
                  className="deck-input no-icon mono"
                  value={mcX}
                  onCommit={setMcX}
                />
              </div>
              <div className="mg-field">
                <label htmlFor="mc-y">Y Altitude (-64..320)</label>
                <NumericField
                  id="mc-y"
                  min={-64}
                  max={320}
                  fallback={64}
                  emptyFallback={64}
                  className="deck-input no-icon mono"
                  value={mcY}
                  onCommit={setMcY}
                />
              </div>
              <div className="mg-field">
                <label htmlFor="mc-z">Z Coordinate</label>
                <NumericField
                  id="mc-z"
                  min={-30000000}
                  max={30000000}
                  fallback={0}
                  emptyFallback={0}
                  className="deck-input no-icon mono"
                  value={mcZ}
                  onCommit={setMcZ}
                />
              </div>
            </div>

            {/* Y-Level Dimension Safety Gauge */}
            <div className="gs-mc-y-gauge">
              <div className="gs-mc-y-labels mono">
                <span>Y=-64 Bedrock</span>
                <span>Lava Sea Y=31</span>
                <span>Safe Build Y=32–118</span>
                <span>Roof Y=128</span>
              </div>
              <div className="gs-mc-y-track" aria-hidden="true">
                <span className="gs-mc-y-lava" />
                <span className="gs-mc-y-safe" />
                <span className="gs-mc-y-roof" />
                <span className="gs-mc-y-marker" style={{ left: `${yPct}%` }} />
              </div>
              <div className="gs-mc-y-note mono">
                Y={curY}: {mcResult.netherYWarning}
              </div>
            </div>

            {/* Intra-Chunk 16x16 Visualizer + Region Metadata */}
            <div className="gs-mc-chunk-row">
              <div className="gs-mc-chunk-map" aria-hidden="true">
                <span
                  className="gs-mc-chunk-dot"
                  style={{
                    left: `${((mcResult.chunk.lx + 0.5) / 16) * 100}%`,
                    top: `${((mcResult.chunk.lz + 0.5) / 16) * 100}%`,
                  }}
                />
              </div>
              <div className="gs-mc-chunk-stats">
                <div className="mg-stat-mini">
                  <span>Chunk Coordinates</span>
                  <strong>
                    {mcResult.chunk.cx}, {mcResult.chunk.cz} (Local {mcResult.chunk.lx},{' '}
                    {mcResult.chunk.lz})
                  </strong>
                </div>
                <div className="mg-stat-mini">
                  <span>Anvil Region File · Obsidian</span>
                  <strong>
                    r.{mcResult.chunk.rx}.{mcResult.chunk.rz}.mca · 10 min / 14 corners
                  </strong>
                </div>
              </div>
            </div>
          </SpotlightPanel>

          {/* RIGHT: LIVE 2D PORTAL COLLISION RADAR */}
          <SpotlightPanel className="gs-work-card gs-mc-radar-card">
            <div className="gs-card-topbar">
              <h3 className="mg-subcard-title">2nd-Portal 128-Block Search Radar</h3>
              <span
                className={`district-pill mono ${mcCollision.conflictRisk ? 'gs-err-pill' : 'gs-ok-pill'}`}
              >
                {mcCollision.conflictRisk ? 'LINK CONFLICT RISK' : 'CLEAR SEPARATION'}
              </span>
            </div>

            <div className="gs-mc-radar-wrap">
              <svg
                viewBox="0 0 220 220"
                className="gs-mc-radar-svg"
                role="img"
                aria-label="2D Overworld 128-block portal search radius map comparing Portal A and Portal B"
              >
                <defs>
                  <pattern id="mcGrid" width="22" height="22" patternUnits="userSpaceOnUse">
                    <path
                      d="M 22 0 L 0 0 0 22"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="220" height="220" rx="14" fill="url(#mcGrid)" />
                {/* 128-block Overworld search boundary box around Portal A */}
                <rect
                  x={110 - radiusBoxHalf}
                  y={110 - radiusBoxHalf}
                  width={radiusBoxHalf * 2}
                  height={radiusBoxHalf * 2}
                  rx="6"
                  fill={mcCollision.conflictRisk ? 'rgba(244,63,94,0.13)' : 'rgba(16,185,129,0.12)'}
                  stroke={mcCollision.conflictRisk ? '#F43F5E' : '#10B981'}
                  strokeDasharray="5 4"
                  strokeWidth="1.8"
                />
                <line
                  x1="110"
                  y1="110"
                  x2={toRadarX(deltaX)}
                  y2={toRadarY(deltaZ)}
                  stroke="currentColor"
                  strokeOpacity="0.45"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
                {/* Portal A */}
                <circle cx="110" cy="110" r="6" fill="#A855F7" stroke="var(--bg-canvas)" strokeWidth="2" />
                <text x="118" y="106" fontSize="9.5" fontWeight="700" fill="currentColor">
                  Portal A
                </text>
                {/* Portal B */}
                <circle
                  cx={toRadarX(deltaX)}
                  cy={toRadarY(deltaZ)}
                  r="6"
                  fill={mcCollision.conflictRisk ? '#F43F5E' : '#10B981'}
                  stroke="var(--bg-canvas)"
                  strokeWidth="2"
                />
                <text
                  x={Math.min(165, Math.max(8, toRadarX(deltaX) + 8))}
                  y={Math.min(210, Math.max(14, toRadarY(deltaZ) - 6))}
                  fontSize="9.5"
                  fontWeight="700"
                  fill="currentColor"
                >
                  Portal B
                </text>
              </svg>

              <div className="gs-mc-collision-inputs">
                <div className="mg-field">
                  <label htmlFor="mc-b-x">2nd Portal OW X</label>
                  <NumericField
                    id="mc-b-x"
                    min={-30000000}
                    max={30000000}
                    fallback={45}
                    emptyFallback={0}
                    className="deck-input no-icon mono"
                    value={portalBX}
                    onCommit={setPortalBX}
                  />
                </div>
                <div className="mg-field">
                  <label htmlFor="mc-b-y">2nd Portal Y</label>
                  <NumericField
                    id="mc-b-y"
                    min={-64}
                    max={320}
                    fallback={64}
                    emptyFallback={64}
                    className="deck-input no-icon mono"
                    value={portalBY}
                    onCommit={setPortalBY}
                  />
                </div>
                <div className="mg-field">
                  <label htmlFor="mc-b-z">2nd Portal OW Z</label>
                  <NumericField
                    id="mc-b-z"
                    min={-30000000}
                    max={30000000}
                    fallback={980}
                    emptyFallback={0}
                    className="deck-input no-icon mono"
                    value={portalBZ}
                    onCommit={setPortalBZ}
                  />
                </div>
                <p className="gs-mc-verdict-copy mono">
                  Overworld Δ: {mcCollision.overworldGap} blks · Nether 3D Δ:{' '}
                  {mcCollision.nether3dDist} blks
                </p>
              </div>
            </div>
          </SpotlightPanel>
        </div>
      ) : (
        <SpotlightPanel className="gs-work-card gs-mc-stronghold-card">
          <div className="gs-card-topbar">
            <h3 className="mg-subcard-title">
              <Compass size={16} color={game.accentColor} aria-hidden="true" />
              <span>2-Throw Eye of Ender Intersection Vector Plot</span>
            </h3>
            {strongholdResult.valid && (
              <span className="district-pill mono">
                Walk ~{strongholdResult.distFromThrow2} Blocks from Throw #2
              </span>
            )}
          </div>

          <div className="gs-mc-stronghold-grid">
            <svg
              viewBox="0 0 240 210"
              className="gs-mc-stronghold-svg"
              role="img"
              aria-label="Stronghold 2-throw ray intersection plot with N E S W orientation"
            >
              <defs>
                <pattern id="mcShGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect x="0" y="0" width="240" height="210" rx="14" fill="var(--bg-recessed)" />
              <rect x="0" y="0" width="240" height="210" rx="14" fill="url(#mcShGrid)" />
              {/* Cardinal compass markers matching Minecraft F3 yaw */}
              <g fontSize="8.5" fontWeight="700" fill="currentColor" fillOpacity="0.65">
                <text x="120" y="13" textAnchor="middle">N (-Z)</text>
                <text x="232" y="101" textAnchor="end">E (+X)</text>
                <text x="120" y="182" textAnchor="middle">S (+Z)</text>
                <text x="8" y="101" textAnchor="start">W (-X)</text>
              </g>
              {/* Throw rays */}
              <line
                x1={mapShX(t1x)}
                y1={mapShZ(t1z)}
                x2={strongholdResult.valid ? mapShX(strongholdResult.x) : mapShX(r1x)}
                y2={strongholdResult.valid ? mapShZ(strongholdResult.z) : mapShZ(r1z)}
                stroke="#0284C7"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <line
                x1={mapShX(t2x)}
                y1={mapShZ(t2z)}
                x2={strongholdResult.valid ? mapShX(strongholdResult.x) : mapShX(r2x)}
                y2={strongholdResult.valid ? mapShZ(strongholdResult.z) : mapShZ(r2z)}
                stroke="#D97706"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <circle cx={mapShX(t1x)} cy={mapShZ(t1z)} r="5" fill="#0284C7" stroke="var(--bg-canvas)" strokeWidth="1.5" />
              <circle cx={mapShX(t2x)} cy={mapShZ(t2z)} r="5" fill="#D97706" stroke="var(--bg-canvas)" strokeWidth="1.5" />
              {strongholdResult.valid && (
                <g>
                  <circle
                    cx={mapShX(strongholdResult.x)}
                    cy={mapShZ(strongholdResult.z)}
                    r="11"
                    fill="rgba(16,185,129,0.22)"
                  />
                  <circle
                    cx={mapShX(strongholdResult.x)}
                    cy={mapShZ(strongholdResult.z)}
                    r="5.5"
                    fill="#059669"
                    stroke="var(--bg-canvas)"
                    strokeWidth="1.5"
                  />
                </g>
              )}
              {/* Theme-safe Plot Legend */}
              <g fontSize="9" fontWeight="700" fill="currentColor">
                <circle cx="26" cy="197" r="3.5" fill="#0284C7" />
                <text x="33" y="200">T1</text>
                <circle cx="64" cy="197" r="3.5" fill="#D97706" />
                <text x="71" y="200">T2</text>
                <circle cx="104" cy="197" r="3.5" fill="#059669" />
                <text x="111" y="200">Stronghold</text>
              </g>
            </svg>

            <div className="gs-mc-throw-inputs">
              <div className="mg-field">
                <label htmlFor="sh-x1">Throw #1 X / Z / F3 Yaw (°)</label>
                <div className="gs-triple-inputs">
                  <NumericField
                    id="sh-x1"
                    min={-30000000}
                    max={30000000}
                    round={false}
                    step="any"
                    fallback={0}
                    emptyFallback={0}
                    aria-label="Throw 1 X"
                    className="deck-input no-icon mono"
                    value={throw1X}
                    onCommit={setThrow1X}
                  />
                  <NumericField
                    min={-30000000}
                    max={30000000}
                    round={false}
                    step="any"
                    fallback={0}
                    emptyFallback={0}
                    aria-label="Throw 1 Z"
                    className="deck-input no-icon mono"
                    value={throw1Z}
                    onCommit={setThrow1Z}
                  />
                  <NumericField
                    min={-3600}
                    max={3600}
                    round={false}
                    step="any"
                    fallback={-45}
                    emptyFallback={-45}
                    aria-label="Throw 1 Deg"
                    className="deck-input no-icon mono"
                    value={throw1Deg}
                    onCommit={setThrow1Deg}
                  />
                </div>
              </div>

              <div className="mg-field">
                <label htmlFor="sh-x2">Throw #2 X / Z / F3 Yaw (°)</label>
                <div className="gs-triple-inputs">
                  <NumericField
                    id="sh-x2"
                    min={-30000000}
                    max={30000000}
                    round={false}
                    step="any"
                    fallback={200}
                    emptyFallback={0}
                    aria-label="Throw 2 X"
                    className="deck-input no-icon mono"
                    value={throw2X}
                    onCommit={setThrow2X}
                  />
                  <NumericField
                    min={-30000000}
                    max={30000000}
                    round={false}
                    step="any"
                    fallback={0}
                    emptyFallback={0}
                    aria-label="Throw 2 Z"
                    className="deck-input no-icon mono"
                    value={throw2Z}
                    onCommit={setThrow2Z}
                  />
                  <NumericField
                    min={-3600}
                    max={3600}
                    round={false}
                    step="any"
                    fallback={45}
                    emptyFallback={45}
                    aria-label="Throw 2 Deg"
                    className="deck-input no-icon mono"
                    value={throw2Deg}
                    onCommit={setThrow2Deg}
                  />
                </div>
              </div>

              <div className="hud-readout gs-mc-sh-result">
                <span>Dig Down At</span>
                <strong>
                  {strongholdResult.valid
                    ? `OW X:${strongholdResult.x} Z:${strongholdResult.z} · Nether ${strongholdResult.netherX}, ${strongholdResult.netherZ}`
                    : strongholdResult.reason}
                </strong>
              </div>
            </div>
          </div>
        </SpotlightPanel>
      )}
    </div>
  );
}

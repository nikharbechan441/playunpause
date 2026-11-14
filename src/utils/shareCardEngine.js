/**
 * Obsidian Hardware Studio Share Card Exporter
 * Renders crisp 960x540 dark brushed studio PNG telemetry cards for any Top-10 game
 * plus plain-text Discord/party-chat summaries.
 */

function fitCardText(ctx, text, maxWidthPx) {
  const str = String(text ?? '').trim().slice(0, 120);
  if (!str) return '';
  if (ctx.measureText(str).width <= maxWidthPx) return str;
  let cut = str;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidthPx) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function formatDiscordSummary({ gameTitle, headline, heroLabel, heroValue, rows = [] }) {
  const lines = [
    `**${gameTitle}** — ${headline}`,
    `> **${heroLabel}:** \`${heroValue}\``,
    ...rows.slice(0, 5).map((r) => `• ${r.label}: **${r.value}**`),
    `playunpause.com`,
  ];
  return lines.join('\n');
}

export function renderStudioSpecCardCanvas({
  gameTitle = 'Unpause',
  toolTitle = 'Telemetry Spec',
  heroLabel = 'RESULT',
  heroValue = '0',
  heroSub = '',
  accentColor = '#FF5964',
  rows = [],
}) {
  if (typeof document === 'undefined') return null;
  const width = 960;
  const height = 540;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Obsidian studio background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0B0E14');
  bg.addColorStop(1, '#121722');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle corner accent glow (restrained 5% surface weight)
  const glow = ctx.createRadialGradient(840, 80, 10, 840, 80, 320);
  glow.addColorStop(0, `${accentColor}2A`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Main brushed chassis border
  roundRectPath(ctx, 28, 28, width - 56, height - 56, 20);
  ctx.fillStyle = '#121722';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Top telemetry accent hairline
  roundRectPath(ctx, 28, 28, width - 56, 5, 3);
  ctx.fillStyle = accentColor;
  ctx.fill();

  // Header brand + game
  ctx.fillStyle = accentColor;
  ctx.font = '700 16px "JetBrains Mono", monospace';
  ctx.fillText('UNPAUSE // HARDWARE SPEC CARD', 60, 76);

  ctx.fillStyle = '#9CA8BC';
  ctx.textAlign = 'right';
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText('playunpause.com', width - 60, 76);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#F3F6FA';
  ctx.font = '700 32px "Space Grotesk", "Inter", sans-serif';
  ctx.fillText(fitCardText(ctx, `${gameTitle} · ${toolTitle}`, width - 120), 60, 120);

  // Primary Hero Readout Block
  roundRectPath(ctx, 60, 148, width - 120, 136, 14);
  ctx.fillStyle = '#181F2E';
  ctx.fill();
  ctx.strokeStyle = `${accentColor}66`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const heroInnerW = width - 172;
  ctx.fillStyle = '#9CA8BC';
  ctx.font = '600 14px "JetBrains Mono", monospace';
  ctx.fillText(fitCardText(ctx, String(heroLabel).toUpperCase(), heroSub ? heroInnerW - 350 : heroInnerW), 86, 184);

  if (heroSub) {
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'right';
    ctx.font = '600 16px "Inter", sans-serif';
    ctx.fillText(fitCardText(ctx, String(heroSub), 330), width - 86, 184);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = '#F3F6FA';
  let heroFontSize = 54;
  ctx.font = `700 ${heroFontSize}px "JetBrains Mono", monospace`;
  while (heroFontSize > 34 && ctx.measureText(String(heroValue || '')).width > heroInnerW) {
    heroFontSize -= 6;
    ctx.font = `700 ${heroFontSize}px "JetBrains Mono", monospace`;
  }
  ctx.fillText(fitCardText(ctx, String(heroValue), heroInnerW), 86, 248);

  // Secondary Spec Grid
  const cleanRows = rows.slice(0, 4);
  const cols = 2;
  const cellW = (width - 136) / cols;
  cleanRows.forEach((row, idx) => {
    const col = idx % cols;
    const r = Math.floor(idx / cols);
    const x = 60 + col * (cellW + 16);
    const y = 308 + r * 86;

    roundRectPath(ctx, x, y, cellW, 74, 12);
    ctx.fillStyle = '#181F2E';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#9CA8BC';
    ctx.font = '500 14px "Inter", sans-serif';
    ctx.fillText(fitCardText(ctx, row.label, cellW - 36), x + 18, y + 28);

    ctx.fillStyle = '#F3F6FA';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(fitCardText(ctx, row.value, cellW - 36), x + 18, y + 58);
  });

  // Bottom bar
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 12px "Inter", sans-serif';
  const bottomLine = String(gameTitle).toLowerCase().includes('minecraft')
    ? 'NOT AN OFFICIAL MINECRAFT PRODUCT · NOT ASSOCIATED WITH MOJANG OR MICROSOFT · No pop-up ads'
    : 'Unofficial fan telemetry · No pop-up ads · Zero trackers · Pure session math';
  ctx.fillText(bottomLine, 60, height - 48);

  return canvas;
}

export async function downloadStudioSpecPng(spec) {
  const canvas = renderStudioSpecCardCanvas(spec);
  if (!canvas) return false;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // Ignore cleanup errors
  }
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(spec.fileSlug || 'unpause-spec').toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

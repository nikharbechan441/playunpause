/**
 * Obsidian Hardware Studio Share Card Exporter
 * Renders crisp 960x540 dark brushed studio PNG telemetry cards for any Top-10 game
 * plus plain-text Discord/party-chat summaries.
 */

const POISON_CARD_TOKENS = new Set(['NaN', 'Infinity', '-Infinity', 'undefined']);

function safeText(raw, fallback = '', maxCodeUnits = 120) {
  if (raw === null || raw === undefined || typeof raw === 'object' || typeof raw === 'symbol') {
    return fallback;
  }
  if (typeof raw === 'number' && !Number.isFinite(raw)) {
    return fallback;
  }
  const cleaned = String(raw)
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (m) => (m.length === 2 ? m : ''))
    .replace(/[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();
  if (!cleaned || POISON_CARD_TOKENS.has(cleaned) || /^\[object\s+[^\]]+\]$/i.test(cleaned)) {
    return fallback;
  }
  let out = '';
  for (const ch of cleaned) {
    if (out.length + ch.length > maxCodeUnits) break;
    out += ch;
  }
  return out && !POISON_CARD_TOKENS.has(out) ? out : fallback;
}

function normalizeHexColor(raw, fallback = '#FF5964') {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) return trimmed.slice(0, 7).toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

function fitCardText(ctx, text, maxWidthPx) {
  const str = safeText(text, '', 120);
  const safeMax = Number.isFinite(maxWidthPx) && maxWidthPx > 0 ? maxWidthPx : 0;
  if (!str || safeMax <= 0) return '';
  if (ctx.measureText(str).width <= safeMax) return str;
  const chars = Array.from(str);
  while (chars.length > 1 && ctx.measureText(`${chars.join('')}…`).width > safeMax) {
    chars.pop();
  }
  return `${chars.join('').trimEnd()}…`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const safeR = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + safeR, y);
  ctx.lineTo(x + w - safeR, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + safeR);
  ctx.lineTo(x + w, y + h - safeR);
  ctx.quadraticCurveTo(x + w, y + h, x + w - safeR, y + h);
  ctx.lineTo(x + safeR, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - safeR);
  ctx.lineTo(x, y + safeR);
  ctx.quadraticCurveTo(x, y, x + safeR, y);
  ctx.closePath();
}

export function formatDiscordSummary(rawSpec = {}) {
  const spec = rawSpec && typeof rawSpec === 'object' ? rawSpec : {};
  const gameTitle = safeText(spec.gameTitle, 'Unpause', 80);
  const headline = safeText(spec.headline, 'Telemetry Spec', 120);
  const heroLabel = safeText(spec.heroLabel, 'RESULT', 60);
  const heroValue = safeText(spec.heroValue, '0', 80);
  const safeRows = Array.isArray(spec.rows)
    ? spec.rows.filter((r) => r && typeof r === 'object').slice(0, 5)
    : [];
  const lines = [
    `**${gameTitle}** — ${headline}`,
    `> **${heroLabel}:** \`${heroValue}\``,
    ...safeRows.map((r) => `• ${safeText(r.label, 'Metric', 60)}: **${safeText(r.value, '—', 80)}**`),
    `playunpause.com`,
  ];
  return lines.join('\n');
}

export function renderStudioSpecCardCanvas(rawSpec = {}) {
  if (typeof document === 'undefined') return null;
  const spec = rawSpec && typeof rawSpec === 'object' ? rawSpec : {};
  const gameTitle = safeText(spec.gameTitle, 'Unpause', 80);
  const toolTitle = safeText(spec.toolTitle, 'Telemetry Spec', 80);
  const heroLabel = safeText(spec.heroLabel, 'RESULT', 60);
  const heroValue = safeText(spec.heroValue, '0', 80);
  const heroSub = safeText(spec.heroSub, '', 60);
  const accent = normalizeHexColor(spec.accentColor, '#FF5964');
  const rows = Array.isArray(spec.rows)
    ? spec.rows.filter((r) => r && typeof r === 'object')
    : [];

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
  glow.addColorStop(0, `${accent}2A`);
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
  ctx.fillStyle = accent;
  ctx.fill();

  // Header brand + game
  ctx.fillStyle = accent;
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
  ctx.strokeStyle = `${accent}66`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const heroInnerW = width - 172;
  ctx.fillStyle = '#9CA8BC';
  ctx.font = '600 14px "JetBrains Mono", monospace';
  ctx.fillText(fitCardText(ctx, heroLabel.toUpperCase(), heroSub ? heroInnerW - 350 : heroInnerW), 86, 184);

  if (heroSub) {
    ctx.fillStyle = accent;
    ctx.textAlign = 'right';
    ctx.font = '600 16px "Inter", sans-serif';
    ctx.fillText(fitCardText(ctx, heroSub, 330), width - 86, 184);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = '#F3F6FA';
  let heroFontSize = 54;
  ctx.font = `700 ${heroFontSize}px "JetBrains Mono", monospace`;
  while (heroFontSize > 34 && ctx.measureText(heroValue).width > heroInnerW) {
    heroFontSize -= 6;
    ctx.font = `700 ${heroFontSize}px "JetBrains Mono", monospace`;
  }
  ctx.fillText(fitCardText(ctx, heroValue, heroInnerW), 86, 248);

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
    ctx.fillText(fitCardText(ctx, safeText(row.label, 'SPEC', 60), cellW - 36), x + 18, y + 28);

    ctx.fillStyle = '#F3F6FA';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(fitCardText(ctx, safeText(row.value, '—', 80), cellW - 36), x + 18, y + 58);
  });

  // Bottom bar
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 12px "Inter", sans-serif';
  const bottomLine = gameTitle.toLowerCase().includes('minecraft')
    ? 'NOT AN OFFICIAL MINECRAFT PRODUCT · NOT ASSOCIATED WITH MOJANG OR MICROSOFT · No pop-up ads'
    : 'Unofficial fan telemetry · No pop-up ads · Zero trackers · Pure session math';
  ctx.fillText(fitCardText(ctx, bottomLine, width - 120), 60, height - 48);

  return canvas;
}

export async function downloadStudioSpecPng(spec) {
  if (!spec || typeof spec !== 'object') return false;
  const canvas = renderStudioSpecCardCanvas(spec);
  if (!canvas || typeof canvas.toBlob !== 'function') return false;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // Ignore cleanup errors
  }
  if (!blob) return false;
  const rawSlug = safeText(spec.fileSlug, 'unpause-spec', 64).toLowerCase();
  const cleanSlug = rawSlug.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'unpause-spec';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanSlug}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

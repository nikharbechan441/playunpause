/**
 * High-DPI Obsidian Field Instrument PNG Card Renderers + Clipboard Export:
 * 1. Flighty-Style "Preload Spec Card" (Storage clearance & ETA share graphic)
 * 2. Obsidian "Syndicate Squad Payout Slip" (Party-chat cut breakdown)
 */

const POISON_CANVAS_TOKENS = new Set(['NaN', 'Infinity', '-Infinity', 'undefined']);

function sanitizeCanvasText(raw, fallback = '', maxCodeUnits = 120) {
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
  if (!cleaned || POISON_CANVAS_TOKENS.has(cleaned) || /^\[object\s+[^\]]+\]$/i.test(cleaned)) {
    return fallback;
  }
  let out = '';
  for (const ch of cleaned) {
    if (out.length + ch.length > maxCodeUnits) break;
    out += ch;
  }
  return out && !POISON_CANVAS_TOKENS.has(out) ? out : fallback;
}

function finiteNum(raw, fallback = 0, min = -1e12, max = 1e12) {
  if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || typeof raw === 'object') {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.min(max, Math.max(min, n));
  return clamped === 0 ? 0 : clamped;
}

function fitCanvasText(ctx, text, maxWidthPx) {
  const str = sanitizeCanvasText(text, '', 120);
  const safeMax = Number.isFinite(maxWidthPx) && maxWidthPx > 0 ? maxWidthPx : 0;
  if (!str || safeMax <= 0) return '';
  if (ctx.measureText(str).width <= safeMax) return str;
  const chars = Array.from(str);
  while (chars.length > 1 && ctx.measureText(`${chars.join('')}…`).width > safeMax) {
    chars.pop();
  }
  return `${chars.join('').trimEnd()}…`;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const safeW = Math.max(0, finiteNum(w, 0, 0, 10000));
  const safeH = Math.max(0, finiteNum(h, 0, 0, 10000));
  const safeR = Math.max(0, Math.min(finiteNum(r, 0, 0, 10000), safeW / 2, safeH / 2));
  ctx.beginPath();
  ctx.moveTo(x + safeR, y);
  ctx.arcTo(x + safeW, y, x + safeW, y + safeH, safeR);
  ctx.arcTo(x + safeW, y + safeH, x, y + safeH, safeR);
  ctx.arcTo(x, y + safeH, x, y, safeR);
  ctx.arcTo(x, y, x + safeW, y, safeR);
  ctx.closePath();
}

export function computeStorageDiagnosis(consoleId, deletedGames, fitsDrive) {
  const list = Array.isArray(deletedGames)
    ? deletedGames.filter((g) => g && typeof g === 'object')
    : [];
  const ids = new Set(list.map((g) => g.id));
  const freedGb = list.reduce((sum, g) => sum + finiteNum(g.sizeGb, 0, 0, 100000), 0);
  if (!fitsDrive) return 'STATUS: INSUFFICIENT HEADROOM — CLEAR MORE OR EXPAND';
  if (list.length === 0) return 'STATUS: PASS READY — NO UNINSTALLS REQUIRED';
  if (ids.has('cod-hq') && ids.has('nba-2k')) return `STATUS: HEAVY CLEAR (+${freedGb} GB RECLAIMED)`;
  if (ids.has('cod-hq')) {
    const codSize = finiteNum(list.find((g) => g.id === 'cod-hq')?.sizeGb, 148, 0, 100000);
    return `STATUS: CALL OF DUTY HQ CLEARED (+${codSize} GB)`;
  }
  if (ids.has('media-gallery') && list.length === 1) {
    const clipsSize = finiteNum(list.find((g) => g.id === 'media-gallery')?.sizeGb, 45, 0, 100000);
    return `STATUS: CAPTURE CLIPS PURGED (+${clipsSize} GB)`;
  }
  if (consoleId === 'xss-512') return 'STATUS: 364 GB SERIES S ESTIMATED FIT';
  if (list.length >= 4) return `STATUS: FULL QUEUE CLEARED (${list.length} ITEMS · +${freedGb} GB)`;
  return 'STATUS: PRELOAD ESTIMATE · SUBJECT TO LAUNCH PATCHES';
}

export function computeHostGreedLabel(crewRows) {
  const rows = Array.isArray(crewRows) ? crewRows.filter((r) => r && typeof r === 'object') : [];
  if (rows.length === 0) return 'SOLO RUN';
  if (rows.length === 1) return 'SOLO RUN · 100%';
  const hostPct = Math.round(finiteNum(rows[0]?.pct, 25, 0, 100));
  const even = Math.round(100 / rows.length);
  if (hostPct <= even + 2) return `EVEN CREW SPLIT · ${hostPct}% HOST`;
  if (hostPct <= 40) return `STANDARD HOST CUT · ${hostPct}%`;
  if (hostPct <= 55) return `HIGH HOST CUT · ${hostPct}%`;
  return `TOP-HEAVY HOST CUT · ${hostPct}%`;
}

export function renderStorageReceiptCanvas(rawOpts = {}) {
  if (typeof document === 'undefined') return null;
  const opts = rawOpts && typeof rawOpts === 'object' ? rawOpts : {};
  const consoleName = sanitizeCanvasText(opts.consoleName, 'Console SSD', 64);
  const consoleId = sanitizeCanvasText(opts.consoleId, 'xss-512', 32);
  const usableGb = Math.round(finiteNum(opts.usableGb, 364, 0, 100000));
  const installSizeGb = Math.round(finiteNum(opts.installSizeGb, 180, 0, 100000));
  const alreadyFreeGb = Math.round(finiteNum(opts.alreadyFreeGb, 0, 0, 100000));
  const mbps = Math.round(finiteNum(opts.mbps, 120, 1, 100000));
  const downloadTimeText = sanitizeCanvasText(opts.downloadTimeText, '—', 32).toUpperCase();
  const nzStatusLabel = sanitizeCanvasText(opts.nzStatusLabel, '—', 32).toUpperCase();

  const allRows = Array.isArray(opts.deletedGames)
    ? opts.deletedGames.filter((g) => g && typeof g === 'object')
    : [];
  const rows = allRows.slice(0, 72);
  const width = 900;
  const visibleRows = Math.max(1, rows.length);
  const height = Math.min(4096, 604 + visibleRows * 48);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Obsidian studio backdrop
  ctx.fillStyle = '#0B0E14';
  ctx.fillRect(0, 0, width, height);

  // Outer hardware card
  const pad = 42;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  drawRoundedRect(ctx, pad, pad, cardW, cardH, 16);
  ctx.fillStyle = '#121722';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const freedGb = allRows.reduce((sum, g) => sum + finiteNum(g.sizeGb, 0, 0, 100000), 0);
  const totalAvailable = Math.min(usableGb, alreadyFreeGb + freedGb);
  const fits = totalAvailable >= installSizeGb;
  const accent = fits ? '#2CE5B5' : '#FF755C';
  const diagnosis = computeStorageDiagnosis(consoleId, rows, fits);

  // Scoped 4px top telemetry hairline
  ctx.fillStyle = accent;
  ctx.fillRect(pad + 18, pad, cardW - 36, 4);

  const left = pad + 42;
  const right = width - pad - 42;
  let y = pad + 56;

  // Eyebrow header
  ctx.textAlign = 'left';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillStyle = '#9CA8BC';
  ctx.fillText('UNPAUSE // GTA VI PRELOAD SPEC CARD', left, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = accent;
  ctx.fillText(fits ? 'READY' : 'SHORTAGE', right, y);

  y += 42;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F2F5FA';
  ctx.font = '700 32px "Space Grotesk", sans-serif';
  ctx.fillText(fitCanvasText(ctx, `${consoleName} (${usableGb} GB USABLE)`, right - left - 180), left, y);

  ctx.textAlign = 'right';
  ctx.font = '700 34px "JetBrains Mono", monospace';
  ctx.fillStyle = accent;
  ctx.fillText(fitCanvasText(ctx, `${installSizeGb} GB`, 170), right, y);

  y += 32;
  // Recessed 3-column flight-pass spec box
  drawRoundedRect(ctx, left, y, right - left, 100, 10);
  ctx.fillStyle = '#090B0E';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const colW = (right - left) / 3;
  const specCols = [
    { label: 'CLEARED / TARGET', val: `${totalAvailable} / ${installSizeGb} GB`, color: '#F2F5FA' },
    { label: `ETA @ ${mbps} MBPS`, val: downloadTimeText, color: '#38BDF8' },
    { label: 'NZ UNLOCK (NOV 18)', val: nzStatusLabel, color: '#CBD5E1' },
  ];
  specCols.forEach((col, i) => {
    const cx = left + 18 + colW * i;
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(left + colW * i, y + 18);
      ctx.lineTo(left + colW * i, y + 82);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(fitCanvasText(ctx, col.label, colW - 32), cx, y + 36);
    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.fillStyle = col.color;
    ctx.fillText(fitCanvasText(ctx, col.val, colW - 32), cx, y + 72);
  });

  y += 142;
  ctx.textAlign = 'left';
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(fitCanvasText(ctx, `QUEUED UNINSTALLS (${allRows.length})`, (right - left) * 0.55), left, y);
  ctx.textAlign = 'right';
  ctx.fillText(fitCanvasText(ctx, `EXISTING FREE: ${alreadyFreeGb} GB`, (right - left) * 0.42), right, y);

  y += 18;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();

  y += 40;
  if (rows.length === 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(fitCanvasText(ctx, 'No uninstalls queued — checking existing free SSD space', right - left), left, y);
    y += 48;
  } else {
    rows.forEach((g) => {
      drawRoundedRect(ctx, left, y - 30, right - left, 40, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fill();

      const gameTitle = sanitizeCanvasText(g.title, 'Installed Game', 80);
      const rowSize = Math.round(finiteNum(g.sizeGb, 0, 0, 100000));

      ctx.textAlign = 'left';
      ctx.fillStyle = '#F2F5FA';
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(fitCanvasText(ctx, `− ${gameTitle}`, right - left - 180), left + 14, y - 3);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#2CE5B5';
      ctx.fillText(fitCanvasText(ctx, `+${rowSize} GB`, 140), right - 14, y - 3);
      y += 48;
    });
  }

  y += 16;
  drawRoundedRect(ctx, left, y, right - left, 64, 8);
  ctx.fillStyle = fits ? 'rgba(44, 229, 181, 0.10)' : 'rgba(255, 77, 46, 0.14)';
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '700 21px "Space Grotesk", sans-serif';
  const bannerText = fits
    ? `DRIVE READY · +${totalAvailable - installSizeGb} GB HEADROOM POST-INSTALL`
    : `CLEAR ${installSizeGb - totalAvailable} GB MORE (OR UPGRADE INTERNAL NVME)`;
  ctx.fillText(fitCanvasText(ctx, bannerText, right - left - 36), width / 2, y + 40);

  y += 102;
  ctx.fillStyle = '#9CA8BC';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText(fitCanvasText(ctx, diagnosis, right - left), width / 2, y);

  y += 32;
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillText('NOV 19 GLOBAL · NOV 18 @ 11:00 UTC NZ · PLAYUNPAUSE.COM', width / 2, y);

  return canvas;
}

export function renderSquadSplitCanvas(rawOpts = {}) {
  if (typeof document === 'undefined') return null;
  const opts = rawOpts && typeof rawOpts === 'object' ? rawOpts : {};
  const jobTitle = sanitizeCanvasText(opts.jobTitle, 'SYNDICATE HEIST SPLIT', 80).toUpperCase();
  const grossDollars = Math.round(finiteNum(opts.grossDollars, 0, 0, 1e12));
  const supportFeePct = Math.round(finiteNum(opts.supportFeePct, 0, 0, 100));
  const supportFeeDollars = Math.round(finiteNum(opts.supportFeeDollars, 0, 0, 1e12));
  const netPoolDollars = Math.round(finiteNum(opts.netPoolDollars, 0, 0, 1e12));
  const rows = Array.isArray(opts.crewRows)
    ? opts.crewRows.filter((r) => r && typeof r === 'object').slice(0, 48)
    : [];
  const width = 900;
  const height = Math.min(4096, 436 + rows.length * 76);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0B0E14';
  ctx.fillRect(0, 0, width, height);

  const pad = 42;
  drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 16);
  ctx.fillStyle = '#121722';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#2CE5B5';
  ctx.fillRect(pad + 18, pad, width - pad * 2 - 36, 4);

  const left = pad + 42;
  const right = width - pad - 42;
  let y = pad + 56;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#9CA8BC';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText('UNPAUSE // SQUAD PAYOUT LEDGER', left, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2CE5B5';
  ctx.fillText('PLAYUNPAUSE.COM', right, y);

  y += 42;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F2F5FA';
  ctx.font = '700 32px "Space Grotesk", sans-serif';
  ctx.fillText(fitCanvasText(ctx, jobTitle, right - left), left, y);

  y += 32;
  drawRoundedRect(ctx, left, y, right - left, 94, 10);
  ctx.fillStyle = '#090B0E';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const fmt = (n) => `$${Math.round(finiteNum(n, 0, 0, 1e12)).toLocaleString('en-US')}`;
  const colW = (right - left) / 3;
  const summaryCols = [
    { label: 'GROSS VAULT', value: fmt(grossDollars), color: '#F2F5FA' },
    { label: `NPC CREW FEE (${supportFeePct}%)`, value: `-${fmt(supportFeeDollars)}`, color: '#F5B731' },
    { label: 'NET SQUAD POOL', value: fmt(netPoolDollars), color: '#2CE5B5' },
  ];
  summaryCols.forEach((col, i) => {
    const cx = left + 18 + colW * i;
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(left + colW * i, y + 18);
      ctx.lineTo(left + colW * i, y + 76);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillText(fitCanvasText(ctx, col.label, colW - 36), cx, y + 32);
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillStyle = col.color;
    ctx.fillText(fitCanvasText(ctx, col.value, colW - 36), cx, y + 68);
  });

  y += 136;
  const rowSpan = right - left;
  rows.forEach((member, idx) => {
    drawRoundedRect(ctx, left, y - 36, rowSpan, 60, 8);
    ctx.fillStyle = '#090B0E';
    ctx.fill();

    const pct = Math.round(finiteNum(member.pct, 0, 0, 100));
    const barW = Math.min(rowSpan, Math.max(12, Math.round((rowSpan * pct) / 100)));
    ctx.fillStyle = idx === 0 ? 'rgba(255, 77, 46, 0.18)' : 'rgba(44, 229, 181, 0.14)';
    drawRoundedRect(ctx, left, y - 36, barW, 60, 8);
    ctx.fill();

    const safeName = sanitizeCanvasText(member.name, `PLAYER ${idx + 1}`, 48).toUpperCase();
    const safeRole = sanitizeCanvasText(member.role, 'CREW', 24).toUpperCase();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#F2F5FA';
    ctx.font = '600 20px "Space Grotesk", sans-serif';
    ctx.fillText(fitCanvasText(ctx, `${safeName} · ${safeRole}`, 395), left + 18, y + 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#2CE5B5';
    ctx.font = '700 21px "JetBrains Mono", monospace';
    ctx.fillText(fitCanvasText(ctx, `${pct}%  →  ${fmt(member.payout)}`, 290), right - 18, y + 2);

    y += 76;
  });

  y += 14;
  const greed = computeHostGreedLabel(rows);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F5B731';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText(fitCanvasText(ctx, greed, right - left), width / 2, y);

  y += 32;
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillText('UNOFFICIAL PLAYER UTILITY · PLAYUNPAUSE.COM', width / 2, y);

  return canvas;
}

function releaseCanvasBuffer(canvas) {
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // Ignore
  }
}

export async function copyCanvasToClipboard(canvas) {
  if (!canvas || typeof canvas.toBlob !== 'function') {
    return false;
  }
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== 'function' ||
    typeof window === 'undefined' ||
    typeof window.ClipboardItem === 'undefined'
  ) {
    releaseCanvasBuffer(canvas);
    return false;
  }
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      releaseCanvasBuffer(canvas);
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        resolve(true);
      } catch {
        resolve(false);
      }
    }, 'image/png');
  });
}

export async function shareOrDownloadCanvas(canvas, filename = 'unpause-card.png', shareTitle = 'Unpause Card') {
  if (!canvas || typeof canvas.toBlob !== 'function') {
    return { method: 'failed' };
  }
  const safeFilename = sanitizeCanvasText(filename, 'unpause-card.png', 100) || 'unpause-card.png';
  const safeTitle = sanitizeCanvasText(shareTitle, 'Unpause Card', 100) || 'Unpause Card';
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      releaseCanvasBuffer(canvas);
      if (!blob) {
        resolve({ method: 'failed' });
        return;
      }
      const file = new File([blob], safeFilename, { type: 'image/png' });
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: safeTitle,
            text: `${safeTitle} — playunpause.com`,
            files: [file],
          });
          resolve({ method: 'shared' });
          return;
        } catch {
          // Fallback to download
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      resolve({ method: 'downloaded' });
    }, 'image/png');
  });
}

/**
 * High-DPI HTML5 Canvas Card Renderers + 1-Click Discord Clipboard Image Export:
 * 1. Thermal Paper "212 GB Drive Funeral Receipt" (Storage viral loop)
 * 2. Afterhours HUD "Locked Syndicate Payout Wire" (Party-chat share loop)
 */

function fitCanvasText(ctx, text, maxWidthPx) {
  const str = String(text || '').trim().slice(0, 120);
  if (!str) return '';
  if (ctx.measureText(str).width <= maxWidthPx) return str;
  let cut = str;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidthPx) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

function drawSawtoothEdge(ctx, x, y, width, toothWidth, height, direction = 'down', fillStyle = '#FAF6EC') {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  const count = Math.ceil(width / toothWidth);
  if (direction === 'up') {
    ctx.moveTo(x, y + height);
    for (let i = 0; i < count; i += 1) {
      const startX = x + i * toothWidth;
      ctx.lineTo(startX + toothWidth / 2, y);
      ctx.lineTo(startX + toothWidth, y + height);
    }
  } else {
    ctx.moveTo(x, y);
    for (let i = 0; i < count; i += 1) {
      const startX = x + i * toothWidth;
      ctx.lineTo(startX + toothWidth / 2, y + height);
      ctx.lineTo(startX + toothWidth, y);
    }
  }
  ctx.closePath();
  ctx.fill();
}

export function computeStorageDiagnosis(consoleId, deletedGames, fitsDrive) {
  const ids = new Set(deletedGames.map((g) => g.id));
  if (!fitsDrive) return 'DIAGNOSIS: STILL COOKED · CLEAR MORE';
  if (consoleId === 'ps5-pro' && deletedGames.length === 0) return 'DIAGNOSIS: 2TB RICH KID FLEX';
  if (deletedGames.length === 0) return 'DIAGNOSIS: CLEAN DRIVE DISCIPLINE';
  if (ids.has('cod-hq') && ids.has('nba-2k')) return 'DIAGNOSIS: REFORMED SWEAT (+290 GB)';
  if (ids.has('cod-hq')) return 'DIAGNOSIS: WARZONE DETOX COMPLETE';
  if (ids.has('media-gallery') && deletedGames.length === 1) return 'DIAGNOSIS: 45 GB WHIFFED CLIPS PURGED';
  if (consoleId === 'xss-512') return 'DIAGNOSIS: 364 GB SERIES S SURVIVOR';
  if (deletedGames.length >= 4) return 'DIAGNOSIS: SCORCHED-EARTH SSD WIPE';
  return 'DIAGNOSIS: MIDNIGHT PRE-LOAD READY';
}

export function computeHostGreedLabel(crewRows) {
  if (!Array.isArray(crewRows) || crewRows.length === 0) return 'SOLO RUN';
  if (crewRows.length === 1) return 'SOLO WOLF · 100%';
  const hostPct = crewRows[0]?.pct ?? 25;
  const even = Math.round(100 / crewRows.length);
  if (hostPct <= even + 2) return `DEMOCRATIC CREW · ${hostPct}% HOST`;
  if (hostPct <= 40) return `STANDARD SETUP · ${hostPct}% HOST`;
  if (hostPct <= 55) return `HEAVY TAX · ${hostPct}% HOST`;
  return `CRIMINAL HOST GREED · ${hostPct}%`;
}

export function renderStorageReceiptCanvas({
  consoleName,
  consoleId,
  usableGb,
  installSizeGb,
  deletedGames,
  alreadyFreeGb,
  mbps,
  downloadTimeText,
  nzStatusLabel,
}) {
  const width = 900;
  const rowCount = Math.max(1, deletedGames.length);
  const height = 1010 + rowCount * 46;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Deep Leonida Afterhours backdrop with Sunset Coral + Vice Mint horizon glow
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#060B14');
  bgGrad.addColorStop(0.55, '#0B1629');
  bgGrad.addColorStop(1, '#141328');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.2, 130, 40, width * 0.5, 340, 680);
  glow.addColorStop(0, 'rgba(255, 77, 46, 0.28)');
  glow.addColorStop(0.6, 'rgba(44, 229, 181, 0.12)');
  glow.addColorStop(1, 'rgba(6, 11, 20, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const paperX = 76;
  const paperW = width - paperX * 2;
  const paperY = 74;
  const paperH = height - 148;

  // Graphic offset shadow
  ctx.fillStyle = 'rgba(2, 6, 12, 0.72)';
  ctx.fillRect(paperX + 12, paperY + 16, paperW, paperH);

  // Thermal receipt body
  const paperColor = '#FAF6EC';
  drawSawtoothEdge(ctx, paperX, paperY - 16, paperW, 22, 16, 'up', paperColor);
  ctx.fillStyle = paperColor;
  ctx.fillRect(paperX, paperY, paperW, paperH);
  drawSawtoothEdge(ctx, paperX, paperY + paperH, paperW, 22, 16, 'down', paperColor);

  // Subtle horizontal thermal scan lines
  ctx.fillStyle = 'rgba(18, 23, 34, 0.025)';
  for (let y = paperY + 8; y < paperY + paperH; y += 6) {
    ctx.fillRect(paperX, y, paperW, 1);
  }

  const left = paperX + 52;
  const right = paperX + paperW - 52;
  let cursorY = paperY + 64;

  ctx.fillStyle = '#121722';
  ctx.font = '800 38px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DRIVE FUNERAL RECEIPT', width / 2, cursorY);

  cursorY += 34;
  ctx.fillStyle = '#4A5567';
  ctx.font = '700 19px "JetBrains Mono", monospace';
  ctx.fillText(`CONSOLE: ${String(consoleName).toUpperCase()} (${usableGb} GB USABLE)`, width / 2, cursorY);

  cursorY += 34;
  const drawDashedRule = (yPos) => {
    ctx.strokeStyle = '#B8B0A0';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(left, yPos);
    ctx.lineTo(right, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawDashedRule(cursorY);
  cursorY += 42;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#121722';
  ctx.font = '700 21px "JetBrains Mono", monospace';
  ctx.fillText('PRE-LOAD TARGET ALLOCATION', left, cursorY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FF4726';
  ctx.fillText(`${installSizeGb} GB`, right, cursorY);

  cursorY += 34;
  drawDashedRule(cursorY);
  cursorY += 44;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#4A5567';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText('EVICTED FROM SSD', left, cursorY);
  ctx.textAlign = 'right';
  ctx.fillText('RECLAIMED', right, cursorY);
  cursorY += 36;

  if (deletedGames.length === 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#121722';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('0 GAMES DELETED (CLEAN SSD FLEX)', left, cursorY);
    ctx.textAlign = 'right';
    ctx.fillText('0 GB', right, cursorY);
    cursorY += 46;
  } else {
    deletedGames.forEach((g) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#121722';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      const label = fitCanvasText(ctx, `✕ ${g.title.toUpperCase()}`, right - left - 140);
      ctx.fillText(label, left, cursorY);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FF4726';
      ctx.fillText(`+${g.sizeGb} GB`, right, cursorY);
      cursorY += 46;
    });
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#4A5567';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText('✕ WEEKEND PLANS (NOV 19-22)', left, cursorY);
  ctx.textAlign = 'right';
  ctx.fillText('100%', right, cursorY);
  cursorY += 38;

  drawDashedRule(cursorY);
  cursorY += 46;

  const freedGb = deletedGames.reduce((sum, g) => sum + g.sizeGb, 0);
  const totalAvailable = Math.min(usableGb, alreadyFreeGb + freedGb);
  const fits = totalAvailable >= installSizeGb;
  const diagnosis = computeStorageDiagnosis(consoleId, deletedGames, fits);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#121722';
  ctx.font = '800 24px "JetBrains Mono", monospace';
  ctx.fillText('TOTAL SPACE CLEARED', left, cursorY);
  ctx.textAlign = 'right';
  ctx.fillText(`${totalAvailable} / ${installSizeGb} GB`, right, cursorY);

  cursorY += 40;
  ctx.textAlign = 'left';
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4A5567';
  ctx.fillText(`DOWNLOAD ETA @ ${mbps} MBPS`, left, cursorY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#121722';
  ctx.fillText(String(downloadTimeText).toUpperCase(), right, cursorY);

  cursorY += 38;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4A5567';
  ctx.fillText('NZ MIDNIGHT TRICK', left, cursorY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#121722';
  ctx.fillText(String(nzStatusLabel).toUpperCase(), right, cursorY);

  cursorY += 46;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#121722';
  ctx.font = '800 20px "JetBrains Mono", monospace';
  ctx.fillText(diagnosis, width / 2, cursorY);

  cursorY += 48;
  ctx.strokeStyle = fits ? '#009E73' : '#FF4726';
  ctx.lineWidth = 4;
  ctx.strokeRect(left, cursorY - 35, right - left, 58);
  ctx.textAlign = 'center';
  ctx.fillStyle = fits ? '#009E73' : '#FF4726';
  ctx.font = '800 23px "Space Grotesk", sans-serif';
  ctx.fillText(
    fits
      ? `VERDICT: READY FOR MIDNIGHT (+${totalAvailable - installSizeGb} GB SPARE)`
      : `VERDICT: SHORT BY ${installSizeGb - totalAvailable} GB — CLEAR MORE`,
    width / 2,
    cursorY + 2
  );

  cursorY += 72;
  const barLeft = width / 2 - 170;
  ctx.fillStyle = '#121722';
  for (let i = 0; i < 46; i += 1) {
    const bw = i % 3 === 0 ? 5 : i % 2 === 0 ? 2 : 3;
    ctx.fillRect(barLeft + i * 7.5, cursorY, bw, 42);
  }

  cursorY += 72;
  ctx.fillStyle = '#121722';
  ctx.font = '800 23px "JetBrains Mono", monospace';
  ctx.fillText('UNOFFICIAL PLAYER UTILITY · PLAYUNPAUSE.COM', width / 2, cursorY);

  return canvas;
}

export function renderSquadSplitCanvas({
  jobTitle,
  grossDollars,
  supportFeePct,
  supportFeeDollars,
  netPoolDollars,
  crewRows,
}) {
  const width = 900;
  const height = 690 + crewRows.length * 78;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#060B14');
  bg.addColorStop(1, '#0D1B30');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const pad = 46;
  ctx.fillStyle = '#0E1C33';
  ctx.strokeStyle = '#274066';
  ctx.lineWidth = 2.5;
  ctx.fillRect(pad, pad, width - pad * 2, height - pad * 2);
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

  const topStrip = ctx.createLinearGradient(pad, pad, width - pad, pad);
  topStrip.addColorStop(0, '#FF4D2E');
  topStrip.addColorStop(1, '#2CE5B5');
  ctx.fillStyle = topStrip;
  ctx.fillRect(pad, pad, width - pad * 2, 10);

  const left = pad + 42;
  const right = width - pad - 42;
  let y = pad + 64;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#9FB3CE';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText('SYNDICATE WIRE · LOCKED SPLIT', left, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2CE5B5';
  ctx.fillText('PLAYUNPAUSE.COM', right, y);

  y += 46;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '800 35px "Space Grotesk", sans-serif';
  ctx.fillText(fitCanvasText(ctx, String(jobTitle).toUpperCase(), right - left), left, y);

  y += 42;
  ctx.fillStyle = '#081120';
  ctx.fillRect(left, y, right - left, 94);
  ctx.strokeStyle = '#223A5E';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(left, y, right - left, 94);

  const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

  ctx.fillStyle = '#9FB3CE';
  ctx.font = '700 15px "JetBrains Mono", monospace';
  ctx.fillText('GROSS VAULT', left + 22, y + 32);
  ctx.fillText(`NPC CREW FEE (${supportFeePct}%)`, left + 270, y + 32);
  ctx.fillText('NET SQUAD POOL', left + 535, y + 32);

  ctx.font = '800 23px "JetBrains Mono", monospace';
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(fitCanvasText(ctx, fmt(grossDollars), 230), left + 22, y + 68);
  ctx.fillStyle = '#FFB020';
  ctx.fillText(fitCanvasText(ctx, `-${fmt(supportFeeDollars)}`, 245), left + 270, y + 68);
  ctx.fillStyle = '#2CE5B5';
  ctx.fillText(fitCanvasText(ctx, fmt(netPoolDollars), 235), left + 535, y + 68);

  y += 136;
  crewRows.forEach((member, idx) => {
    ctx.fillStyle = '#091426';
    ctx.fillRect(left, y - 36, right - left, 62);

    const barW = Math.round(((right - left) * member.pct) / 100);
    ctx.fillStyle = idx === 0 ? 'rgba(255, 77, 46, 0.24)' : 'rgba(44, 229, 181, 0.16)';
    ctx.fillRect(left, y - 36, barW, 62);

    const safeName = (String(member.name || '').trim() || `PLAYER ${idx + 1}`).toUpperCase();
    const safeRole = String(member.role || 'CREW').toUpperCase();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 21px "Space Grotesk", sans-serif';
    ctx.fillText(fitCanvasText(ctx, `${safeName} · ${safeRole}`, 395), left + 20, y + 3);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#2CE5B5';
    ctx.font = '800 22px "JetBrains Mono", monospace';
    ctx.fillText(`${member.pct}%  →  ${fmt(member.payout)}`, right - 20, y + 3);

    y += 78;
  });

  y += 14;
  const greed = computeHostGreedLabel(crewRows);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFB020';
  ctx.font = '800 19px "JetBrains Mono", monospace';
  ctx.fillText(greed, width / 2, y);

  y += 34;
  ctx.fillStyle = '#9FB3CE';
  ctx.font = '600 18px "Inter", sans-serif';
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

export async function shareOrDownloadCanvas(canvas, filename, shareTitle) {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      releaseCanvasBuffer(canvas);
      if (!blob) {
        resolve({ method: 'failed' });
        return;
      }
      const file = new File([blob], filename, { type: 'image/png' });
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: shareTitle,
            text: `${shareTitle} — playunpause.com`,
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
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      resolve({ method: 'downloaded' });
    }, 'image/png');
  });
}

/**
 * Offscreen 1080x1920 9:16 Leonida 100% Passport Flex Card PNG exporter.
 */

import { LEONIDA_CHAPTERS, LEONIDA_SAMPLE_COUNTS } from '../data/games/leonidaV2Data.js';
import { computeFinishDate, computeTrackerStats, DEFAULT_HOURS_PER_DAY } from './leonidaState.js';

function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadBannerImage(src) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportLeonidaPassportPng({
  state,
  previewSample = false,
  bannerSrc = '/images/leonida-banner.jpg',
} = {}) {
  if (typeof document === 'undefined') return false;

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed cleanly with fallback system stack if font ready rejects
    }
  }

  const bannerImg = await loadBannerImage(bannerSrc);

  const counts = previewSample ? LEONIDA_SAMPLE_COUNTS : state?.counts;
  const stats = computeTrackerStats(counts);
  const finish = computeFinishDate({
    pace: state?.pace || 'normal',
    chapter: state?.chapter || 1,
    hoursPerDay: state?.hoursPerDay ?? DEFAULT_HOURS_PER_DAY,
  });
  const chMeta = LEONIDA_CHAPTERS.find((c) => c.id === (state?.chapter || 1)) || LEONIDA_CHAPTERS[0];
  const savedCount = Array.isArray(state?.saves)
    ? state.saves.filter((s) => s.saved).length
    : 0;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // 1. Matte Obsidian background (#0D0E12)
  ctx.fillStyle = '#0D0E12';
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Top dusk palm banner (y=0..680) smoothly faded into #0D0E12
  if (bannerImg && bannerImg.width > 0) {
    ctx.save();
    ctx.globalAlpha = 0.62;
    const scale = Math.max(1080 / bannerImg.width, 680 / bannerImg.height);
    const drawW = bannerImg.width * scale;
    const drawH = bannerImg.height * scale;
    const dx = (1080 - drawW) / 2;
    const dy = (680 - drawH) / 2;
    ctx.drawImage(bannerImg, dx, dy, drawW, drawH);
    ctx.restore();
  } else {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 680);
    skyGrad.addColorStop(0, '#1B1E27');
    skyGrad.addColorStop(0.55, '#311D2B');
    skyGrad.addColorStop(1, '#0D0E12');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1080, 680);
  }

  const fadeGrad = ctx.createLinearGradient(0, 120, 0, 680);
  fadeGrad.addColorStop(0, 'rgba(13, 14, 18, 0.25)');
  fadeGrad.addColorStop(0.65, 'rgba(13, 14, 18, 0.72)');
  fadeGrad.addColorStop(1, '#0D0E12');
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(0, 0, 1080, 680);

  // 3. Title & Subtitle
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F5A623';
  ctx.font = '700 32px "Barlow Condensed", sans-serif';
  ctx.fillText('PLAYUNPAUSE // LEONIDA PASSPORT', 540, 132);

  ctx.fillStyle = '#F5F2EB';
  ctx.font = '800 84px "Barlow Condensed", sans-serif';
  ctx.fillText('GTA VI 100% PROGRESS', 540, 224);

  const subText = `${chMeta.label}   |   EST. FINISH: ${finish.formattedDate.toUpperCase()}   |   SAVES: ${previewSample ? 6 : savedCount}/15`;
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '600 30px Inter, sans-serif';
  ctx.fillText(subText, 540, 286);

  // 4. Centered Coral -> Gold -> Teal circular progress ring (cx=540, cy=620, r=190)
  const cx = 540;
  const cy = 620;
  const r = 190;

  ctx.lineWidth = 28;
  ctx.strokeStyle = '#1B1E27';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const pct = Math.max(0, Math.min(100, stats.totalPct));
  if (pct > 0) {
    const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    ringGrad.addColorStop(0, '#FF5A5F');
    ringGrad.addColorStop(0.5, '#F5A623');
    ringGrad.addColorStop(1, '#14B8A6');
    ctx.strokeStyle = ringGrad;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
    ctx.stroke();
  }

  ctx.fillStyle = '#F5F2EB';
  ctx.font = '800 112px "Barlow Condensed", sans-serif';
  ctx.fillText(`${pct}%`, cx, cy + 28);

  ctx.fillStyle = '#14B8A6';
  ctx.font = '700 28px Inter, sans-serif';
  ctx.fillText('TRUE 100% COMPLETION', cx, cy + 82);

  // 5. 5 rounded dark milestone bar cards (y=940..1720)
  const startY = 940;
  const endY = 1720;
  const totalSpan = endY - startY;
  const gap = 22;
  const cardH = Math.floor((totalSpan - gap * 4) / 5);
  const cardX = 88;
  const cardW = 1080 - cardX * 2;

  stats.rows.forEach((row, idx) => {
    const y = startY + idx * (cardH + gap);

    drawRoundRect(ctx, cardX, y, cardW, cardH, 16);
    ctx.fillStyle = '#15171E';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#262A34';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#F5F2EB';
    ctx.font = '700 32px Inter, sans-serif';
    ctx.fillText(row.label, cardX + 34, y + 54);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#14B8A6';
    ctx.font = '700 34px Inter, sans-serif';
    ctx.fillText(`${row.value} / ${row.target}`, cardX + cardW - 34, y + 54);

    const barX = cardX + 34;
    const barY = y + 84;
    const barW = cardW - 68;
    const barH = 18;
    drawRoundRect(ctx, barX, barY, barW, barH, 9);
    ctx.fillStyle = '#1B1E27';
    ctx.fill();

    const fillW = Math.max(row.value > 0 ? 18 : 0, Math.round(barW * Math.min(1, row.ratio)));
    if (fillW > 0) {
      drawRoundRect(ctx, barX, barY, fillW, barH, 9);
      ctx.fillStyle = '#14B8A6';
      ctx.fill();
    }
  });

  // 6. Footer CTA
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '700 30px "Barlow Condensed", sans-serif';
  ctx.fillText('TRACK YOUR RUN AT PLAYUNPAUSE.COM', 540, 1838);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const fileName = previewSample
        ? 'playunpause-gta6-passport-sample.png'
        : 'playunpause-gta6-passport-9x16.png';

      // Use native mobile share sheet when supported on coarse-pointer touch devices
      const isTouchDevice =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches;
      if (isTouchDevice && typeof navigator !== 'undefined' && typeof File === 'function' && navigator.canShare) {
        try {
          const shareFile = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [shareFile] })) {
            await navigator.share({
              files: [shareFile],
              title: 'GTA VI Leonida 100% Passport',
            });
            resolve(true);
            return;
          }
        } catch (err) {
          if (err?.name === 'AbortError') {
            resolve(true);
            return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1200);
      resolve(true);
    }, 'image/png');
  });
}

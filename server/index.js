import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { verifyWhopWebhook, generateDeckCode } from './webhookAuth.js';
import { TOP_GAMES, resolveGameIdFromSlug } from '../src/data/games/allGames.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotEnvIfPresent(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadDotEnvIfPresent(path.join(__dirname, '..', '.env'));

const DECK_CODE_REGEX = /^UP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8,12}$/;
const EMAIL_CLAIM_WINDOW_MS = 30 * 60 * 1000; // 30-min post-checkout instant email claim window
const DEFAULT_LAUNCH_CUTOFF_ISO = '2026-11-18T11:00:00Z';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const LEGAL_META = {
  terms: {
    title: 'Terms of Service & ECTA Supplier Disclosures — Unpause',
    desc: 'Plain-English Terms of Service for playunpause.com: independent read-only gaming calculator utility, one-time All-Access Pass scope, and pre-launch transparency.',
    h1: 'Unpause Terms of Service & ECTA s. 43 Disclosures',
    body: 'playunpause.com is an independent, unofficial read-only browser calculator and checklist utility. We do not sell game software, cheats, unauthorized modifications, or in-game currency. The Unpause One-Time All-Access Pass ($6.99 USD pre-launch / $9.99 USD standard) is a single non-recurring payment granting access across all supported game suites and Phone + PC sync for the operational lifetime of playunpause.com. Support: hello@playunpause.com.',
  },
  privacy: {
    title: 'Privacy Notice (POPIA · GDPR · CCPA) — Unpause',
    desc: 'Privacy-first architecture for playunpause.com: zero behavioral ad trackers, keyed HMAC email hashing, EU Frankfurt hosting, and 7-day deletion rights.',
    h1: 'Unpause Privacy Notice (POPIA · EU/UK GDPR · CCPA)',
    body: 'Unpause runs zero third-party behavioral ad networks and never sells personal information. Free calculator inputs stay in your browser localStorage. Paid pass fulfillment via Whop/Stripe stores only a keyed HMAC-SHA256 hash of your checkout email, receipt reference, and checklist JSON in Frankfurt, Germany (EU). Request access or deletion anytime via hello@playunpause.com.',
  },
  refunds: {
    title: '14-Day Refund Guarantee & Acceptable Ad Policy — Unpause',
    desc: '14-day no-questions-asked buyer refund policy on the Unpause All-Access Pass plus $149/day top-bar sponsor review and prohibited ad rules.',
    h1: '14-Day Refund Policy & Acceptable Ad Rules',
    body: 'Every Unpause One-Time All-Access Pass includes a 14-day hassle-free refund guarantee via hello@playunpause.com (statement descriptor: WHOP*PLAYUNPAUSE). Paid 24-hour top-bar sponsorships ($149/day via sponsors@playunpause.com) undergo manual review, carry an explicit Sponsored badge, and strictly prohibit cheats, aimbots, RMT/coin sellers, gambling, crypto, and infringing pages.',
  },
  ip: {
    title: 'IP, Trademarks, DMCA & Affiliate Disclosure — Unpause',
    desc: 'Nominative fair use, publisher non-affiliation, DMCA designated contact (dmca@playunpause.com), and FTC 16 CFR Part 255 affiliate disclosures.',
    h1: 'Intellectual Property, DMCA & FTC Affiliate Disclosure',
    body: 'playunpause.com is an independent, unofficial utility not affiliated with or endorsed by Take-Two Interactive, Rockstar Games, Activision, Epic Games, Mojang, Microsoft, Electronic Arts, Respawn, Valve, Riot Games, Roblox Corp., or Sony Interactive Entertainment. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. Hardware links may earn an Amazon Associate / partner commission at no extra cost to you. IP/DMCA contact: dmca@playunpause.com.',
  },
};

const GTA_TAB_META = {
  safes: {
    title: 'GTA 6 Safe & Door Combinations Keypad Vault — Unpause',
    desc: 'Unofficial GTA 6 safe & keypad vault with instant district search and interactive 10-key playback (simulated UI demos pre-launch; verified codes Nov 18).',
    h1: 'GTA 6 Safe & Door Combinations Keypad Vault (Unofficial)',
  },
  squad: {
    title: 'GTA 6 Squad Heist Cut Splitter & Stock Compounder — Unpause',
    desc: 'Unofficial integer-exact squad heist percentage splitter with NPC support fee deductions, party-chat receipt export, and two-character stock planner.',
    h1: 'Squad Heist Cut Splitter & Two-Character Stock Planner',
  },
  nightrun: {
    title: 'GTA 6 Weeknight Session Routes & Spoiler-Free Missables — Unpause',
    desc: 'Spoiler-free pause checkpoints and 45/90/120-minute weeknight session loops for busy players, synced across phone and PC.',
    h1: 'Weeknight Session Routes & Spoiler-Free Missables Shield',
  },
};

function renderDynamicIndexHtml(baseHtml, query = {}, passPriceUsd = 6.99) {
  const rawLegal = String(query.legal || '').trim().toLowerCase();
  const rawGame = String(query.game || '').trim();
  const rawTab = String(query.tab || '').trim().toLowerCase();

  let pageTitle = '3-Second Gaming Calculators & Safe Codes — Unpause';
  let pageDesc =
    'Instant, ad-free unofficial calculators for Top 10 games: GTA 6 212 GB SSD fit & keypad vault, Minecraft portals, CoD TTK, Fortnite XP & FC 25 tax.';
  let canonicalUrl = 'https://playunpause.com/';
  let mainHtml = '';
  let faqEntities = [];

  const syncFaq = {
    q: `How does the $${passPriceUsd} All-Access sync work?`,
    a: 'Pay once with Apple Pay or card to get a permanent UP-XXXXXXXX sync link. Open it on your phone and PC to mirror safe checklists, Pro Meta tables, and pinned targets across all 10 games with zero login.',
  };

  if (LEGAL_META[rawLegal]) {
    const lm = LEGAL_META[rawLegal];
    pageTitle = lm.title;
    pageDesc = lm.desc;
    canonicalUrl = `https://playunpause.com/?legal=${encodeURIComponent(rawLegal)}`;
    mainHtml = `<main style="max-width:960px;margin:32px auto;padding:0 16px;font-family:sans-serif;color:#0B2545;"><h1>${escapeHtml(lm.h1)}</h1><p>${escapeHtml(lm.body)}</p></main>`;
  } else if (rawGame && resolveGameIdFromSlug(rawGame) !== 'gta-6') {
    const resolvedId = resolveGameIdFromSlug(rawGame);
    const pack = TOP_GAMES.find((g) => g.id === resolvedId) || TOP_GAMES[0];
    pageTitle = `${pack.fullTitle} Calculator & Meta — Unpause`;
    pageDesc = `Independent, unofficial ${pack.fullTitle} utility: ${pack.tagline}. Instant 3-second math with zero pop-up ads.`;
    canonicalUrl = `https://playunpause.com/?game=${encodeURIComponent(pack.id)}`;

    const metaRowsHtml = Array.isArray(pack.proMetaRows)
      ? `<ul>${pack.proMetaRows.map((r) => `<li><strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.val)}</li>`).join('')}</ul>`
      : '';
    const faqs = [...(Array.isArray(pack.faqs) ? pack.faqs.slice(0, 2) : []), syncFaq];
    faqEntities = faqs;
    const faqHtml = faqs
      .map((f) => `<article><h2>${escapeHtml(f.q)}</h2><p>${escapeHtml(f.a)}</p></article>`)
      .join('');
    mainHtml = `<main style="max-width:960px;margin:32px auto;padding:0 16px;font-family:sans-serif;color:#0B2545;"><h1>${escapeHtml(pack.fullTitle)} — ${escapeHtml(pack.tagline)}</h1><p>Unofficial, ad-free second-screen companion calculator for ${escapeHtml(pack.fullTitle)}.</p>${metaRowsHtml}${faqHtml}</main>`;
  } else {
    const gtaPack = TOP_GAMES[0];
    if (GTA_TAB_META[rawTab]) {
      pageTitle = GTA_TAB_META[rawTab].title;
      pageDesc = GTA_TAB_META[rawTab].desc;
      canonicalUrl = `https://playunpause.com/?tab=${encodeURIComponent(rawTab)}`;
    }
    const faqs = [...(Array.isArray(gtaPack.faqs) ? gtaPack.faqs.slice(0, 2) : []), syncFaq];
    faqEntities = faqs;
    const faqHtml = faqs
      .map((f) => `<article><h2>${escapeHtml(f.q)}</h2><p>${escapeHtml(f.a)}</p></article>`)
      .join('');
    const h1Text = GTA_TAB_META[rawTab]
      ? GTA_TAB_META[rawTab].h1
      : 'Unpause: 3-Second Unofficial Gaming Calculators & Safe Codes for Top 10 Games';
    mainHtml = `<main style="max-width:960px;margin:32px auto;padding:0 16px;font-family:sans-serif;color:#0B2545;"><h1>${escapeHtml(h1Text)}</h1><p>${escapeHtml(pageDesc)}</p>${faqHtml}</main>`;
  }

  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(pageDesc)}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapeHtml(pageDesc)}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${escapeHtml(pageDesc)}" />`
    );

  if (mainHtml) {
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${mainHtml}</div>`);
  }

  if (faqEntities.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqEntities.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    };
    const safeJson = JSON.stringify(faqSchema).replace(/</g, '\\u003c');
    html = html.replace('</head>', `  <script type="application/ld+json">${safeJson}</script>\n  </head>`);
  }

  return html;
}

export function sanitizeSyncState(rawState) {
  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
    return null;
  }

  const cleanList = (arr) => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    const maxScan = Math.min(arr.length, 1000);
    for (let i = 0; i < maxScan; i += 1) {
      const item = arr[i];
      if (typeof item !== 'string') continue;
      const trimmed = item.trim().slice(0, 64);
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
      if (out.length >= 500) break;
    }
    return out;
  };

  const cleanPins = (arr) => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    const maxScan = Math.min(arr.length, 250);
    for (let i = 0; i < maxScan; i += 1) {
      const item = arr[i];
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const id = typeof item.id === 'string' ? item.id.trim().slice(0, 48) : '';
      const gameId = typeof item.gameId === 'string' ? item.gameId.trim().slice(0, 32) : '';
      const label = typeof item.label === 'string' ? item.label.trim().slice(0, 80) : '';
      const value = typeof item.value === 'string' ? item.value.trim().slice(0, 140) : '';
      if (!id || !gameId || !label || !value || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, gameId, label, value });
      if (out.length >= 50) break;
    }
    return out;
  };

  const rawSafes = Array.isArray(rawState.crackedSafeIds)
    ? rawState.crackedSafeIds
    : Array.isArray(rawState.crackedSafes)
      ? rawState.crackedSafes
      : [];

  return {
    crackedSafeIds: cleanList(rawSafes),
    checkedRouteIds: cleanList(rawState.checkedRouteIds),
    savedPins: cleanPins(rawState.savedPins),
  };
}

function parseStoredState(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr || '{}');
    return sanitizeSyncState(parsed) || { crackedSafeIds: [], checkedRouteIds: [], savedPins: [] };
  } catch {
    return { crackedSafeIds: [], checkedRouteIds: [], savedPins: [] };
  }
}

export function createApp({ dbPath, env = process.env } = {}) {
  const resolvedDbPath =
    dbPath ||
    env.DB_PATH ||
    (env.RENDER_DISK_PATH
      ? path.join(env.RENDER_DISK_PATH, 'unpause.db')
      : path.join(__dirname, '..', 'data', 'unpause.db'));

  if (resolvedDbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
  }

  const db = new DatabaseSync(resolvedDbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS sync_decks (
      deck_code TEXT PRIMARY KEY,
      tier TEXT NOT NULL DEFAULT 'pro',
      email_hash TEXT,
      whop_ref TEXT,
      state_json TEXT NOT NULL DEFAULT '{"crackedSafeIds":[],"checkedRouteIds":[],"savedPins":[]}',
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_decks_email_hash ON sync_decks(email_hash);
    CREATE INDEX IF NOT EXISTS idx_sync_decks_whop_ref ON sync_decks(whop_ref);

    CREATE TABLE IF NOT EXISTS orders (
      transaction_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      product_kind TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      buyer_email_hash TEXT,
      deck_code TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_deck_code ON orders(deck_code);

    CREATE TABLE IF NOT EXISTS sponsors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      badge_text TEXT NOT NULL,
      target_url TEXT NOT NULL,
      starts_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Backward-compatible migration if existing SQLite DB predates `active` column on sync_decks
  const cols = db.prepare('PRAGMA table_info(sync_decks)').all();
  if (!cols.some((c) => c.name === 'active')) {
    db.exec('ALTER TABLE sync_decks ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Strict HTTP Security & Cross-Origin Isolation Headers (Zero 'unsafe-inline' in script-src)
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "manifest-src 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "object-src 'none'",
      ].join('; ')
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Per-scope isolated IP token-bucket rate limiter (prevents cross-scope bucket eviction & header spoofing)
  function getClientIp(req) {
    if (String(env.TRUST_CF_HEADERS).toLowerCase() === 'true') {
      const cfIp = req.headers['cf-connecting-ip'];
      if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();
    }
    return req.ip || req.socket?.remoteAddress || 'local';
  }

  function rateLimit(maxPerMinute = 90, scope = 'global') {
    const scopeBuckets = new Map();
    const MAX_SCOPE_BUCKETS = 5_000;
    let localCounter = 0;

    return (req, res, next) => {
      const now = Date.now();
      localCounter += 1;
      if (localCounter % 200 === 0) {
        for (const [k, v] of scopeBuckets.entries()) {
          if (now - v.windowStart > 60_000) scopeBuckets.delete(k);
        }
      }

      const key = `${scope}:${getClientIp(req)}`;
      let bucket = scopeBuckets.get(key);
      if (!bucket || now - bucket.windowStart > 60_000) {
        if (scopeBuckets.size >= MAX_SCOPE_BUCKETS) {
          res.setHeader('Retry-After', '60');
          return res.status(429).json({ error: 'Server busy. Try again in a moment.' });
        }
        bucket = { windowStart: now, count: 0 };
        scopeBuckets.set(key, bucket);
      }

      bucket.count += 1;
      if (bucket.count > maxPerMinute) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Rate limit exceeded. Try again in a moment.' });
      }
      return next();
    };
  }

  const emailPepper =
    env.EMAIL_HASH_PEPPER || env.WHOP_WEBHOOK_SECRET || 'unpause-local-dev-pepper';

  function hashIdentifier(value) {
    if (!value) return null;
    const clean = String(value).trim().toLowerCase();
    if (!clean) return null;
    return crypto.createHmac('sha256', emailPepper).update(clean).digest('hex');
  }

  function legacyUnsaltedHash(value) {
    if (!value) return null;
    const clean = String(value).trim().toLowerCase();
    if (!clean) return null;
    return crypto.createHash('sha256').update(clean).digest('hex');
  }

  function computePassPriceUsd(nowMs = Date.now()) {
    const cutoffIso = env.LAUNCH_CUTOFF_ISO || DEFAULT_LAUNCH_CUTOFF_ISO;
    const cutoffMs = Date.parse(cutoffIso);
    if (Number.isFinite(cutoffMs) && nowMs >= cutoffMs) {
      return 9.99;
    }
    return 6.99;
  }

  function isDemoUnlockPermitted() {
    return (
      env.NODE_ENV !== 'production' && String(env.ALLOW_DEMO_UNLOCK).toLowerCase() === 'true'
    );
  }

  function issueOrReuseDeckCode({ tier = 'pro', emailHash = null, whopRef = null }) {
    if (whopRef) {
      const existing = db
        .prepare('SELECT deck_code, active FROM sync_decks WHERE whop_ref = ? LIMIT 1')
        .get(whopRef);
      if (existing) {
        if (existing.active === 0) {
          db.prepare('UPDATE sync_decks SET active = 1, updated_at = ? WHERE deck_code = ?').run(
            Date.now(),
            existing.deck_code
          );
        }
        return existing.deck_code;
      }
    }

    const now = Date.now();
    const initialJson = JSON.stringify({ crackedSafeIds: [], checkedRouteIds: [], savedPins: [] });
    const insertStmt = db.prepare(`
      INSERT INTO sync_decks (deck_code, tier, email_hash, whop_ref, state_json, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateDeckCode(8);
      try {
        insertStmt.run(code, tier, emailHash, whopRef, initialJson, now, now);
        return code;
      } catch {
        // Retry on rare collision
      }
    }
    throw new Error('Could not allocate unique deck code');
  }

  // 1. Whop Standard Webhook Endpoint (Raw body preserved BEFORE express.json; authenticated via HMAC)
  app.get('/api/webhooks/whop', rateLimit(60, 'whop_webhook_probe'), (_req, res) => {
    res.status(200).json({ ok: true, endpoint: 'whop_webhook', ready: true });
  });

  app.post(
    '/api/webhooks/whop',
    rateLimit(120, 'whop_webhook'),
    express.raw({ type: '*/*', limit: '128kb' }),
    (req, res) => {
      const secret = env.WHOP_WEBHOOK_SECRET;
      const check = verifyWhopWebhook({
        rawBody: req.body,
        headers: req.headers,
        secret,
      });

      if (!check.valid) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      let payload;
      try {
        payload = JSON.parse(req.body.toString('utf8'));
      } catch {
        return res.status(400).json({ error: 'Malformed JSON payload' });
      }

      const eventType = String(payload.type || payload.action || '');
      const data = payload.data || {};
      const txId = String(data.id || check.eventId || payload.id || '').trim();

      if (!txId) {
        return res.status(400).json({ error: 'Missing transaction reference' });
      }

      // Handle Refund / Dispute / Membership Invalid Revocation Events (Whop v2/v5 + 2026-11-10-1)
      const revocationEvents = new Set([
        'payment.refunded',
        'payment_refunded',
        'refund.created',
        'refund.updated',
        'membership.went_invalid',
        'membership_went_invalid',
        'membership.deactivated',
        'membership_deactivated',
        'dispute.created',
        'dispute.alert_created',
        'payment.disputed',
      ]);

      if (revocationEvents.has(eventType)) {
        const refCandidates = [
          data.membership_id,
          data.membership?.id,
          data.license_key,
          data.payment_id,
          data.payment?.id,
          data.id,
        ]
          .filter((v) => typeof v === 'string' && v.trim())
          .map((v) => v.trim());

        let revokedDeck = null;
        for (const ref of refCandidates) {
          const found =
            db.prepare('SELECT deck_code FROM sync_decks WHERE whop_ref = ? LIMIT 1').get(ref) ||
            db
              .prepare(
                'SELECT deck_code FROM orders WHERE transaction_id = ? AND deck_code IS NOT NULL LIMIT 1'
              )
              .get(ref);
          if (found?.deck_code) {
            revokedDeck = found.deck_code;
            break;
          }
        }

        if (revokedDeck) {
          db.prepare('UPDATE sync_decks SET active = 0, updated_at = ? WHERE deck_code = ?').run(
            Date.now(),
            revokedDeck
          );
        }
        return res.status(200).json({ ok: true, revoked: Boolean(revokedDeck), deckCode: revokedDeck });
      }

      // Idempotency guard: return existing code if already processed
      const existingOrder = db
        .prepare('SELECT deck_code, product_kind FROM orders WHERE transaction_id = ?')
        .get(txId);
      if (existingOrder) {
        return res.status(200).json({
          ok: true,
          duplicate: true,
          productKind: existingOrder.product_kind,
          deckCode: existingOrder.deck_code,
        });
      }

      const validEvents = new Set([
        'payment.succeeded',
        'payment_succeeded',
        'membership.went_valid',
        'membership_went_valid',
        'invoice.paid',
      ]);
      if (!validEvents.has(eventType)) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      // Never fall back to subtotal (prevents 100%-discount promo $0 bypass)
      const rawAmountField =
        data.final_amount !== undefined && data.final_amount !== null
          ? data.final_amount
          : data.amount_after_fees ?? data.amount;

      if (rawAmountField === undefined || rawAmountField === null || rawAmountField === '') {
        return res.status(400).json({ error: 'Missing payment amount' });
      }
      const rawAmount = Number(rawAmountField);
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        return res.status(400).json({ error: 'Non-positive payment amount rejected' });
      }

      // Reject ambiguous integer amounts in (250, 500) so underpaid cent integers (e.g. 489c) never multiply by 100
      if (Number.isInteger(rawAmount) && rawAmount > 250 && rawAmount < 500) {
        return res.status(400).json({ error: 'Ambiguous payment amount rejected' });
      }

      const currency = String(data.currency || '').trim().toLowerCase();
      if (currency !== 'usd') {
        return res.status(400).json({ error: 'Unsupported payment currency' });
      }

      const amountCents =
        rawAmount >= 500 && Number.isInteger(rawAmount)
          ? rawAmount
          : Math.round(rawAmount * 100);

      const planId = String(data.plan?.id || data.plan_id || '').trim();
      const productId = String(data.product?.id || data.product_id || '').trim();
      const passIds = String(env.WHOP_PASS_PLAN_ID || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const sponsorIds = String(env.WHOP_SPONSOR_PLAN_ID || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (env.NODE_ENV === 'production' && (!passIds.length || !sponsorIds.length)) {
        return res.status(503).json({ error: 'Webhook plan IDs not configured' });
      }

      const matchesAny = (targets) =>
        targets.some((t) => (planId && t === planId) || (productId && t === productId));

      let productKind = null;
      if (sponsorIds.length && matchesAny(sponsorIds)) {
        productKind = 'sponsor_24h';
      } else if (passIds.length && matchesAny(passIds)) {
        productKind = 'nightrun_pass';
      } else if (passIds.length || sponsorIds.length) {
        return res.status(400).json({ error: 'Missing or unrecognized product plan ID' });
      } else {
        productKind = amountCents >= 9900 ? 'sponsor_24h' : 'nightrun_pass';
      }

      const minCentsRequired = productKind === 'sponsor_24h' ? 9900 : 500;
      if (amountCents < minCentsRequired) {
        return res.status(400).json({ error: 'Payment below minimum product threshold' });
      }

      const buyerEmail = data.user?.email || data.email || data.billing_details?.email || '';
      const emailHash = hashIdentifier(buyerEmail);
      const whopRef = String(
        data.membership_id || data.membership?.id || data.license_key || txId
      ).trim();

      let deckCode = null;
      db.exec('BEGIN IMMEDIATE');
      try {
        if (productKind === 'nightrun_pass') {
          deckCode = issueOrReuseDeckCode({ tier: 'pro', emailHash, whopRef });
        }

        // Prevent duplicate revenue accounting when both payment.succeeded & membership.went_valid fire
        const existingForDeck = deckCode
          ? db
              .prepare(
                'SELECT transaction_id FROM orders WHERE deck_code = ? AND product_kind = ? LIMIT 1'
              )
              .get(deckCode, 'nightrun_pass')
          : null;

        if (!existingForDeck) {
          db.prepare(`
            INSERT INTO orders (transaction_id, event_type, product_kind, amount_cents, currency, buyer_email_hash, deck_code, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            txId,
            eventType,
            productKind,
            amountCents,
            currency,
            emailHash,
            deckCode,
            Date.now()
          );
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }

      return res.status(200).json({ ok: true, productKind, deckCode });
    }
  );

  // Standard JSON parser for application APIs (64kb max)
  app.use('/api', express.json({ limit: '64kb' }));

  // 2. Public Runtime Config & Active Sponsor Slot
  app.get('/api/config', rateLimit(120, 'config'), (req, res) => {
    const now = Date.now();
    const activeSponsor = db
      .prepare(
        'SELECT badge_text, target_url, expires_at FROM sponsors WHERE active = 1 AND starts_at <= ? AND expires_at > ? ORDER BY id DESC LIMIT 1'
      )
      .get(now, now);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      brand: 'Unpause',
      domain: 'playunpause.com',
      supportEmail: env.SUPPORT_EMAIL || 'hello@playunpause.com',
      sponsorEmail: env.SPONSOR_EMAIL || 'sponsors@playunpause.com',
      passPriceUsd: computePassPriceUsd(now),
      launchPriceUsd: 9.99,
      sponsorPriceUsd: 149,
      passCheckoutUrl: env.WHOP_PASS_CHECKOUT_URL || 'https://whop.com/playunpause/',
      sponsorCheckoutUrl: env.WHOP_SPONSOR_CHECKOUT_URL || 'https://whop.com/playunpause/',
      affiliates: {
        ps5SsdUrl:
          env.AFFILIATE_PS5_SSD_URL ||
          'https://www.amazon.com/s?k=WD+BLACK+2TB+SN850X+NVMe+SSD+with+Heatsink+PS5',
        xboxCardUrl:
          env.AFFILIATE_XBOX_CARD_URL ||
          'https://www.amazon.com/s?k=WD+BLACK+C50+1TB+Expansion+Card+Xbox',
        topupsUrl: env.AFFILIATE_TOPUPS_URL || 'https://www.loaded.com/',
      },
      demoUnlockEnabled: isDemoUnlockPermitted(),
      activeSponsor: activeSponsor
        ? {
            badgeText: activeSponsor.badge_text,
            targetUrl: activeSponsor.target_url,
            expiresAt: activeSponsor.expires_at,
          }
        : null,
    });
  });

  // 3. Claim / Lookup Unlocked Deck Code
  app.post('/api/pass/activate', rateLimit(20, 'activate'), async (req, res) => {
    const rawInput = String(req.body?.codeOrEmail || '').trim();
    const receiptRef = String(req.body?.receiptRef || '').trim();
    const demoRequested = Boolean(req.body?.demoUnlock);

    if (demoRequested) {
      if (!isDemoUnlockPermitted()) {
        return res.status(403).json({ error: 'Demo unlock is disabled in production.' });
      }
      const code = issueOrReuseDeckCode({ tier: 'pro', whopRef: 'demo' });
      const existingDemo = db
        .prepare('SELECT state_json FROM sync_decks WHERE deck_code = ?')
        .get(code);
      return res.json({
        ok: true,
        deckCode: code,
        tier: 'pro',
        state: parseStoredState(existingDemo?.state_json),
      });
    }

    if (!rawInput || rawInput.length > 120) {
      return res.status(400).json({
        error: 'Enter your UP-XXXXXXXX sync code, Whop receipt ID (mem_ / pay_), or checkout email.',
      });
    }

    // Case A: Direct UP-XXXXXXXX sync code
    const upper = rawInput.toUpperCase();
    if (DECK_CODE_REGEX.test(upper)) {
      const deck = db
        .prepare('SELECT deck_code, tier, active, state_json FROM sync_decks WHERE deck_code = ?')
        .get(upper);
      if (!deck) {
        return res.status(404).json({ error: 'Sync code not found. Double-check the characters.' });
      }
      if (deck.active === 0) {
        return res.status(403).json({
          error: 'This pass was refunded or deactivated. Contact hello@playunpause.com for help.',
        });
      }
      return res.json({
        ok: true,
        deckCode: deck.deck_code,
        tier: deck.tier,
        state: parseStoredState(deck.state_json),
      });
    }

    // Case B: Lookup by buyer email (allowed within 30m post-checkout claim window, or with matching receiptRef)
    if (rawInput.includes('@')) {
      const emailHash = hashIdentifier(rawInput);
      const legacyHash = legacyUnsaltedHash(rawInput);
      const deck = db
        .prepare(
          'SELECT deck_code, tier, whop_ref, active, state_json, created_at FROM sync_decks WHERE email_hash IN (?, ?) ORDER BY created_at DESC LIMIT 1'
        )
        .get(emailHash, legacyHash);

      if (deck) {
        if (deck.active === 0) {
          return res.status(403).json({
            error: 'This pass was refunded or deactivated. Contact hello@playunpause.com for help.',
          });
        }
        const withinClaimWindow = Date.now() - Number(deck.created_at) <= EMAIL_CLAIM_WINDOW_MS;
        let matchingProof = Boolean(receiptRef && deck.whop_ref && receiptRef === deck.whop_ref);
        if (!matchingProof && receiptRef) {
          const orderMatch = db
            .prepare('SELECT 1 FROM orders WHERE transaction_id = ? AND deck_code = ? LIMIT 1')
            .get(receiptRef, deck.deck_code);
          matchingProof = Boolean(orderMatch);
        }
        if (withinClaimWindow || matchingProof) {
          return res.json({
            ok: true,
            deckCode: deck.deck_code,
            tier: deck.tier,
            state: parseStoredState(deck.state_json),
          });
        }
        return res.status(403).json({
          error:
            'For security on older orders, enter your saved UP-XXXXXXXX sync code or the mem_ / pay_ receipt ID from your Whop confirmation email.',
        });
      }
      return res.status(404).json({
        error:
          'No recent pass found for that email yet. Wait 5 seconds after Whop checkout or paste your mem_ / pay_ receipt ID.',
      });
    }

    // Case C: Lookup by Whop membership (`mem_`), license (`lk_`), OR payment transaction ID (`pay_`)
    const byRef =
      db
        .prepare(
          'SELECT deck_code, tier, active, state_json FROM sync_decks WHERE whop_ref = ? LIMIT 1'
        )
        .get(rawInput) ||
      db
        .prepare(
          'SELECT s.deck_code, s.tier, s.active, s.state_json FROM orders o JOIN sync_decks s ON s.deck_code = o.deck_code WHERE o.transaction_id = ? LIMIT 1'
        )
        .get(rawInput);

    if (byRef) {
      if (byRef.active === 0) {
        return res.status(403).json({
          error: 'This pass was refunded or deactivated. Contact hello@playunpause.com for help.',
        });
      }
      return res.json({
        ok: true,
        deckCode: byRef.deck_code,
        tier: byRef.tier,
        state: parseStoredState(byRef.state_json),
      });
    }

    // Case D: Live Whop API membership verification fallback (if WHOP_API_KEY configured)
    if (env.WHOP_API_KEY && /^(lk_|mem_)[a-zA-Z0-9_-]{4,64}$/.test(rawInput)) {
      try {
        const resp = await fetch(
          `https://api.whop.com/api/v2/memberships/${encodeURIComponent(rawInput)}`,
          {
            headers: { Authorization: `Bearer ${env.WHOP_API_KEY}` },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (resp.ok) {
          const mem = await resp.json();
          const passPlanId = String(env.WHOP_PASS_PLAN_ID || '').trim();
          const memPlanId = String(mem?.plan || mem?.plan_id || '').trim();
          const planMatches =
            env.NODE_ENV === 'production'
              ? Boolean(passPlanId) && memPlanId === passPlanId
              : !passPlanId || memPlanId === passPlanId;
          if (
            mem &&
            planMatches &&
            (mem.valid === true || mem.status === 'completed' || mem.status === 'active')
          ) {
            const newCode = issueOrReuseDeckCode({
              tier: 'pro',
              emailHash: hashIdentifier(mem.email || ''),
              whopRef: rawInput,
            });
            const stored = db
              .prepare('SELECT state_json FROM sync_decks WHERE deck_code = ?')
              .get(newCode);
            return res.json({
              ok: true,
              deckCode: newCode,
              tier: 'pro',
              state: parseStoredState(stored?.state_json),
            });
          }
        }
      } catch {
        // Fall through to 404
      }
    }

    return res.status(404).json({
      error: 'Code or key not recognized. Enter your UP-XXXXXXXX sync code or Whop mem_ / pay_ receipt ID.',
    });
  });

  // 4. Read & Save Cloud Sync State by Deck Code
  app.get('/api/sync/:code', rateLimit(60, 'sync_read'), (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!DECK_CODE_REGEX.test(code)) {
      return res.status(400).json({ error: 'Invalid sync code format' });
    }
    const deck = db
      .prepare(
        'SELECT deck_code, tier, active, state_json, updated_at FROM sync_decks WHERE deck_code = ?'
      )
      .get(code);
    if (!deck) {
      return res.status(404).json({ error: 'Deck code not found' });
    }
    if (deck.active === 0) {
      return res.status(403).json({ error: 'This pass has been deactivated following a refund.' });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      ok: true,
      deckCode: deck.deck_code,
      tier: deck.tier,
      updatedAt: deck.updated_at,
      state: parseStoredState(deck.state_json),
    });
  });

  app.put('/api/sync/:code', rateLimit(60, 'sync_write'), (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!DECK_CODE_REGEX.test(code)) {
      return res.status(400).json({ error: 'Invalid sync code format' });
    }
    const sanitized = sanitizeSyncState(req.body?.state);
    if (!sanitized) {
      return res.status(400).json({ error: 'Invalid state object' });
    }
    const serialized = JSON.stringify(sanitized);
    if (Buffer.byteLength(serialized, 'utf8') > 48_000) {
      return res.status(413).json({ error: 'State payload exceeds 48KB limit' });
    }
    const deck = db.prepare('SELECT active FROM sync_decks WHERE deck_code = ?').get(code);
    if (!deck) {
      return res.status(404).json({ error: 'Deck code not found' });
    }
    if (deck.active === 0) {
      return res.status(403).json({ error: 'This pass has been deactivated following a refund.' });
    }
    const now = Date.now();
    db.prepare('UPDATE sync_decks SET state_json = ?, updated_at = ? WHERE deck_code = ?').run(
      serialized,
      now,
      code
    );
    return res.json({ ok: true, updatedAt: now, state: sanitized });
  });

  // 5. Admin Endpoint to Publish a 24h Header Sponsor
  app.post('/api/admin/sponsor', rateLimit(10, 'admin'), (req, res) => {
    const adminKey = env.ADMIN_API_KEY;
    const provided = String(req.headers['x-admin-key'] || '');
    if (!adminKey || !provided) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const hmacKey = 'unpause-admin-compare';
    const a = crypto.createHmac('sha256', hmacKey).update(adminKey, 'utf8').digest();
    const b = crypto.createHmac('sha256', hmacKey).update(provided, 'utf8').digest();
    if (!crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const badgeText = String(req.body?.badgeText || '').trim().slice(0, 60);
    const rawUrl = String(req.body?.targetUrl || '').trim();
    const rawHours = Number(req.body?.durationHours ?? 24);
    const durationHours = Number.isFinite(rawHours) ? Math.min(720, Math.max(1, rawHours)) : 24;

    let normalizedTargetUrl = '';
    try {
      if (rawUrl.length <= 512) {
        const parsedUrl = new URL(rawUrl);
        if (
          parsedUrl.protocol === 'https:' &&
          parsedUrl.hostname.includes('.') &&
          !parsedUrl.username &&
          !parsedUrl.password
        ) {
          normalizedTargetUrl = parsedUrl.toString();
        }
      }
    } catch {
      normalizedTargetUrl = '';
    }

    if (!badgeText || !normalizedTargetUrl) {
      return res.status(400).json({ error: 'Valid badgeText and https:// targetUrl required' });
    }

    const now = Date.now();
    const expiresAt = now + Math.round(durationHours * 3600 * 1000);
    db.prepare(
      'INSERT INTO sponsors (badge_text, target_url, starts_at, expires_at, active) VALUES (?, ?, ?, ?, 1)'
    ).run(badgeText, normalizedTargetUrl, now, expiresAt);

    return res.json({ ok: true, badgeText, targetUrl: normalizedTargetUrl, expiresAt });
  });

  // Explicit JSON 404 for unknown /api routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Serve compiled Vite static bundle in production with server-side SEO/AEO route prerendering
  const distDir = path.join(__dirname, '..', 'dist');
  const distIndexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(distDir)) {
    const baseIndexHtml = fs.existsSync(distIndexPath)
      ? fs.readFileSync(distIndexPath, 'utf8')
      : '';
    const assetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      app.use(
        '/assets',
        express.static(assetsDir, { maxAge: '365d', immutable: true, fallthrough: false })
      );
    }
    app.use(
      express.static(distDir, {
        maxAge: '1h',
        index: false,
      })
    );
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.setHeader('Cache-Control', 'no-cache');
      if (!baseIndexHtml) {
        return res.sendFile('index.html', { root: distDir });
      }
      const rendered = renderDynamicIndexHtml(baseIndexHtml, req.query, computePassPriceUsd());
      return res.type('html').send(rendered);
    });
  }

  return { app, db };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const port = Number(process.env.PORT || 3001);
  const { app } = createApp();
  app.listen(port, () => {
    console.log(`[Unpause] Server active on http://localhost:${port}`);
  });
}

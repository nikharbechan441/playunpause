import crypto from 'node:crypto';
import { verifyWhopWebhook, generateDeckCode } from '../server/webhookAuth.js';
import { TOP_GAMES, resolveGameIdFromSlug } from '../src/data/games/allGames.js';

const DECK_CODE_REGEX = /^UP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8,12}$/;
const EMAIL_CLAIM_WINDOW_MS = 30 * 60 * 1000;
const DEFAULT_LAUNCH_CUTOFF_ISO = '2026-11-18T11:00:00Z';

const CSP_HEADER = [
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
].join('; ');

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
    desc: 'Privacy-first architecture for playunpause.com: zero behavioral ad trackers, keyed HMAC email hashing, Cloudflare D1 edge storage, and 7-day deletion rights.',
    h1: 'Unpause Privacy Notice (POPIA · EU/UK GDPR · CCPA)',
    body: 'Unpause runs zero third-party behavioral ad networks and never sells personal information. Free calculator inputs stay in your browser localStorage. Paid pass fulfillment via Whop/Stripe stores only a keyed HMAC-SHA256 hash of your checkout email, receipt reference, and checklist JSON on Cloudflare Workers & D1 encrypted storage. Request access or deletion anytime via hello@playunpause.com.',
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
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(pageTitle)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="description" content="${escapeHtml(pageDesc)}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      () => `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:description" content="${escapeHtml(pageDesc)}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="twitter:description" content="${escapeHtml(pageDesc)}" />`
    );

  if (mainHtml) {
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/, () => `<div id="root">${mainHtml}</div>`);
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
    html = html.replace('</head>', () => `  <script type="application/ld+json">${safeJson}</script>\n  </head>`);
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

function applySecurityHeaders(headers, env = {}) {
  headers.set('Content-Security-Policy', CSP_HEADER);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  if ((env.NODE_ENV || 'production') === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return headers;
}

function jsonResponse(body, status = 200, env = {}, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  });
  applySecurityHeaders(headers, env);
  return new Response(JSON.stringify(body), { status, headers });
}

// Per-isolate, per-scope token-bucket rate limiter
const scopeMaps = new Map();
let globalReqCounter = 0;

function checkRateLimit(request, maxPerMinute = 90, scope = 'global', env = {}) {
  const now = Date.now();
  globalReqCounter += 1;

  let scopeBuckets = scopeMaps.get(scope);
  if (!scopeBuckets) {
    scopeBuckets = new Map();
    scopeMaps.set(scope, scopeBuckets);
  }

  if (globalReqCounter % 200 === 0) {
    for (const [k, v] of scopeBuckets.entries()) {
      if (now - v.windowStart > 60_000) scopeBuckets.delete(k);
    }
  }

  const clientIp = (request.headers.get('cf-connecting-ip') || 'edge-local').trim();
  let bucket = scopeBuckets.get(clientIp);
  if (!bucket || now - bucket.windowStart > 60_000) {
    if (scopeBuckets.size >= 5_000) {
      return jsonResponse({ error: 'Server busy. Try again in a moment.' }, 429, env, {
        'Retry-After': '60',
      });
    }
    bucket = { windowStart: now, count: 0 };
    scopeBuckets.set(clientIp, bucket);
  }

  bucket.count += 1;
  if (bucket.count > maxPerMinute) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again in a moment.' }, 429, env, {
      'Retry-After': '60',
    });
  }
  return null;
}

const initializedDbs = new WeakSet();

async function ensureSchema(db) {
  if (!db || initializedDbs.has(db)) return;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS sync_decks (
        deck_code TEXT PRIMARY KEY,
        tier TEXT NOT NULL DEFAULT 'pro',
        email_hash TEXT,
        whop_ref TEXT,
        state_json TEXT NOT NULL DEFAULT '{"crackedSafeIds":[],"checkedRouteIds":[],"savedPins":[]}',
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_sync_decks_email_hash ON sync_decks(email_hash)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_sync_decks_whop_ref ON sync_decks(whop_ref)'),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        transaction_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        product_kind TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        buyer_email_hash TEXT,
        deck_code TEXT,
        created_at INTEGER NOT NULL
      )
    `),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_deck_code ON orders(deck_code)'),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS sponsors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_text TEXT NOT NULL,
        target_url TEXT NOT NULL,
        starts_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      )
    `),
  ]);
  initializedDbs.add(db);
}

function hashIdentifier(value, env) {
  if (!value) return null;
  const clean = String(value).trim().toLowerCase();
  if (!clean) return null;
  const pepper = env.EMAIL_HASH_PEPPER || env.WHOP_WEBHOOK_SECRET || 'unpause-local-dev-pepper';
  return crypto.createHmac('sha256', pepper).update(clean).digest('hex');
}

function legacyUnsaltedHash(value) {
  if (!value) return null;
  const clean = String(value).trim().toLowerCase();
  if (!clean) return null;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

function computePassPriceUsd(env = {}, nowMs = Date.now()) {
  const cutoffIso = env.LAUNCH_CUTOFF_ISO || DEFAULT_LAUNCH_CUTOFF_ISO;
  const cutoffMs = Date.parse(cutoffIso);
  if (Number.isFinite(cutoffMs) && nowMs >= cutoffMs) {
    return 9.99;
  }
  return 6.99;
}

function isDemoUnlockPermitted(env = {}) {
  return (
    (env.NODE_ENV || 'production') !== 'production' &&
    String(env.ALLOW_DEMO_UNLOCK).toLowerCase() === 'true'
  );
}

async function issueOrReuseDeckCode(db, { tier = 'pro', emailHash = null, whopRef = null }) {
  if (whopRef) {
    const existing = await db
      .prepare('SELECT deck_code, active FROM sync_decks WHERE whop_ref = ? LIMIT 1')
      .bind(whopRef)
      .first();
    if (existing) {
      if (Number(existing.active) === 0) {
        await db
          .prepare('UPDATE sync_decks SET active = 1, updated_at = ? WHERE deck_code = ?')
          .bind(Date.now(), existing.deck_code)
          .run();
      }
      return existing.deck_code;
    }
  }

  const now = Date.now();
  const initialJson = JSON.stringify({ crackedSafeIds: [], checkedRouteIds: [], savedPins: [] });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateDeckCode(8);
    try {
      await db
        .prepare(
          `INSERT INTO sync_decks (deck_code, tier, email_hash, whop_ref, state_json, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
        )
        .bind(code, tier, emailHash ?? null, whopRef ?? null, initialJson, now, now)
        .run();
      return code;
    } catch {
      // Retry on rare collision
    }
  }
  throw new Error('Could not allocate unique deck code');
}

async function readBoundedBytes(request, maxBytes) {
  const lenHeader = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(lenHeader) && lenHeader > maxBytes) {
    return { tooLarge: true, buf: null };
  }
  const ab = await request.arrayBuffer();
  if (ab.byteLength > maxBytes) {
    return { tooLarge: true, buf: null };
  }
  return { tooLarge: false, buf: Buffer.from(ab) };
}

async function readJsonBody(request, env, maxBytes = 65_536) {
  const { tooLarge, buf } = await readBoundedBytes(request, maxBytes);
  if (tooLarge) {
    return { errorResp: jsonResponse({ error: 'Payload too large' }, 413, env), data: null };
  }
  if (!buf || buf.length === 0) {
    return { errorResp: null, data: {} };
  }
  try {
    return { errorResp: null, data: JSON.parse(buf.toString('utf8')) };
  } catch {
    return { errorResp: jsonResponse({ error: 'Malformed JSON body' }, 400, env), data: null };
  }
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    // 1. Whop Webhook Endpoints (/api/webhooks/whop)
    if (pathname === '/api/webhooks/whop') {
      if (method === 'GET' || method === 'HEAD') {
        const limited = checkRateLimit(request, 60, 'whop_webhook_probe', env);
        if (limited) return limited;
        const resp = jsonResponse({ ok: true, endpoint: 'whop_webhook', ready: true }, 200, env);
        return method === 'HEAD' ? new Response(null, { status: 200, headers: resp.headers }) : resp;
      }

      if (method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, env);
      }

      const limited = checkRateLimit(request, 120, 'whop_webhook', env);
      if (limited) return limited;

      if (!env.DB) {
        return jsonResponse({ error: 'Database binding not configured' }, 503, env);
      }
      await ensureSchema(env.DB);

      const { tooLarge, buf: rawBody } = await readBoundedBytes(request, 131_072);
      if (tooLarge) {
        return jsonResponse({ error: 'Webhook payload too large' }, 413, env);
      }

      const plainHeaders = {};
      for (const [k, v] of request.headers.entries()) {
        plainHeaders[k.toLowerCase()] = v;
      }

      const check = verifyWhopWebhook({
        rawBody,
        headers: plainHeaders,
        secret: env.WHOP_WEBHOOK_SECRET,
      });

      if (!check.valid) {
        return jsonResponse({ error: 'Invalid webhook signature' }, 401, env);
      }

      let payload;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return jsonResponse({ error: 'Malformed JSON payload' }, 400, env);
      }

      const eventType = String(payload.type || payload.action || '');
      const data = payload.data || {};
      const txId = String(data.id || check.eventId || payload.id || '').trim();
      if (!txId) {
        return jsonResponse({ error: 'Missing transaction reference' }, 400, env);
      }

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
          const byWhopRef = await env.DB.prepare(
            'SELECT deck_code FROM sync_decks WHERE whop_ref = ? LIMIT 1'
          )
            .bind(ref)
            .first();
          const byOrder =
            byWhopRef ||
            (await env.DB.prepare(
              'SELECT deck_code FROM orders WHERE transaction_id = ? AND deck_code IS NOT NULL LIMIT 1'
            )
              .bind(ref)
              .first());
          if (byOrder?.deck_code) {
            revokedDeck = byOrder.deck_code;
            break;
          }
        }

        if (revokedDeck) {
          await env.DB.prepare('UPDATE sync_decks SET active = 0, updated_at = ? WHERE deck_code = ?')
            .bind(Date.now(), revokedDeck)
            .run();
        }
        return jsonResponse({ ok: true, revoked: Boolean(revokedDeck), deckCode: revokedDeck }, 200, env);
      }

      const existingOrder = await env.DB.prepare(
        'SELECT deck_code, product_kind FROM orders WHERE transaction_id = ?'
      )
        .bind(txId)
        .first();
      if (existingOrder) {
        return jsonResponse(
          {
            ok: true,
            duplicate: true,
            productKind: existingOrder.product_kind,
            deckCode: existingOrder.deck_code,
          },
          200,
          env
        );
      }

      const validEvents = new Set([
        'payment.succeeded',
        'payment_succeeded',
        'membership.went_valid',
        'membership_went_valid',
        'invoice.paid',
      ]);
      if (!validEvents.has(eventType)) {
        return jsonResponse({ ok: true, ignored: true }, 200, env);
      }

      const rawAmountField =
        data.final_amount !== undefined && data.final_amount !== null
          ? data.final_amount
          : data.amount_after_fees ?? data.amount;

      if (rawAmountField === undefined || rawAmountField === null || rawAmountField === '') {
        return jsonResponse({ error: 'Missing payment amount' }, 400, env);
      }
      const rawAmount = Number(rawAmountField);
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        return jsonResponse({ error: 'Non-positive payment amount rejected' }, 400, env);
      }
      if (Number.isInteger(rawAmount) && rawAmount > 250 && rawAmount < 500) {
        return jsonResponse({ error: 'Ambiguous payment amount rejected' }, 400, env);
      }

      const currency = String(data.currency || '').trim().toLowerCase();
      if (currency !== 'usd') {
        return jsonResponse({ error: 'Unsupported payment currency' }, 400, env);
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

      if ((env.NODE_ENV || 'production') === 'production' && (!passIds.length || !sponsorIds.length)) {
        return jsonResponse({ error: 'Webhook plan IDs not configured' }, 503, env);
      }

      const matchesAny = (targets) =>
        targets.some((t) => (planId && t === planId) || (productId && t === productId));

      let productKind = null;
      if (sponsorIds.length && matchesAny(sponsorIds)) {
        productKind = 'sponsor_24h';
      } else if (passIds.length && matchesAny(passIds)) {
        productKind = 'nightrun_pass';
      } else if (passIds.length || sponsorIds.length) {
        return jsonResponse({ error: 'Missing or unrecognized product plan ID' }, 400, env);
      } else {
        productKind = amountCents >= 9900 ? 'sponsor_24h' : 'nightrun_pass';
      }

      const minCentsRequired = productKind === 'sponsor_24h' ? 9900 : 500;
      if (amountCents < minCentsRequired) {
        return jsonResponse({ error: 'Payment below minimum product threshold' }, 400, env);
      }

      const buyerEmail = data.user?.email || data.email || data.billing_details?.email || '';
      const emailHash = hashIdentifier(buyerEmail, env);
      const whopRef = String(
        data.membership_id || data.membership?.id || data.license_key || txId
      ).trim();

      let deckCode = null;
      if (productKind === 'nightrun_pass') {
        deckCode = await issueOrReuseDeckCode(env.DB, { tier: 'pro', emailHash, whopRef });
      }

      const existingForDeck = deckCode
        ? await env.DB.prepare(
            'SELECT transaction_id FROM orders WHERE deck_code = ? AND product_kind = ? LIMIT 1'
          )
            .bind(deckCode, 'nightrun_pass')
            .first()
        : null;

      if (!existingForDeck) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO orders (transaction_id, event_type, product_kind, amount_cents, currency, buyer_email_hash, deck_code, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            txId,
            eventType,
            productKind,
            amountCents,
            currency,
            emailHash ?? null,
            deckCode ?? null,
            Date.now()
          )
          .run();
      }

      return jsonResponse({ ok: true, productKind, deckCode }, 200, env);
    }

    // 2. Public Runtime Config & Active Sponsor Slot (/api/config)
    if (pathname === '/api/config' && method === 'GET') {
      const limited = checkRateLimit(request, 120, 'config', env);
      if (limited) return limited;

      const now = Date.now();
      let activeSponsor = null;
      if (env.DB) {
        await ensureSchema(env.DB);
        activeSponsor = await env.DB.prepare(
          'SELECT badge_text, target_url, expires_at FROM sponsors WHERE active = 1 AND starts_at <= ? AND expires_at > ? ORDER BY id DESC LIMIT 1'
        )
          .bind(now, now)
          .first();
      }

      return jsonResponse(
        {
          brand: 'Unpause',
          domain: 'playunpause.com',
          supportEmail: env.SUPPORT_EMAIL || 'hello@playunpause.com',
          sponsorEmail: env.SPONSOR_EMAIL || 'sponsors@playunpause.com',
          passPriceUsd: computePassPriceUsd(env, now),
          launchPriceUsd: 9.99,
          sponsorPriceUsd: 149,
          passCheckoutUrl:
            env.WHOP_PASS_CHECKOUT_URL ||
            'https://whop.com/playunpause/unpause-one-time-all-access-pass/',
          sponsorCheckoutUrl:
            env.WHOP_SPONSOR_CHECKOUT_URL ||
            'https://whop.com/playunpause/unpause-24-hour-featured-header-sponsor/',
          affiliates: {
            ps5SsdUrl:
              env.AFFILIATE_PS5_SSD_URL ||
              'https://www.amazon.com/s?k=WD+BLACK+2TB+SN850X+NVMe+SSD+with+Heatsink+PS5',
            xboxCardUrl:
              env.AFFILIATE_XBOX_CARD_URL ||
              'https://www.amazon.com/s?k=WD+BLACK+C50+1TB+Expansion+Card+Xbox',
            topupsUrl: env.AFFILIATE_TOPUPS_URL || 'https://www.loaded.com/',
          },
          demoUnlockEnabled: isDemoUnlockPermitted(env),
          activeSponsor: activeSponsor
            ? {
                badgeText: activeSponsor.badge_text,
                targetUrl: activeSponsor.target_url,
                expiresAt: activeSponsor.expires_at,
              }
            : null,
        },
        200,
        env,
        { 'Cache-Control': 'no-store' }
      );
    }

    // 3. Claim / Lookup Unlocked Deck Code (/api/pass/activate)
    if (pathname === '/api/pass/activate' && method === 'POST') {
      const limited = checkRateLimit(request, 20, 'activate', env);
      if (limited) return limited;

      if (!env.DB) {
        return jsonResponse({ error: 'Database binding not configured' }, 503, env);
      }
      await ensureSchema(env.DB);

      const { errorResp, data: body } = await readJsonBody(request, env);
      if (errorResp) return errorResp;

      const rawInput = String(body?.codeOrEmail || '').trim();
      const receiptRef = String(body?.receiptRef || '').trim();
      const demoRequested = Boolean(body?.demoUnlock);

      if (demoRequested) {
        if (!isDemoUnlockPermitted(env)) {
          return jsonResponse({ error: 'Demo unlock is disabled in production.' }, 403, env);
        }
        const code = await issueOrReuseDeckCode(env.DB, { tier: 'pro', whopRef: 'demo' });
        const existingDemo = await env.DB.prepare(
          'SELECT state_json FROM sync_decks WHERE deck_code = ?'
        )
          .bind(code)
          .first();
        return jsonResponse(
          {
            ok: true,
            deckCode: code,
            tier: 'pro',
            state: parseStoredState(existingDemo?.state_json),
          },
          200,
          env
        );
      }

      if (!rawInput || rawInput.length > 120) {
        return jsonResponse(
          {
            error:
              'Enter your UP-XXXXXXXX sync code, Whop receipt ID (mem_ / pay_), or checkout email.',
          },
          400,
          env
        );
      }

      const upper = rawInput.toUpperCase();
      if (DECK_CODE_REGEX.test(upper)) {
        const deck = await env.DB.prepare(
          'SELECT deck_code, tier, active, state_json FROM sync_decks WHERE deck_code = ?'
        )
          .bind(upper)
          .first();
        if (!deck) {
          return jsonResponse(
            { error: 'Sync code not found. Double-check the characters.' },
            404,
            env
          );
        }
        if (Number(deck.active) === 0) {
          return jsonResponse(
            {
              error:
                'This pass was refunded or deactivated. Contact hello@playunpause.com for help.',
            },
            403,
            env
          );
        }
        return jsonResponse(
          {
            ok: true,
            deckCode: deck.deck_code,
            tier: deck.tier,
            state: parseStoredState(deck.state_json),
          },
          200,
          env
        );
      }

      if (rawInput.includes('@')) {
        const emailHash = hashIdentifier(rawInput, env);
        const legacyHash = legacyUnsaltedHash(rawInput);
        const deck = await env.DB.prepare(
          'SELECT deck_code, tier, whop_ref, active, state_json, created_at FROM sync_decks WHERE email_hash IN (?, ?) ORDER BY created_at DESC LIMIT 1'
        )
          .bind(emailHash, legacyHash)
          .first();

        if (deck) {
          if (Number(deck.active) === 0) {
            return jsonResponse(
              {
                error:
                  'This pass was refunded or deactivated. Contact hello@playunpause.com for help.',
              },
              403,
              env
            );
          }
          const withinClaimWindow = Date.now() - Number(deck.created_at) <= EMAIL_CLAIM_WINDOW_MS;
          let matchingProof = Boolean(receiptRef && deck.whop_ref && receiptRef === deck.whop_ref);
          if (!matchingProof && receiptRef) {
            const orderMatch = await env.DB.prepare(
              'SELECT 1 AS matched FROM orders WHERE transaction_id = ? AND deck_code = ? LIMIT 1'
            )
              .bind(receiptRef, deck.deck_code)
              .first();
            matchingProof = Boolean(orderMatch);
          }
          if (withinClaimWindow || matchingProof) {
            return jsonResponse(
              {
                ok: true,
                deckCode: deck.deck_code,
                tier: deck.tier,
                state: parseStoredState(deck.state_json),
              },
              200,
              env
            );
          }
          return jsonResponse(
            {
              error:
                'For security on older orders, enter your saved UP-XXXXXXXX sync code or the mem_ / pay_ receipt ID from your Whop confirmation email.',
            },
            403,
            env
          );
        }
        return jsonResponse(
          {
            error:
              'No recent pass found for that email yet. Wait 5 seconds after Whop checkout or paste your mem_ / pay_ receipt ID.',
          },
          404,
          env
        );
      }

      const byWhopRef = await env.DB.prepare(
        'SELECT deck_code, tier, active, state_json FROM sync_decks WHERE whop_ref = ? LIMIT 1'
      )
        .bind(rawInput)
        .first();
      const byRef =
        byWhopRef ||
        (await env.DB.prepare(
          'SELECT s.deck_code, s.tier, s.active, s.state_json FROM orders o JOIN sync_decks s ON s.deck_code = o.deck_code WHERE o.transaction_id = ? LIMIT 1'
        )
          .bind(rawInput)
          .first());

      if (byRef) {
        if (Number(byRef.active) === 0) {
          return jsonResponse(
            {
              error:
                'This pass was refunded or deactivated. Contact hello@playunpause.com for help.',
            },
            403,
            env
          );
        }
        return jsonResponse(
          {
            ok: true,
            deckCode: byRef.deck_code,
            tier: byRef.tier,
            state: parseStoredState(byRef.state_json),
          },
          200,
          env
        );
      }

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
            const passIds = String(env.WHOP_PASS_PLAN_ID || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            const memPlanId = String(mem?.plan || mem?.plan_id || '').trim();
            const memProductId = String(mem?.product || mem?.product_id || '').trim();
            const planMatches =
              (env.NODE_ENV || 'production') === 'production'
                ? passIds.length > 0 &&
                  passIds.some((t) => t === memPlanId || t === memProductId)
                : !passIds.length || passIds.some((t) => t === memPlanId || t === memProductId);
            if (
              mem &&
              planMatches &&
              (mem.valid === true || mem.status === 'completed' || mem.status === 'active')
            ) {
              const newCode = await issueOrReuseDeckCode(env.DB, {
                tier: 'pro',
                emailHash: hashIdentifier(mem.email || '', env),
                whopRef: rawInput,
              });
              const stored = await env.DB.prepare(
                'SELECT state_json FROM sync_decks WHERE deck_code = ?'
              )
                .bind(newCode)
                .first();
              return jsonResponse(
                {
                  ok: true,
                  deckCode: newCode,
                  tier: 'pro',
                  state: parseStoredState(stored?.state_json),
                },
                200,
                env
              );
            }
          }
        } catch {
          // Fall through to 404
        }
      }

      return jsonResponse(
        {
          error:
            'Code or key not recognized. Enter your UP-XXXXXXXX sync code or Whop mem_ / pay_ receipt ID.',
        },
        404,
        env
      );
    }

    // 4. Read & Save Cloud Sync State (/api/sync/:code)
    if (pathname.startsWith('/api/sync/')) {
      const code = decodeURIComponent(pathname.slice('/api/sync/'.length)).trim().toUpperCase();
      if (!DECK_CODE_REGEX.test(code)) {
        return jsonResponse({ error: 'Invalid sync code format' }, 400, env);
      }

      if (!env.DB) {
        return jsonResponse({ error: 'Database binding not configured' }, 503, env);
      }
      await ensureSchema(env.DB);

      if (method === 'GET') {
        const limited = checkRateLimit(request, 60, 'sync_read', env);
        if (limited) return limited;

        const deck = await env.DB.prepare(
          'SELECT deck_code, tier, active, state_json, updated_at FROM sync_decks WHERE deck_code = ?'
        )
          .bind(code)
          .first();
        if (!deck) {
          return jsonResponse({ error: 'Deck code not found' }, 404, env);
        }
        if (Number(deck.active) === 0) {
          return jsonResponse(
            { error: 'This pass has been deactivated following a refund.' },
            403,
            env
          );
        }
        return jsonResponse(
          {
            ok: true,
            deckCode: deck.deck_code,
            tier: deck.tier,
            updatedAt: deck.updated_at,
            state: parseStoredState(deck.state_json),
          },
          200,
          env,
          { 'Cache-Control': 'no-store' }
        );
      }

      if (method === 'PUT') {
        const limited = checkRateLimit(request, 60, 'sync_write', env);
        if (limited) return limited;

        const { errorResp, data: body } = await readJsonBody(request, env);
        if (errorResp) return errorResp;

        const sanitized = sanitizeSyncState(body?.state);
        if (!sanitized) {
          return jsonResponse({ error: 'Invalid state object' }, 400, env);
        }
        const serialized = JSON.stringify(sanitized);
        if (Buffer.byteLength(serialized, 'utf8') > 48_000) {
          return jsonResponse({ error: 'State payload exceeds 48KB limit' }, 413, env);
        }

        const deck = await env.DB.prepare('SELECT active FROM sync_decks WHERE deck_code = ?')
          .bind(code)
          .first();
        if (!deck) {
          return jsonResponse({ error: 'Deck code not found' }, 404, env);
        }
        if (Number(deck.active) === 0) {
          return jsonResponse(
            { error: 'This pass has been deactivated following a refund.' },
            403,
            env
          );
        }

        const now = Date.now();
        await env.DB.prepare(
          'UPDATE sync_decks SET state_json = ?, updated_at = ? WHERE deck_code = ?'
        )
          .bind(serialized, now, code)
          .run();

        return jsonResponse({ ok: true, updatedAt: now, state: sanitized }, 200, env);
      }

      return jsonResponse({ error: 'Method not allowed' }, 405, env);
    }

    // 5. Admin Endpoint to Publish a 24h Header Sponsor (/api/admin/sponsor)
    if (pathname === '/api/admin/sponsor' && method === 'POST') {
      const limited = checkRateLimit(request, 10, 'admin', env);
      if (limited) return limited;

      const adminKey = env.ADMIN_API_KEY;
      const provided = String(request.headers.get('x-admin-key') || '');
      if (!adminKey || !provided) {
        return jsonResponse({ error: 'Unauthorized' }, 401, env);
      }
      const hmacKey = 'unpause-admin-compare';
      const a = crypto.createHmac('sha256', hmacKey).update(adminKey, 'utf8').digest();
      const b = crypto.createHmac('sha256', hmacKey).update(provided, 'utf8').digest();
      if (!crypto.timingSafeEqual(a, b)) {
        return jsonResponse({ error: 'Unauthorized' }, 401, env);
      }

      if (!env.DB) {
        return jsonResponse({ error: 'Database binding not configured' }, 503, env);
      }
      await ensureSchema(env.DB);

      const { errorResp, data: body } = await readJsonBody(request, env);
      if (errorResp) return errorResp;

      const badgeText = String(body?.badgeText || '').trim().slice(0, 60);
      const rawUrl = String(body?.targetUrl || '').trim();
      const rawHours = Number(body?.durationHours ?? 24);
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
        return jsonResponse({ error: 'Valid badgeText and https:// targetUrl required' }, 400, env);
      }

      const now = Date.now();
      const expiresAt = now + Math.round(durationHours * 3600 * 1000);
      await env.DB.prepare(
        'INSERT INTO sponsors (badge_text, target_url, starts_at, expires_at, active) VALUES (?, ?, ?, ?, 1)'
      )
        .bind(badgeText, normalizedTargetUrl, now, expiresAt)
        .run();

      return jsonResponse({ ok: true, badgeText, targetUrl: normalizedTargetUrl, expiresAt }, 200, env);
    }

    // Unknown /api/* route
    if (pathname.startsWith('/api')) {
      return jsonResponse({ error: 'API route not found' }, 404, env);
    }

    // Static Assets & Edge SEO Prerendering
    if (method !== 'GET' && method !== 'HEAD') {
      return jsonResponse({ error: 'Method not allowed' }, 405, env);
    }

    if (!env.ASSETS) {
      return new Response('Static assets binding missing', { status: 503 });
    }

    if (pathname !== '/' && pathname !== '/index.html') {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status !== 404) {
        const headers = new Headers(assetResp.headers);
        applySecurityHeaders(headers, env);
        if (pathname.startsWith('/assets/')) {
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
        return new Response(method === 'HEAD' ? null : assetResp.body, {
          status: assetResp.status,
          headers,
        });
      }
    }

    const indexReq = new Request(new URL('/index.html', request.url), { method: 'GET' });
    const indexResp = await env.ASSETS.fetch(indexReq);
    const baseHtml = await indexResp.text();
    const queryObj = Object.fromEntries(url.searchParams.entries());
    const renderedHtml = renderDynamicIndexHtml(baseHtml, queryObj, computePassPriceUsd(env));

    const headers = new Headers({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    applySecurityHeaders(headers, env);
    return new Response(method === 'HEAD' ? null : renderedHtml, {
      status: 200,
      headers,
    });
  },
};

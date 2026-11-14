import crypto from 'node:crypto';
import { verifyWhopWebhook, generateDeckCode } from '../server/webhookAuth.js';
import {
  isSafePublicHttpsUrl,
  extractWebhookAmountCents,
  classifyUnconfiguredWebhookProduct,
  sanitizeSponsorBadgeText,
  checkAndSweepRateLimit,
} from '../server/securityHelpers.js';
import { resolveSeoRequest } from '../src/data/seoRoutes.js';
import {
  applyHttpSecurityHeaders,
  getStaticAssetCacheControl,
  isPublicCrossOriginAssetPath,
  isStaticAssetPath,
  renderSeoHtmlDocument,
  resolveWwwRedirectLocation,
} from '../src/data/ssrHtml.js';

const DECK_CODE_REGEX = /^UP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8,12}$/;
const DEFAULT_LAUNCH_CUTOFF_ISO = '2026-11-18T11:00:00Z';

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

function applySecurityHeaders(headers, env = {}, opts = {}) {
  return applyHttpSecurityHeaders(headers, env, opts);
}

function jsonResponse(body, status = 200, env = {}, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    ...extraHeaders,
  });
  applySecurityHeaders(headers, env);
  return new Response(JSON.stringify(body), { status, headers });
}

// Per-isolate, per-scope LRU + TTL sliding rate limiter
const scopeMaps = new Map();

function checkRateLimit(request, maxPerMinute = 90, scope = 'global', env = {}) {
  let scopeBuckets = scopeMaps.get(scope);
  if (!scopeBuckets) {
    scopeBuckets = new Map();
    scopeMaps.set(scope, scopeBuckets);
  }

  const clientIp = (request.headers.get('cf-connecting-ip') || 'edge-local').trim();
  const rl = checkAndSweepRateLimit(scopeBuckets, clientIp, {
    limit: maxPerMinute,
    windowMs: 60_000,
    maxBuckets: 5_000,
  });

  if (!rl.allowed) {
    const retryAfterSec = String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)));
    return jsonResponse({ error: 'Rate limit exceeded. Try again in a moment.' }, 429, env, {
      'Retry-After': retryAfterSec,
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
        whop_ref TEXT,
        starts_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS processed_webhooks (
        webhook_key TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        received_at INTEGER NOT NULL
      )
    `),
  ]);
  try {
    await db.prepare('ALTER TABLE sponsors ADD COLUMN whop_ref TEXT').run();
  } catch {
    // Column already exists on fresh or migrated schema
  }
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sponsors_whop_ref ON sponsors(whop_ref)').run();
  initializedDbs.add(db);
}

function hashIdentifier(value, env = {}) {
  if (!value) return null;
  const clean = String(value).trim().toLowerCase();
  if (!clean) return null;
  const pepper =
    env.EMAIL_HASH_PEPPER ||
    (env.WHOP_WEBHOOK_SECRET
      ? crypto
          .createHmac('sha256', env.WHOP_WEBHOOK_SECRET)
          .update('unpause-email-pepper-v1')
          .digest('hex')
      : null);
  if (!pepper) {
    if ((env.NODE_ENV || 'production') === 'production') {
      throw new Error('EMAIL_HASH_PEPPER not configured in production');
    }
    return crypto.createHmac('sha256', 'unpause-local-dev-pepper').update(clean).digest('hex');
  }
  return crypto.createHmac('sha256', pepper).update(clean).digest('hex');
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
        return { deckCode: existing.deck_code, revoked: true };
      }
      return { deckCode: existing.deck_code, revoked: false };
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
      return { deckCode: code, revoked: false };
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
  if (request.body && typeof request.body.getReader === 'function') {
    const reader = request.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
          return { tooLarge: true, buf: null };
        }
        chunks.push(Buffer.from(value));
      }
      return { tooLarge: false, buf: Buffer.concat(chunks, total) };
    } finally {
      reader.releaseLock?.();
    }
  }
  const ab = await request.arrayBuffer();
  if (ab.byteLength > maxBytes) {
    return { tooLarge: true, buf: null };
  }
  return { tooLarge: false, buf: Buffer.from(ab) };
}

async function readJsonBody(request, env, maxBytes = 65_536) {
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  const { tooLarge, buf } = await readBoundedBytes(request, maxBytes);
  if (tooLarge) {
    return { errorResp: jsonResponse({ error: 'Payload too large' }, 413, env), data: null };
  }
  if (!buf || buf.length === 0) {
    return { errorResp: null, data: {} };
  }
  if (!ct.includes('application/json')) {
    return {
      errorResp: jsonResponse({ error: 'Content-Type must be application/json' }, 415, env),
      data: null,
    };
  }
  try {
    return { errorResp: null, data: JSON.parse(buf.toString('utf8')) };
  } catch {
    return { errorResp: jsonResponse({ error: 'Malformed JSON body' }, 400, env), data: null };
  }
}

async function handleWorkerRequest(request, env = {}) {
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

      const payloadSha256 = crypto.createHash('sha256').update(rawBody).digest('hex');
      const replayKeys = [`wh_body:${payloadSha256}`];
      if (check.eventId) {
        replayKeys.unshift(`wh_id:${String(check.eventId).trim()}`);
      }

      const replaySeen =
        replayKeys.length === 2
          ? await env.DB.prepare(
              'SELECT webhook_key FROM processed_webhooks WHERE webhook_key IN (?, ?) LIMIT 1'
            )
              .bind(replayKeys[0], replayKeys[1])
              .first()
          : await env.DB.prepare(
              'SELECT webhook_key FROM processed_webhooks WHERE webhook_key = ? LIMIT 1'
            )
              .bind(replayKeys[0])
              .first();

      if (replaySeen) {
        return jsonResponse({ ok: true, duplicate: true }, 200, env);
      }

      let payload;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return jsonResponse({ error: 'Malformed JSON payload' }, 400, env);
      }

      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return jsonResponse({ error: 'Webhook payload must be a JSON object' }, 400, env);
      }

      const eventType = String(payload.type || payload.action || '');
      const data =
        payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
          ? payload.data
          : {};
      const txId = String(data.id || check.eventId || payload.id || '').trim();
      if (!txId) {
        return jsonResponse({ error: 'Missing transaction reference' }, 400, env);
      }

      const nowMs = Date.now();
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
        const refCandidates = Array.from(
          new Set(
            [
              data.membership_id,
              data.membership?.id,
              data.license_key,
              data.payment_id,
              data.payment?.id,
              data.id,
            ]
              .filter((v) => typeof v === 'string' && v.trim())
              .map((v) => v.trim())
          )
        );

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

        const sponsorRevokeRefs = [];
        for (const ref of refCandidates) {
          const matchedSponsor = await env.DB.prepare(
            'SELECT id FROM sponsors WHERE whop_ref = ? AND active = 1 LIMIT 1'
          )
            .bind(ref)
            .first();
          if (matchedSponsor) {
            sponsorRevokeRefs.push(ref);
          }
        }

        const emptyState = JSON.stringify({
          crackedSafeIds: [],
          checkedRouteIds: [],
          savedPins: [],
        });
        const revokeStmts = [];
        if (revokedDeck) {
          revokeStmts.push(
            env.DB.prepare(
              'UPDATE sync_decks SET email_hash = NULL, state_json = ?, active = 0, updated_at = ? WHERE deck_code = ?'
            ).bind(emptyState, nowMs, revokedDeck)
          );
        }
        for (const sRef of sponsorRevokeRefs) {
          revokeStmts.push(
            env.DB.prepare('UPDATE sponsors SET active = 0 WHERE whop_ref = ?').bind(sRef)
          );
        }
        for (const rk of replayKeys) {
          revokeStmts.push(
            env.DB.prepare(
              'INSERT OR IGNORE INTO processed_webhooks (webhook_key, event_type, received_at) VALUES (?, ?, ?)'
            ).bind(rk, eventType, nowMs)
          );
        }
        revokeStmts.push(
          env.DB.prepare('DELETE FROM processed_webhooks WHERE received_at < ?').bind(
            nowMs - 30 * 86_400_000
          )
        );
        await env.DB.batch(revokeStmts);

        return jsonResponse(
          {
            ok: true,
            revoked: Boolean(revokedDeck || sponsorRevokeRefs.length > 0),
            sponsorRevoked: sponsorRevokeRefs.length > 0,
            deckCode: revokedDeck,
          },
          200,
          env
        );
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

      const currency = String(data.currency || '').trim().toLowerCase();
      if (currency !== 'usd') {
        return jsonResponse({ error: 'Unsupported payment currency' }, 400, env);
      }

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
        productKind = classifyUnconfiguredWebhookProduct(payload);
        if (!productKind) {
          return jsonResponse({ error: 'Missing or invalid payment amount' }, 400, env);
        }
      }

      const amountCents = extractWebhookAmountCents(payload, {
        isSponsorPlan: productKind === 'sponsor_24h',
      });
      if (amountCents === null) {
        return jsonResponse({ error: 'Missing or invalid payment amount' }, 400, env);
      }
      if (Number.isInteger(Number(data.final_amount ?? data.amount)) && amountCents > 250 && amountCents < 500) {
        return jsonResponse({ error: 'Payment below minimum product threshold' }, 400, env);
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
        const issued = await issueOrReuseDeckCode(env.DB, { tier: 'pro', emailHash, whopRef });
        if (issued.revoked) {
          await env.DB.batch(
            replayKeys.map((rk) =>
              env.DB.prepare(
                'INSERT OR IGNORE INTO processed_webhooks (webhook_key, event_type, received_at) VALUES (?, ?, ?)'
              ).bind(rk, eventType, nowMs)
            )
          );
          return jsonResponse(
            { ok: true, ignored: true, revoked: true, deckCode: issued.deckCode },
            200,
            env
          );
        }
        deckCode = issued.deckCode;
      }

      const existingForDeck = deckCode
        ? await env.DB.prepare(
            'SELECT transaction_id FROM orders WHERE deck_code = ? AND product_kind = ? LIMIT 1'
          )
            .bind(deckCode, 'nightrun_pass')
            .first()
        : null;

      const writeBatch = [];
      if (!existingForDeck) {
        writeBatch.push(
          env.DB.prepare(
            `INSERT OR IGNORE INTO orders (transaction_id, event_type, product_kind, amount_cents, currency, buyer_email_hash, deck_code, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            txId,
            eventType,
            productKind,
            amountCents,
            currency,
            emailHash ?? null,
            deckCode ?? null,
            nowMs
          )
        );
      }
      for (const rk of replayKeys) {
        writeBatch.push(
          env.DB.prepare(
            'INSERT OR IGNORE INTO processed_webhooks (webhook_key, event_type, received_at) VALUES (?, ?, ?)'
          ).bind(rk, eventType, nowMs)
        );
      }
      writeBatch.push(
        env.DB.prepare('DELETE FROM processed_webhooks WHERE received_at < ?').bind(
          nowMs - 30 * 86_400_000
        )
      );
      if (writeBatch.length > 0) {
        await env.DB.batch(writeBatch);
      }

      return jsonResponse({ ok: true, productKind, deckCode }, 200, env);
    }

    // 2. Public Runtime Config & Active Sponsor Slot (/api/config)
    if (pathname === '/api/config' && (method === 'GET' || method === 'HEAD')) {
      const limited = checkRateLimit(request, 120, 'config', env);
      if (limited) return limited;

      const now = Date.now();
      let activeSponsor = null;
      if (env.DB) {
        await ensureSchema(env.DB);
        const rawSponsor = await env.DB.prepare(
          'SELECT badge_text, target_url, expires_at FROM sponsors WHERE active = 1 AND starts_at <= ? AND expires_at > ? ORDER BY id DESC LIMIT 1'
        )
          .bind(now, now)
          .first();
        if (rawSponsor) {
          const urlCheck = isSafePublicHttpsUrl(rawSponsor.target_url);
          if (urlCheck.ok) {
            activeSponsor = {
              badgeText: rawSponsor.badge_text,
              targetUrl: urlCheck.normalizedUrl,
              expiresAt: rawSponsor.expires_at,
            };
          }
        }
      }

      const defaultPassCheckout = 'https://whop.com/playunpause/unpause-one-time-all-access-pass/';
      const defaultSponsorCheckout =
        'https://whop.com/playunpause/unpause-24-hour-featured-header-sponsor/';
      const passUrlCheck = isSafePublicHttpsUrl(env.WHOP_PASS_CHECKOUT_URL);
      const sponsorUrlCheck = isSafePublicHttpsUrl(env.WHOP_SPONSOR_CHECKOUT_URL);

      return jsonResponse(
        {
          brand: 'Unpause',
          domain: 'playunpause.com',
          supportEmail: env.SUPPORT_EMAIL || 'hello@playunpause.com',
          sponsorEmail: env.SPONSOR_EMAIL || 'sponsors@playunpause.com',
          legalOperatorName: env.LEGAL_OPERATOR_NAME || '',
          legalServiceAddress: env.LEGAL_SERVICE_ADDRESS || '',
          legalContactPhone: env.LEGAL_CONTACT_PHONE || '',
          passPriceUsd: computePassPriceUsd(env, now),
          launchPriceUsd: 9.99,
          sponsorPriceUsd: 149,
          passCheckoutUrl: passUrlCheck.ok ? passUrlCheck.normalizedUrl : defaultPassCheckout,
          sponsorCheckoutUrl: sponsorUrlCheck.ok
            ? sponsorUrlCheck.normalizedUrl
            : defaultSponsorCheckout,
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
          activeSponsor,
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
        const issued = await issueOrReuseDeckCode(env.DB, { tier: 'pro', whopRef: 'demo' });
        if (issued.revoked) {
          return jsonResponse({ error: 'Demo deck deactivated.' }, 403, env);
        }
        const existingDemo = await env.DB.prepare(
          'SELECT state_json FROM sync_decks WHERE deck_code = ?'
        )
          .bind(issued.deckCode)
          .first();
        return jsonResponse(
          {
            ok: true,
            deckCode: issued.deckCode,
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
              'Enter your UP-XXXXXXXX sync code, Whop receipt ID (mem_ / pay_), or checkout email + receipt.',
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
        const uniformEmailError =
          'For account security, enter your checkout email together with your Whop receipt ID (mem_ / pay_), or use your UP-XXXXXXXX sync code. Contact hello@playunpause.com if refunded or locked.';
        if (!receiptRef || receiptRef.length < 6 || receiptRef.length > 120) {
          return jsonResponse({ error: uniformEmailError }, 403, env);
        }

        const emailHash = hashIdentifier(rawInput, env);
        const deck = emailHash
          ? await env.DB.prepare(
              'SELECT deck_code, tier, whop_ref, active, state_json FROM sync_decks WHERE email_hash = ? ORDER BY created_at DESC LIMIT 1'
            )
              .bind(emailHash)
              .first()
          : null;

        let matchingProof = Boolean(deck && deck.whop_ref && receiptRef === deck.whop_ref);
        if (deck && !matchingProof) {
          const orderMatch = await env.DB.prepare(
            'SELECT 1 AS matched FROM orders WHERE transaction_id = ? AND deck_code = ? LIMIT 1'
          )
            .bind(receiptRef, deck.deck_code)
            .first();
          matchingProof = Boolean(orderMatch);
        }

        if (!deck || Number(deck.active) === 0 || !matchingProof) {
          return jsonResponse({ error: uniformEmailError }, 403, env);
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
              mem.valid === true &&
              !mem.refunded &&
              mem.status !== 'canceled' &&
              mem.status !== 'refunded'
            ) {
              const issued = await issueOrReuseDeckCode(env.DB, {
                tier: 'pro',
                emailHash: hashIdentifier(mem.email || '', env),
                whopRef: rawInput,
              });
              if (issued.revoked) {
                return jsonResponse(
                  {
                    error:
                      'This pass was refunded or deactivated. Contact hello@playunpause.com for help.',
                  },
                  403,
                  env
                );
              }
              const stored = await env.DB.prepare(
                'SELECT state_json FROM sync_decks WHERE deck_code = ?'
              )
                .bind(issued.deckCode)
                .first();
              return jsonResponse(
                {
                  ok: true,
                  deckCode: issued.deckCode,
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
      let code = '';
      try {
        code = decodeURIComponent(pathname.slice('/api/sync/'.length)).trim().toUpperCase();
      } catch {
        return jsonResponse({ error: 'Invalid sync code format' }, 400, env);
      }
      if (!DECK_CODE_REGEX.test(code)) {
        return jsonResponse({ error: 'Invalid sync code format' }, 400, env);
      }

      if (!env.DB) {
        return jsonResponse({ error: 'Database binding not configured' }, 503, env);
      }
      await ensureSchema(env.DB);

      if (method === 'GET' || method === 'HEAD') {
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
            { error: 'This pass is inactive (refunded or deleted).' },
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
            { error: 'This pass is inactive (refunded or deleted).' },
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

      if (method === 'DELETE') {
        const limited = checkRateLimit(request, 20, 'sync_delete', env);
        if (limited) return limited;

        const { errorResp, data: body } = await readJsonBody(request, env);
        if (errorResp) return errorResp;

        const receiptRef = String(body?.receiptRef || '').trim();
        if (!receiptRef || receiptRef.length < 6 || receiptRef.length > 120) {
          return jsonResponse(
            { error: 'Valid receiptRef (Whop mem_ / pay_ ID) is required for erasure.' },
            403,
            env
          );
        }

        const deck = await env.DB.prepare(
          'SELECT deck_code, whop_ref FROM sync_decks WHERE deck_code = ?'
        )
          .bind(code)
          .first();
        if (!deck) {
          return jsonResponse({ error: 'Deck code not found' }, 404, env);
        }

        let authorized = Boolean(deck.whop_ref && receiptRef === deck.whop_ref);
        if (!authorized) {
          const ord = await env.DB.prepare(
            'SELECT 1 AS matched FROM orders WHERE transaction_id = ? AND deck_code = ? LIMIT 1'
          )
            .bind(receiptRef, code)
            .first();
          authorized = Boolean(ord);
        }
        if (!authorized) {
          return jsonResponse(
            { error: 'Receipt reference does not match this sync code.' },
            403,
            env
          );
        }

        const now = Date.now();
        const emptyState = JSON.stringify({
          crackedSafeIds: [],
          checkedRouteIds: [],
          savedPins: [],
        });
        await env.DB.batch([
          env.DB.prepare(
            'UPDATE sync_decks SET email_hash = NULL, whop_ref = NULL, state_json = ?, active = 0, updated_at = ? WHERE deck_code = ?'
          ).bind(emptyState, now, code),
          env.DB.prepare('UPDATE orders SET buyer_email_hash = NULL WHERE deck_code = ?').bind(
            code
          ),
        ]);

        return jsonResponse({ ok: true, deleted: true, deckCode: code }, 200, env);
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

      const badgeText = sanitizeSponsorBadgeText(body?.badgeText);
      const rawUrl = String(body?.targetUrl || '').trim();
      const whopRef = String(body?.whopRef || '').trim().slice(0, 120) || null;
      const rawHours = Number(body?.durationHours ?? 24);
      const durationHours = Number.isFinite(rawHours) ? Math.min(720, Math.max(1, rawHours)) : 24;

      const urlCheck = isSafePublicHttpsUrl(rawUrl);
      if (!badgeText || !urlCheck.ok) {
        return jsonResponse(
          { error: urlCheck.reason || 'Valid badgeText and public https:// targetUrl required' },
          400,
          env
        );
      }
      const normalizedTargetUrl = urlCheck.normalizedUrl;

      const now = Date.now();
      const expiresAt = now + Math.round(durationHours * 3600 * 1000);
      await env.DB.prepare(
        'INSERT INTO sponsors (badge_text, target_url, whop_ref, starts_at, expires_at, active) VALUES (?, ?, ?, ?, ?, 1)'
      )
        .bind(badgeText, normalizedTargetUrl, whopRef, now, expiresAt)
        .run();

      return jsonResponse({ ok: true, badgeText, targetUrl: normalizedTargetUrl, expiresAt }, 200, env);
    }

    // Unknown /api/* route
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return jsonResponse({ error: 'API route not found' }, 404, env);
    }

    // Static Assets & Edge SEO Prerendering
    if (method !== 'GET' && method !== 'HEAD') {
      return jsonResponse({ error: 'Method not allowed' }, 405, env);
    }

    const host = url.hostname.toLowerCase();
    if (host === 'www.playunpause.com') {
      const target = resolveWwwRedirectLocation(pathname, url.searchParams, url.search);
      const redirHeaders = new Headers({
        Location: target,
        'Cache-Control': 'public, max-age=3600',
      });
      applySecurityHeaders(redirHeaders, env);
      return new Response(null, { status: 301, headers: redirHeaders });
    }

    if (!env.ASSETS) {
      return new Response('Static assets binding missing', { status: 503 });
    }

    if (isStaticAssetPath(pathname)) {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status !== 404) {
        const headers = new Headers(assetResp.headers);
        applySecurityHeaders(headers, env, {
          isPublicAsset: isPublicCrossOriginAssetPath(pathname),
        });
        const cacheControl = getStaticAssetCacheControl(pathname);
        if (cacheControl) {
          headers.set('Cache-Control', cacheControl);
        }
        return new Response(method === 'HEAD' ? null : assetResp.body, {
          status: assetResp.status,
          headers,
        });
      }
      const missHeaders = new Headers({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      });
      applySecurityHeaders(missHeaders, env);
      return new Response(method === 'HEAD' ? null : 'Not found', {
        status: 404,
        headers: missHeaders,
      });
    }

    const seoRes = resolveSeoRequest(pathname, url.searchParams);
    if (seoRes.status === 301) {
      const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
      let redirectLocation = seoRes.redirectTo;
      if (isLocalHost) {
        const parsedTarget = new URL(seoRes.redirectTo);
        redirectLocation = `${url.origin}${parsedTarget.pathname}${parsedTarget.search}`;
      }
      const redirHeaders = new Headers({
        Location: redirectLocation,
        'Cache-Control': 'public, max-age=3600',
      });
      applySecurityHeaders(redirHeaders, env);
      return new Response(null, { status: 301, headers: redirHeaders });
    }

    const indexReq = new Request(new URL('/index.html', request.url), { method: 'GET' });
    const indexResp = await env.ASSETS.fetch(indexReq);
    const baseHtml = await indexResp.text();
    const renderedHtml = renderSeoHtmlDocument(baseHtml, seoRes, computePassPriceUsd(env));

    const isEmbed = Boolean(seoRes.isEmbed);
    const headers = new Headers({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': seoRes.notFound ? 'no-store' : 'no-cache',
    });
    if (seoRes.notFound) {
      headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    applySecurityHeaders(headers, env, { isEmbed });
    return new Response(method === 'HEAD' ? null : renderedHtml, {
      status: seoRes.notFound ? 404 : 200,
      headers,
    });
}

export default {
  async fetch(request, env = {}) {
    const method = request.method.toUpperCase();
    const resp = await handleWorkerRequest(request, env);
    if (method === 'HEAD' && resp.body !== null) {
      return new Response(null, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
      });
    }
    return resp;
  },
};

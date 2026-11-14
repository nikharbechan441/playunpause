import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { verifyWhopWebhook, generateDeckCode } from './webhookAuth.js';
import {
  isSafePublicHttpsUrl,
  extractWebhookAmountCents,
  checkAndSweepRateLimit,
} from './securityHelpers.js';
import { resolveSeoRequest } from '../src/data/seoRoutes.js';
import {
  applyHttpSecurityHeaders,
  getStaticAssetCacheControl,
  isPublicCrossOriginAssetPath,
  isStaticAssetPath,
  renderSeoHtmlDocument,
  resolveWwwRedirectLocation,
} from '../src/data/ssrHtml.js';

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
      whop_ref TEXT,
      starts_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS processed_webhooks (
      webhook_key TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      received_at INTEGER NOT NULL
    );
  `);

  // Backward-compatible migrations for existing SQLite databases
  const cols = db.prepare('PRAGMA table_info(sync_decks)').all();
  if (!cols.some((c) => c.name === 'active')) {
    db.exec('ALTER TABLE sync_decks ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  }
  const sponsorCols = db.prepare('PRAGMA table_info(sponsors)').all();
  if (!sponsorCols.some((c) => c.name === 'whop_ref')) {
    db.exec('ALTER TABLE sponsors ADD COLUMN whop_ref TEXT');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_sponsors_whop_ref ON sponsors(whop_ref)');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Strict HTTP Security & Cross-Origin Isolation Headers (Zero 'unsafe-inline', /embed framing re-applied after route resolution)
  app.use((req, res, next) => {
    applyHttpSecurityHeaders(res, env, {
      isPublicAsset: isPublicCrossOriginAssetPath(req.path),
      isEmbed: false,
    });
    next();
  });

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  // Per-scope isolated IP LRU + TTL sliding rate limiter
  function getClientIp(req) {
    if (String(env.TRUST_CF_HEADERS).toLowerCase() === 'true') {
      const cfIp = req.headers['cf-connecting-ip'];
      if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();
    }
    return req.ip || req.socket?.remoteAddress || 'local';
  }

  function rateLimit(maxPerMinute = 90, scope = 'global') {
    const scopeBuckets = new Map();

    return (req, res, next) => {
      const key = `${scope}:${getClientIp(req)}`;
      const rl = checkAndSweepRateLimit(scopeBuckets, key, {
        limit: maxPerMinute,
        windowMs: 60_000,
        maxBuckets: 5_000,
      });
      if (!rl.allowed) {
        const retryAfterSec = String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)));
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({ error: 'Rate limit exceeded. Try again in a moment.' });
      }
      return next();
    };
  }

  const emailPepper =
    env.EMAIL_HASH_PEPPER ||
    (env.WHOP_WEBHOOK_SECRET
      ? crypto
          .createHmac('sha256', env.WHOP_WEBHOOK_SECRET)
          .update('unpause-email-pepper-v1')
          .digest('hex')
      : null);

  function hashIdentifier(value) {
    if (!value) return null;
    const clean = String(value).trim().toLowerCase();
    if (!clean) return null;
    if (!emailPepper) {
      if ((env.NODE_ENV || 'production') === 'production') {
        throw new Error('EMAIL_HASH_PEPPER not configured in production');
      }
      return crypto.createHmac('sha256', 'unpause-local-dev-pepper').update(clean).digest('hex');
    }
    return crypto.createHmac('sha256', emailPepper).update(clean).digest('hex');
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
        if (Number(existing.active) === 0) {
          return { deckCode: existing.deck_code, revoked: true };
        }
        return { deckCode: existing.deck_code, revoked: false };
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
        return { deckCode: code, revoked: false };
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

      const payloadSha256 = crypto.createHash('sha256').update(req.body).digest('hex');
      const replayKeys = [`wh_body:${payloadSha256}`];
      if (check.eventId) {
        replayKeys.unshift(`wh_id:${String(check.eventId).trim()}`);
      }

      const replaySeen =
        replayKeys.length === 2
          ? db
              .prepare('SELECT webhook_key FROM processed_webhooks WHERE webhook_key IN (?, ?) LIMIT 1')
              .get(replayKeys[0], replayKeys[1])
          : db
              .prepare('SELECT webhook_key FROM processed_webhooks WHERE webhook_key = ? LIMIT 1')
              .get(replayKeys[0]);

      if (replaySeen) {
        return res.status(200).json({ ok: true, duplicate: true });
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

      const nowMs = Date.now();
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

        const sponsorRevokeRefs = [];
        for (const ref of refCandidates) {
          const matchedSponsor = db
            .prepare('SELECT id FROM sponsors WHERE whop_ref = ? AND active = 1 LIMIT 1')
            .get(ref);
          if (matchedSponsor) {
            sponsorRevokeRefs.push(ref);
          }
        }

        const emptyState = JSON.stringify({
          crackedSafeIds: [],
          checkedRouteIds: [],
          savedPins: [],
        });
        db.exec('BEGIN IMMEDIATE');
        try {
          if (revokedDeck) {
            db.prepare(
              'UPDATE sync_decks SET email_hash = NULL, state_json = ?, active = 0, updated_at = ? WHERE deck_code = ?'
            ).run(emptyState, nowMs, revokedDeck);
          }
          const deactivateSponsorStmt = db.prepare('UPDATE sponsors SET active = 0 WHERE whop_ref = ?');
          for (const sRef of sponsorRevokeRefs) {
            deactivateSponsorStmt.run(sRef);
          }
          const insertWebhookStmt = db.prepare(
            'INSERT OR IGNORE INTO processed_webhooks (webhook_key, event_type, received_at) VALUES (?, ?, ?)'
          );
          for (const rk of replayKeys) {
            insertWebhookStmt.run(rk, eventType, nowMs);
          }
          db.prepare('DELETE FROM processed_webhooks WHERE received_at < ?').run(
            nowMs - 30 * 86_400_000
          );
          db.exec('COMMIT');
        } catch (err) {
          db.exec('ROLLBACK');
          throw err;
        }

        return res.status(200).json({
          ok: true,
          revoked: Boolean(revokedDeck || sponsorRevokeRefs.length > 0),
          sponsorRevoked: sponsorRevokeRefs.length > 0,
          deckCode: revokedDeck,
        });
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

      const currency = String(data.currency || '').trim().toLowerCase();
      if (currency !== 'usd') {
        return res.status(400).json({ error: 'Unsupported payment currency' });
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
        const provisionalCents = extractWebhookAmountCents(payload, { isSponsorPlan: false });
        if (provisionalCents === null) {
          return res.status(400).json({ error: 'Missing payment amount' });
        }
        productKind = provisionalCents >= 9900 ? 'sponsor_24h' : 'nightrun_pass';
      }

      const amountCents = extractWebhookAmountCents(payload, {
        isSponsorPlan: productKind === 'sponsor_24h',
      });
      if (amountCents === null) {
        return res.status(400).json({ error: 'Missing payment amount' });
      }
      if (Number.isInteger(Number(data.final_amount ?? data.amount)) && amountCents > 250 && amountCents < 500) {
        return res.status(400).json({ error: 'Ambiguous payment amount rejected' });
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
          const issued = issueOrReuseDeckCode({ tier: 'pro', emailHash, whopRef });
          if (issued.revoked) {
            const insertWebhookStmt = db.prepare(
              'INSERT OR IGNORE INTO processed_webhooks (webhook_key, event_type, received_at) VALUES (?, ?, ?)'
            );
            for (const rk of replayKeys) {
              insertWebhookStmt.run(rk, eventType, nowMs);
            }
            db.exec('COMMIT');
            return res
              .status(200)
              .json({ ok: true, ignored: true, revoked: true, deckCode: issued.deckCode });
          }
          deckCode = issued.deckCode;
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
            nowMs
          );
        }
        const insertWebhookStmt = db.prepare(
          'INSERT OR IGNORE INTO processed_webhooks (webhook_key, event_type, received_at) VALUES (?, ?, ?)'
        );
        for (const rk of replayKeys) {
          insertWebhookStmt.run(rk, eventType, nowMs);
        }
        db.prepare('DELETE FROM processed_webhooks WHERE received_at < ?').run(
          nowMs - 30 * 86_400_000
        );
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }

      return res.status(200).json({ ok: true, productKind, deckCode });
    }
  );

  // Enforce strict JSON Content-Type on body-bearing API calls (blocks CSRF simple text/plain posts)
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const len = Number(req.headers['content-length'] || 0);
      const hasBody = (Number.isFinite(len) && len > 0) || Boolean(req.headers['transfer-encoding']);
      if (hasBody && !req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
      }
    }
    return next();
  });

  // Standard JSON parser for application APIs (64kb max)
  app.use('/api', express.json({ limit: '64kb' }));

  // 2. Public Runtime Config & Active Sponsor Slot
  app.get('/api/config', rateLimit(120, 'config'), (req, res) => {
    const now = Date.now();
    const rawSponsor = db
      .prepare(
        'SELECT badge_text, target_url, expires_at FROM sponsors WHERE active = 1 AND starts_at <= ? AND expires_at > ? ORDER BY id DESC LIMIT 1'
      )
      .get(now, now);

    let activeSponsor = null;
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

    const defaultPassCheckout = 'https://whop.com/playunpause/unpause-one-time-all-access-pass/';
    const defaultSponsorCheckout =
      'https://whop.com/playunpause/unpause-24-hour-featured-header-sponsor/';
    const passUrlCheck = isSafePublicHttpsUrl(env.WHOP_PASS_CHECKOUT_URL);
    const sponsorUrlCheck = isSafePublicHttpsUrl(env.WHOP_SPONSOR_CHECKOUT_URL);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      brand: 'Unpause',
      domain: 'playunpause.com',
      supportEmail: env.SUPPORT_EMAIL || 'hello@playunpause.com',
      sponsorEmail: env.SPONSOR_EMAIL || 'sponsors@playunpause.com',
      legalOperatorName: env.LEGAL_OPERATOR_NAME || '',
      legalServiceAddress: env.LEGAL_SERVICE_ADDRESS || '',
      legalContactPhone: env.LEGAL_CONTACT_PHONE || '',
      passPriceUsd: computePassPriceUsd(now),
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
      demoUnlockEnabled: isDemoUnlockPermitted(),
      activeSponsor,
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
      const issued = issueOrReuseDeckCode({ tier: 'pro', whopRef: 'demo' });
      if (issued.revoked) {
        return res.status(403).json({ error: 'Demo deck deactivated.' });
      }
      const existingDemo = db
        .prepare('SELECT state_json FROM sync_decks WHERE deck_code = ?')
        .get(issued.deckCode);
      return res.json({
        ok: true,
        deckCode: issued.deckCode,
        tier: 'pro',
        state: parseStoredState(existingDemo?.state_json),
      });
    }

    if (!rawInput || rawInput.length > 120) {
      return res.status(400).json({
        error: 'Enter your UP-XXXXXXXX sync code, Whop receipt ID (mem_ / pay_), or checkout email + receipt.',
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

    // Case B: Lookup by buyer email (strictly requires matching receiptRef; zero email existence oracle)
    if (rawInput.includes('@')) {
      const uniformEmailError =
        'For account security, enter your checkout email together with your Whop receipt ID (mem_ / pay_), or use your UP-XXXXXXXX sync code. Contact hello@playunpause.com if refunded or locked.';
      if (!receiptRef || receiptRef.length < 6 || receiptRef.length > 120) {
        return res.status(403).json({ error: uniformEmailError });
      }

      const emailHash = hashIdentifier(rawInput);
      const deck = emailHash
        ? db
            .prepare(
              'SELECT deck_code, tier, whop_ref, active, state_json FROM sync_decks WHERE email_hash = ? ORDER BY created_at DESC LIMIT 1'
            )
            .get(emailHash)
        : null;

      let matchingProof = Boolean(deck && deck.whop_ref && receiptRef === deck.whop_ref);
      if (deck && !matchingProof) {
        const orderMatch = db
          .prepare('SELECT 1 FROM orders WHERE transaction_id = ? AND deck_code = ? LIMIT 1')
          .get(receiptRef, deck.deck_code);
        matchingProof = Boolean(orderMatch);
      }

      if (!deck || deck.active === 0 || !matchingProof) {
        return res.status(403).json({ error: uniformEmailError });
      }

      return res.json({
        ok: true,
        deckCode: deck.deck_code,
        tier: deck.tier,
        state: parseStoredState(deck.state_json),
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
          const passIds = String(env.WHOP_PASS_PLAN_ID || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const memPlanId = String(mem?.plan || mem?.plan_id || '').trim();
          const memProductId = String(mem?.product || mem?.product_id || '').trim();
          const planMatches =
            env.NODE_ENV === 'production'
              ? passIds.length > 0 && passIds.some((t) => t === memPlanId || t === memProductId)
              : !passIds.length || passIds.some((t) => t === memPlanId || t === memProductId);
          if (
            mem &&
            planMatches &&
            mem.valid === true &&
            !mem.refunded &&
            mem.status !== 'canceled' &&
            mem.status !== 'refunded'
          ) {
            const issued = issueOrReuseDeckCode({
              tier: 'pro',
              emailHash: hashIdentifier(mem.email || ''),
              whopRef: rawInput,
            });
            if (issued.revoked) {
              return res.status(403).json({
                error:
                  'This pass was refunded or deactivated. Contact hello@playunpause.com for help.',
              });
            }
            const stored = db
              .prepare('SELECT state_json FROM sync_decks WHERE deck_code = ?')
              .get(issued.deckCode);
            return res.json({
              ok: true,
              deckCode: issued.deckCode,
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

  // 4. Read, Save & Erase Cloud Sync State by Deck Code
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
      return res.status(403).json({ error: 'This pass is inactive (refunded or deleted).' });
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
      return res.status(403).json({ error: 'This pass is inactive (refunded or deleted).' });
    }
    const now = Date.now();
    db.prepare('UPDATE sync_decks SET state_json = ?, updated_at = ? WHERE deck_code = ?').run(
      serialized,
      now,
      code
    );
    return res.json({ ok: true, updatedAt: now, state: sanitized });
  });

  app.delete('/api/sync/:code', rateLimit(20, 'sync_delete'), (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!DECK_CODE_REGEX.test(code)) {
      return res.status(400).json({ error: 'Invalid sync code format' });
    }
    const receiptRef = String(req.body?.receiptRef || '').trim();
    if (!receiptRef || receiptRef.length < 6 || receiptRef.length > 120) {
      return res
        .status(403)
        .json({ error: 'Valid receiptRef (Whop mem_ / pay_ ID) is required for erasure.' });
    }
    const deck = db
      .prepare('SELECT deck_code, whop_ref FROM sync_decks WHERE deck_code = ?')
      .get(code);
    if (!deck) {
      return res.status(404).json({ error: 'Deck code not found' });
    }

    let authorized = Boolean(deck.whop_ref && receiptRef === deck.whop_ref);
    if (!authorized) {
      const ord = db
        .prepare('SELECT 1 FROM orders WHERE transaction_id = ? AND deck_code = ? LIMIT 1')
        .get(receiptRef, code);
      authorized = Boolean(ord);
    }
    if (!authorized) {
      return res.status(403).json({ error: 'Receipt reference does not match this sync code.' });
    }

    const now = Date.now();
    const emptyState = JSON.stringify({
      crackedSafeIds: [],
      checkedRouteIds: [],
      savedPins: [],
    });
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(
        'UPDATE sync_decks SET email_hash = NULL, whop_ref = NULL, state_json = ?, active = 0, updated_at = ? WHERE deck_code = ?'
      ).run(emptyState, now, code);
      db.prepare('UPDATE orders SET buyer_email_hash = NULL WHERE deck_code = ?').run(code);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return res.json({ ok: true, deleted: true, deckCode: code });
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
    const whopRef = String(req.body?.whopRef || '').trim().slice(0, 120) || null;
    const rawHours = Number(req.body?.durationHours ?? 24);
    const durationHours = Number.isFinite(rawHours) ? Math.min(720, Math.max(1, rawHours)) : 24;

    const urlCheck = isSafePublicHttpsUrl(rawUrl);
    if (!badgeText || !urlCheck.ok) {
      return res.status(400).json({
        error: urlCheck.reason || 'Valid badgeText and public https:// targetUrl required',
      });
    }
    const normalizedTargetUrl = urlCheck.normalizedUrl;

    const now = Date.now();
    const expiresAt = now + Math.round(durationHours * 3600 * 1000);
    db.prepare(
      'INSERT INTO sponsors (badge_text, target_url, whop_ref, starts_at, expires_at, active) VALUES (?, ?, ?, ?, ?, 1)'
    ).run(badgeText, normalizedTargetUrl, whopRef, now, expiresAt);

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

    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const rawHost = String(req.headers.host || '').split(':')[0].toLowerCase();
      const hostname = String(req.hostname || rawHost || '').toLowerCase();
      if (rawHost === 'www.playunpause.com' || hostname === 'www.playunpause.com') {
        const fullUrl = new URL(req.originalUrl || req.url, 'http://localhost');
        const target = resolveWwwRedirectLocation(req.path, fullUrl.searchParams, fullUrl.search);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.redirect(301, target);
      }
      return next();
    });

    const assetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      app.use(
        '/assets',
        express.static(assetsDir, { maxAge: '365d', immutable: true, fallthrough: true })
      );
    }

    const staticHandler = express.static(distDir, {
      maxAge: '1h',
      index: false,
      redirect: false,
      setHeaders: (res, filePath) => {
        const rel = `/${path.relative(distDir, filePath).replace(/\\/g, '/')}`;
        const cacheControl = getStaticAssetCacheControl(rel);
        if (cacheControl) {
          res.setHeader('Cache-Control', cacheControl);
        }
      },
    });
    app.use((req, res, next) => {
      if (req.path === '/index.html') return next();
      return staticHandler(req, res, next);
    });

    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (isStaticAssetPath(req.path)) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        return res.status(404).type('text/plain').send('Not found');
      }

      const fullUrl = new URL(req.originalUrl || req.url, 'http://localhost');
      const seoRes = resolveSeoRequest(req.path, fullUrl.searchParams);
      if (seoRes.status === 301) {
        const parsed = new URL(seoRes.redirectTo);
        const rawHost = String(req.headers.host || '').split(':')[0].toLowerCase();
        const hostname = String(req.hostname || rawHost || '').toLowerCase();
        const isLocal =
          env.NODE_ENV === 'test' ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '::1';
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.redirect(301, isLocal ? `${parsed.pathname}${parsed.search}` : seoRes.redirectTo);
      }

      const isEmbed = Boolean(seoRes.isEmbed);
      applyHttpSecurityHeaders(res, env, { isEmbed });
      res.setHeader('Cache-Control', seoRes.notFound ? 'no-store' : 'no-cache');
      if (seoRes.notFound) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
      if (!baseIndexHtml) {
        if (seoRes.notFound) return res.status(404).type('text/plain').send('Not found');
        return res.sendFile('index.html', { root: distDir });
      }
      const rendered = renderSeoHtmlDocument(baseIndexHtml, seoRes, computePassPriceUsd());
      return res.status(seoRes.notFound ? 404 : 200).type('html').send(rendered);
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      if (err instanceof URIError) {
        return res.status(400).json({ error: 'Invalid sync code format' });
      }
      if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        return res.status(400).json({ error: 'Malformed JSON body' });
      }
      if (err?.type === 'entity.too.large' || err?.status === 413) {
        return res.status(413).json({ error: 'Payload too large' });
      }
      return res.status(err?.status || 500).json({ error: 'Internal server error' });
    }
    if (err instanceof URIError) {
      return res.status(400).type('text/plain').send('Bad request');
    }
    return res.status(err?.status || 500).type('text/plain').send('Internal server error');
  });

  return { app, db };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const port = Number(process.env.PORT || 3001);
  const { app } = createApp();
  app.listen(port, () => {
    console.log(`[Unpause] Server active on http://localhost:${port}`);
  });
}

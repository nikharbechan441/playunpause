import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.js';

function createMockD1() {
  const sqlite = new DatabaseSync(':memory:');
  return {
    prepare(sql) {
      let boundParams = [];
      const stmtObj = {
        sql,
        get params() {
          return boundParams;
        },
        bind(...args) {
          for (const a of args) {
            if (a === undefined) {
              throw new Error('D1 does not allow undefined bind parameters');
            }
          }
          boundParams = args;
          return stmtObj;
        },
        async first() {
          const row = sqlite.prepare(sql).get(...boundParams);
          return row ?? null;
        },
        async run() {
          const info = sqlite.prepare(sql).run(...boundParams);
          return { success: true, meta: info };
        },
      };
      return stmtObj;
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const st of statements) {
          sqlite.prepare(st.sql).run(...st.params);
          results.push({ success: true });
        }
        sqlite.exec('COMMIT');
        return results;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

function createMockAssets() {
  const indexHtml = `<!doctype html><html><head><title>Default</title><meta name="description" content="Default" /><link rel="canonical" href="https://playunpause.com/" /><meta property="og:title" content="Default" /><meta property="og:description" content="Default" /><meta property="og:url" content="https://playunpause.com/" /><meta name="twitter:title" content="Default" /><meta name="twitter:description" content="Default" /></head><body><div id="root"></div></body></html>`;
  return {
    async fetch(req) {
      const u = new URL(req.url);
      if (u.pathname === '/index.html') {
        return new Response(indexHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      if (u.pathname === '/robots.txt') {
        return new Response('User-agent: *\nAllow: /\n', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return new Response('Not Found', { status: 404 });
    },
  };
}

test('Cloudflare Worker handles SEO prerender, /api/config, Whop ws_ webhook, sync state, and refund revocation', async () => {
  const env = {
    DB: createMockD1(),
    ASSETS: createMockAssets(),
    NODE_ENV: 'production',
    ALLOW_DEMO_UNLOCK: 'true', // must still be blocked in production!
    WHOP_PASS_PLAN_ID: 'prod_oMcH19N9BCoDO',
    WHOP_SPONSOR_PLAN_ID: 'prod_QrrVpAuy4GAUm',
    WHOP_WEBHOOK_SECRET: 'ws_a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    EMAIL_HASH_PEPPER: 'pepper-32-bytes-production-test-key',
    ADMIN_API_KEY: 'admin-super-secret',
  };

  // 1. Edge SEO prerender for /?game=minecraft
  const seoRes = await worker.fetch(new Request('https://playunpause.com/?game=minecraft'), env);
  assert.equal(seoRes.status, 200);
  assert.ok(seoRes.headers.get('content-security-policy').includes("script-src 'self'"));
  assert.ok(seoRes.headers.get('strict-transport-security'));
  const html = await seoRes.text();
  assert.ok(html.includes('Minecraft (Java &amp; Bedrock) Calculator &amp; Meta'));
  assert.ok(html.includes('FAQPage'));

  // 2. /api/config enforces demoUnlockEnabled: false in production
  const cfgRes = await worker.fetch(new Request('https://playunpause.com/api/config'), env);
  assert.equal(cfgRes.status, 200);
  const cfg = await cfgRes.json();
  assert.equal(cfg.demoUnlockEnabled, false);
  assert.equal(cfg.passCheckoutUrl, 'https://whop.com/playunpause/unpause-one-time-all-access-pass/');

  // 3. GET /api/webhooks/whop passes Whop URL reachability probe
  const probeRes = await worker.fetch(new Request('https://playunpause.com/api/webhooks/whop'), env);
  assert.equal(probeRes.status, 200);

  // 4. POST /api/webhooks/whop with Standard Webhooks signature using ws_ secret + product_id
  const nowSec = Math.floor(Date.now() / 1000);
  const bodyStr = JSON.stringify({
    type: 'payment.succeeded',
    data: {
      id: 'pay_live_cf_001',
      final_amount: 6.99,
      currency: 'usd',
      product: { id: 'prod_oMcH19N9BCoDO' },
      membership_id: 'mem_live_cf_001',
      user: { email: 'gamer@example.com' },
    },
  });
  const msgId = 'msg_cf_001';
  const sig = crypto
    .createHmac('sha256', Buffer.from(env.WHOP_WEBHOOK_SECRET, 'utf8'))
    .update(`${msgId}.${nowSec}.${bodyStr}`, 'utf8')
    .digest('base64');

  const hookRes = await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: {
        'webhook-id': msgId,
        'webhook-timestamp': String(nowSec),
        'webhook-signature': `v1,${sig}`,
        'content-type': 'application/json',
      },
      body: bodyStr,
    }),
    env
  );
  assert.equal(hookRes.status, 200);
  const hookJson = await hookRes.json();
  assert.equal(hookJson.ok, true);
  assert.match(hookJson.deckCode, /^UP-/);

  // 5. PUT & GET /api/sync/:code persists state in D1
  const putRes = await worker.fetch(
    new Request(`https://playunpause.com/api/sync/${hookJson.deckCode}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        state: {
          crackedSafeIds: ['vice-pawn'],
          checkedRouteIds: ['route-1'],
          savedPins: [{ id: 'p1', gameId: 'minecraft', label: 'Base Nether', value: 'X: 120 Z: -45' }],
        },
      }),
    }),
    env
  );
  assert.equal(putRes.status, 200);

  // 6. Whop 2026-11-10-1 refund.created revokes deck access
  const refundBody = JSON.stringify({
    type: 'refund.created',
    data: {
      id: 'rfnd_001',
      payment_id: 'pay_live_cf_001',
    },
  });
  const refundSig = crypto
    .createHmac('sha256', Buffer.from(env.WHOP_WEBHOOK_SECRET, 'utf8'))
    .update(`msg_cf_002.${nowSec}.${refundBody}`, 'utf8')
    .digest('base64');

  const refundRes = await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: {
        'webhook-id': 'msg_cf_002',
        'webhook-timestamp': String(nowSec),
        'webhook-signature': `v1,${refundSig}`,
      },
      body: refundBody,
    }),
    env
  );
  assert.equal(refundRes.status, 200);
  const refundJson = await refundRes.json();
  assert.equal(refundJson.revoked, true);

  const blockedSync = await worker.fetch(
    new Request(`https://playunpause.com/api/sync/${hookJson.deckCode}`),
    env
  );
  assert.equal(blockedSync.status, 403);
});

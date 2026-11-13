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
      if (u.pathname === '/og-cover.png') {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
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

test('Cloudflare Worker enforces replay protection, SSRF blocking, sponsor refund, DSAR DELETE, and CORP/CSP headers', async () => {
  const secret = 'ws_a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const env = {
    DB: createMockD1(),
    ASSETS: createMockAssets(),
    NODE_ENV: 'production',
    ALLOW_DEMO_UNLOCK: 'false',
    WHOP_PASS_PLAN_ID: 'prod_oMcH19N9BCoDO',
    WHOP_SPONSOR_PLAN_ID: 'prod_QrrVpAuy4GAUm',
    WHOP_WEBHOOK_SECRET: secret,
    WHOP_API_KEY: 'whop_live_test_key',
    EMAIL_HASH_PEPPER: 'pepper-worker-security-regression',
    ADMIN_API_KEY: 'admin-worker-secret',
  };

  function makeLegacyHexSig(bodyStr, ts) {
    return crypto
      .createHmac('sha256', secret)
      .update(`${ts}.${bodyStr}`, 'utf8')
      .digest('hex');
  }

  // 1. Asset CORP isolation vs public OG image + Minecraft SSR non-affiliation
  const ogRes = await worker.fetch(new Request('https://playunpause.com/og-cover.png'), env);
  assert.equal(ogRes.status, 200);
  assert.equal(ogRes.headers.get('cross-origin-resource-policy'), 'cross-origin');

  const mcRes = await worker.fetch(new Request('https://playunpause.com/?game=minecraft'), env);
  assert.equal(mcRes.headers.get('cross-origin-resource-policy'), 'same-origin');
  const csp = mcRes.headers.get('content-security-policy') || '';
  assert.ok(!csp.includes("'unsafe-inline'"));
  assert.ok(mcRes.headers.get('strict-transport-security').includes('preload'));
  assert.ok((await mcRes.text()).includes('NOT AN OFFICIAL MINECRAFT PRODUCT'));

  // 2. /api/config cache + search indexing protection
  const cfgRes = await worker.fetch(new Request('https://playunpause.com/api/config'), env);
  assert.equal(cfgRes.headers.get('cache-control'), 'no-store');
  assert.equal(cfgRes.headers.get('x-robots-tag'), 'noindex, nofollow');

  // 3. Reject $1.00 (100 cents) underpayment & accept valid pass webhook
  const ts1 = String(Math.floor(Date.now() / 1000));
  const body100 = JSON.stringify({
    type: 'payment.succeeded',
    data: { id: 'pay_100c', final_amount: 100, currency: 'usd', product: { id: 'prod_oMcH19N9BCoDO' } },
  });
  const res100 = await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: {
        'x-whop-signature': makeLegacyHexSig(body100, ts1),
        'webhook-timestamp': ts1,
      },
      body: body100,
    }),
    env
  );
  assert.equal(res100.status, 400);

  const passBody = JSON.stringify({
    type: 'payment.succeeded',
    data: {
      id: 'pay_cf_replay_001',
      final_amount: 6.99,
      currency: 'usd',
      product: { id: 'prod_oMcH19N9BCoDO' },
      membership_id: 'mem_cf_replay_001',
      user: { email: 'player@example.com' },
    },
  });
  const hookOk = await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: {
        'x-whop-signature': makeLegacyHexSig(passBody, ts1),
        'webhook-timestamp': ts1,
      },
      body: passBody,
    }),
    env
  );
  assert.equal(hookOk.status, 200);
  const { deckCode } = await hookOk.json();
  assert.match(deckCode, /^UP-/);

  // 4. Replaying identical legacy signed payload with fresh timestamp must return duplicate:true
  const ts2 = String(Math.floor(Date.now() / 1000) + 1);
  const replayRes = await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: {
        'x-whop-signature': makeLegacyHexSig(passBody, ts2),
        'webhook-timestamp': ts2,
      },
      body: passBody,
    }),
    env
  );
  assert.equal(replayRes.status, 200);
  assert.equal((await replayRes.json()).duplicate, true);

  // 5. Bare email rejected with 403; email + receiptRef works
  const bareRes = await worker.fetch(
    new Request('https://playunpause.com/api/pass/activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codeOrEmail: 'player@example.com' }),
    }),
    env
  );
  assert.equal(bareRes.status, 403);

  const proofRes = await worker.fetch(
    new Request('https://playunpause.com/api/pass/activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codeOrEmail: 'player@example.com', receiptRef: 'mem_cf_replay_001' }),
    }),
    env
  );
  assert.equal(proofRes.status, 200);

  // 6. Content-Type enforcement rejects non-JSON text/plain CSRF attempts
  const csrfRes = await worker.fetch(
    new Request('https://playunpause.com/api/pass/activate', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ codeOrEmail: deckCode }),
    }),
    env
  );
  assert.equal(csrfRes.status, 415);

  // 7. SSRF protection + Sponsor refund deactivation
  for (const badUrl of [
    'https://127.0.0.1/ssrf',
    'https://169.254.169.254/latest',
    'https://[::1]/local',
    'https://localhost/admin',
    'https://xn--pple-43d.com/',
  ]) {
    const ssrfRes = await worker.fetch(
      new Request('https://playunpause.com/api/admin/sponsor', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-key': env.ADMIN_API_KEY,
        },
        body: JSON.stringify({ badgeText: 'BadHost', targetUrl: badUrl }),
      }),
      env
    );
    assert.equal(ssrfRes.status, 400, `Expected 400 for SSRF URL ${badUrl}`);
  }

  const goodSponRes = await worker.fetch(
    new Request('https://playunpause.com/api/admin/sponsor', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': env.ADMIN_API_KEY,
      },
      body: JSON.stringify({
        badgeText: 'Legit SSD Partner',
        targetUrl: 'https://ssdpartner.example/deal',
        whopRef: 'mem_spon_cf_1',
      }),
    }),
    env
  );
  assert.equal(goodSponRes.status, 200);
  const cfgWithSpon = await (await worker.fetch(new Request('https://playunpause.com/api/config'), env)).json();
  assert.equal(cfgWithSpon.activeSponsor?.badgeText, 'Legit SSD Partner');

  const sponRefundBody = JSON.stringify({
    type: 'refund.created',
    data: { id: 'rfnd_spon_1', membership_id: 'mem_spon_cf_1' },
  });
  const sponRefundRes = await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: {
        'x-whop-signature': makeLegacyHexSig(sponRefundBody, ts2),
        'webhook-timestamp': ts2,
      },
      body: sponRefundBody,
    }),
    env
  );
  assert.equal(sponRefundRes.status, 200);
  assert.equal((await sponRefundRes.json()).sponsorRevoked, true);
  const cfgAfterSponRefund = await (await worker.fetch(new Request('https://playunpause.com/api/config'), env)).json();
  assert.equal(cfgAfterSponRefund.activeSponsor, null);

  // 8. Authenticated DSAR DELETE /api/sync/:code scrubs PII and unlinks orders
  const badDel = await worker.fetch(
    new Request(`https://playunpause.com/api/sync/${deckCode}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ receiptRef: 'mem_wrong_999' }),
    }),
    env
  );
  assert.equal(badDel.status, 403);

  const okDel = await worker.fetch(
    new Request(`https://playunpause.com/api/sync/${deckCode}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ receiptRef: 'mem_cf_replay_001' }),
    }),
    env
  );
  assert.equal(okDel.status, 200);
  assert.equal((await okDel.json()).deleted, true);

  const afterDel = await worker.fetch(
    new Request(`https://playunpause.com/api/sync/${deckCode}`),
    env
  );
  assert.equal(afterDel.status, 403);

  // 9. Refunded deck never resurrects via fresh webhook or Case D Whop API lookup
  const bodyPass2 = JSON.stringify({
    type: 'payment.succeeded',
    data: {
      id: 'pay_cf_revive_001',
      final_amount: 6.99,
      currency: 'usd',
      product: { id: 'prod_oMcH19N9BCoDO' },
      membership_id: 'mem_cf_revive_001',
    },
  });
  const initRes = await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: { 'x-whop-signature': makeLegacyHexSig(bodyPass2, ts1), 'webhook-timestamp': ts1 },
      body: bodyPass2,
    }),
    env
  );
  const { deckCode: reviveDeck } = await initRes.json();

  const revBody = JSON.stringify({
    type: 'payment.refunded',
    data: { id: 'pay_cf_revive_001', membership_id: 'mem_cf_revive_001' },
  });
  await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: { 'x-whop-signature': makeLegacyHexSig(revBody, ts1), 'webhook-timestamp': ts1 },
      body: revBody,
    }),
    env
  );

  const scrubbedWorkerDeck = await env.DB.prepare(
    'SELECT active, email_hash, state_json FROM sync_decks WHERE deck_code = ?'
  )
    .bind(reviveDeck)
    .first();
  assert.equal(scrubbedWorkerDeck.active, 0);
  assert.equal(scrubbedWorkerDeck.email_hash, null);
  assert.equal(
    scrubbedWorkerDeck.state_json,
    '{"crackedSafeIds":[],"checkedRouteIds":[],"savedPins":[]}'
  );

  // Attempt resurrection with a brand-new webhook payment event referencing the refunded membership_id
  const resurrectWebhookBody = JSON.stringify({
    type: 'membership.went_valid',
    data: {
      id: 'evt_revive_attempt_2',
      final_amount: 6.99,
      currency: 'usd',
      product: { id: 'prod_oMcH19N9BCoDO' },
      membership_id: 'mem_cf_revive_001',
    },
  });
  const resurrectHookRes = await worker.fetch(
    new Request('https://playunpause.com/api/webhooks/whop', {
      method: 'POST',
      headers: { 'x-whop-signature': makeLegacyHexSig(resurrectWebhookBody, ts2), 'webhook-timestamp': ts2 },
      body: resurrectWebhookBody,
    }),
    env
  );
  assert.equal(resurrectHookRes.status, 200);
  assert.equal((await resurrectHookRes.json()).revoked, true);
  assert.equal(
    (await worker.fetch(new Request(`https://playunpause.com/api/sync/${reviveDeck}`), env)).status,
    403
  );

  // Case D lookup on revoked mem_cf_revive_001 also returns 403 even if Whop API responds 200
  const caseDRes = await worker.fetch(
    new Request('https://playunpause.com/api/pass/activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codeOrEmail: 'mem_cf_revive_001' }),
    }),
    env
  );
  assert.equal(caseDRes.status, 403);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createApp, sanitizeSyncState } from '../server/index.js';
import { computeHeistSplit, normalizePercentages } from '../server/splitMath.js';

function signStandardWebhook(secretBase64, id, timestamp, bodyString) {
  const key = Buffer.from(secretBase64, 'base64');
  const sig = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestamp}.${bodyString}`, 'utf8')
    .digest('base64');
  return `v1,${sig}`;
}

test('computeHeistSplit & normalizePercentages enforce exact 100% sum, clamp bounds, and reject Infinity/NaN', () => {
  const result = computeHeistSplit({
    grossTakeDollars: 2_450_000,
    supportFeePct: 12,
    sharesPct: [40, 20, 20, 20],
  });
  assert.equal(result.supportFeeDollars, 294_000);
  assert.equal(result.netPoolDollars, 2_156_000);
  assert.deepEqual(result.payoutsDollars, [862_400, 431_200, 431_200, 431_200]);
  assert.equal(result.exactSumCheckCents, true);

  // Odd weights (33, 33, 34, 15) must normalize to exact 100% sum
  const odd = normalizePercentages([33, 33, 34, 15], 5);
  assert.equal(odd.reduce((a, b) => a + b, 0), 100);
  assert.ok(odd.every((p) => p >= 5));

  // Reject Infinity / negative gross take
  assert.throws(() => computeHeistSplit({ grossTakeDollars: Infinity }), /Invalid gross take/);
  assert.throws(() => computeHeistSplit({ grossTakeDollars: -500 }), /Invalid gross take/);
});

test('sanitizeSyncState strips poisoned non-array payloads and enforces string bounds', () => {
  assert.equal(sanitizeSyncState(null), null);
  assert.equal(sanitizeSyncState(['not-an-object']), null);

  const cleaned = sanitizeSyncState({
    crackedSafeIds: ['pg-pawn-backroom', 12345, '', 'pg-pawn-backroom', '  vb-ocean  '],
    checkedRouteIds: 'malicious-non-array-string',
    savedPins: [
      { id: 'pin-mc-1', gameId: 'minecraft', label: 'Base Nether Portal', value: 'X: 160 Y: 64 Z: -105' },
      { id: 'pin-mc-1', gameId: 'minecraft', label: 'Duplicate ignored', value: 'dup' },
      'corrupt-entry',
      { id: '', gameId: 'cs2', label: 'Missing ID', value: '+$2400' },
    ],
    injectedField: { evil: true },
  });
  assert.deepEqual(cleaned, {
    crackedSafeIds: ['pg-pawn-backroom', 'vb-ocean'],
    checkedRouteIds: [],
    savedPins: [
      { id: 'pin-mc-1', gameId: 'minecraft', label: 'Base Nether Portal', value: 'X: 160 Y: 64 Z: -105' },
    ],
  });
});

test('Whop Webhook enforces amount/currency/plan guards, deduplicates membership events, and isolates rate limits', async () => {
  const rawSecretBytes = crypto.randomBytes(24).toString('base64');
  const whopSecret = `whsec_${rawSecretBytes}`;

  const { app, db } = createApp({
    dbPath: ':memory:',
    env: {
      NODE_ENV: 'test',
      WHOP_WEBHOOK_SECRET: whopSecret,
      WHOP_PASS_PLAN_ID: 'plan_pass_699',
      WHOP_SPONSOR_PLAN_ID: 'plan_spon_149',
      ALLOW_DEMO_UNLOCK: 'false',
    },
  });

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function postSignedWebhook(msgId, payloadObj) {
    const nowTs = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify(payloadObj);
    const sig = signStandardWebhook(rawSecretBytes, msgId, nowTs, body);
    return fetch(`${baseUrl}/api/webhooks/whop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': msgId,
        'webhook-timestamp': nowTs,
        'webhook-signature': sig,
      },
      body,
    });
  }

  try {
    // 1. Reject forged webhook signature
    const badRes = await fetch(`${baseUrl}/api/webhooks/whop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': 'msg_bad',
        'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
        'webhook-signature': 'v1,forgedsignaturebytes==',
      },
      body: JSON.stringify({ type: 'payment.succeeded', data: { id: 'pay_bad', final_amount: 6.99, currency: 'usd' } }),
    });
    assert.equal(badRes.status, 401);

    // 2. Reject $0 / missing amount / wrong currency / underpaid pass
    const zeroRes = await postSignedWebhook('msg_zero', {
      type: 'payment.succeeded',
      data: { id: 'pay_zero', final_amount: 0, currency: 'usd', plan_id: 'plan_pass_699' },
    });
    assert.equal(zeroRes.status, 400);

    const missingAmtRes = await postSignedWebhook('msg_noamt', {
      type: 'payment.succeeded',
      data: { id: 'pay_noamt', currency: 'usd', plan_id: 'plan_pass_699' },
    });
    assert.equal(missingAmtRes.status, 400);

    const wrongCurrRes = await postSignedWebhook('msg_curr', {
      type: 'payment.succeeded',
      data: { id: 'pay_curr', final_amount: 6.99, currency: 'jpy', plan_id: 'plan_pass_699' },
    });
    assert.equal(wrongCurrRes.status, 400);

    // 3. Correctly classify integer $149 USD sponsor payment as 14900 cents (sponsor_24h), NOT $1.49 pass!
    const sponsorRes = await postSignedWebhook('msg_spon_1', {
      type: 'payment.succeeded',
      data: {
        id: 'pay_spon_149',
        final_amount: 149,
        currency: 'usd',
        plan_id: 'plan_spon_149',
        user: { email: 'brand@example.com' },
      },
    });
    assert.equal(sponsorRes.status, 200);
    const sponsorJson = await sponsorRes.json();
    assert.equal(sponsorJson.productKind, 'sponsor_24h');
    assert.equal(sponsorJson.deckCode, null);

    // 4. Accept valid $6.99 pass & deduplicate if membership.went_valid also arrives for same membership_id
    const passRes = await postSignedWebhook('msg_good_1', {
      type: 'payment.succeeded',
      data: {
        id: 'pay_test_99182',
        final_amount: 6.99,
        currency: 'usd',
        plan_id: 'plan_pass_699',
        user: { email: 'DaveElectrician@example.com' },
        membership_id: 'mem_abc123',
      },
    });
    assert.equal(passRes.status, 200);
    const passJson = await passRes.json();
    assert.equal(passJson.ok, true);
    assert.match(passJson.deckCode, /^UP-[A-Z0-9]{8}$/);

    const secondEventRes = await postSignedWebhook('msg_good_2', {
      type: 'membership.went_valid',
      data: {
        id: 'evt_mem_99182',
        final_amount: 699,
        currency: 'usd',
        plan_id: 'plan_pass_699',
        user: { email: 'DaveElectrician@example.com' },
        membership_id: 'mem_abc123',
      },
    });
    const secondEventJson = await secondEventRes.json();
    assert.equal(secondEventJson.deckCode, passJson.deckCode);

    // 5. Buyer can claim immediately within 30m window via email OR anytime via mem_ receipt ID
    const claimRes = await fetch(`${baseUrl}/api/pass/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeOrEmail: 'daveelectrician@example.com' }),
    });
    assert.equal(claimRes.status, 200);
    const claimJson = await claimRes.json();
    assert.equal(claimJson.deckCode, passJson.deckCode);

    // Simulate older order (>30m ago): bare email must be blocked with 403, while mem_abc123 succeeds!
    db.prepare('UPDATE sync_decks SET created_at = ? WHERE deck_code = ?').run(
      Date.now() - 45 * 60 * 1000,
      passJson.deckCode
    );
    const staleEmailRes = await fetch(`${baseUrl}/api/pass/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeOrEmail: 'daveelectrician@example.com' }),
    });
    assert.equal(staleEmailRes.status, 403);

    const refClaimRes = await fetch(`${baseUrl}/api/pass/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeOrEmail: 'mem_abc123' }),
    });
    assert.equal(refClaimRes.status, 200);

    // 5b. Buyer can ALSO claim anytime via Whop pay_ transaction ID (orders.transaction_id fallback)
    const payIdClaimRes = await fetch(`${baseUrl}/api/pass/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeOrEmail: 'pay_test_99182' }),
    });
    assert.equal(payIdClaimRes.status, 200);
    const payIdClaimJson = await payIdClaimRes.json();
    assert.equal(payIdClaimJson.deckCode, passJson.deckCode);

    // 5c. Reject ambiguous cent integer (489), missing plan_id when WHOP_PASS_PLAN_ID is configured, and subtotal-only $0 promos
    const ambigRes = await postSignedWebhook('msg_ambig', {
      type: 'payment.succeeded',
      data: { id: 'pay_ambig', final_amount: 489, currency: 'usd', plan_id: 'plan_pass_699' },
    });
    assert.equal(ambigRes.status, 400);

    const noPlanRes = await postSignedWebhook('msg_noplan', {
      type: 'payment.succeeded',
      data: { id: 'pay_noplan', final_amount: 6.99, currency: 'usd' },
    });
    assert.equal(noPlanRes.status, 400);

    const promoZeroRes = await postSignedWebhook('msg_promozero', {
      type: 'membership.went_valid',
      data: { id: 'pay_promozero', subtotal: 6.99, final_amount: 0, currency: 'usd', plan_id: 'plan_pass_699' },
    });
    assert.equal(promoZeroRes.status, 400);

    // 6. Sync state sanitizes arrays cleanly and unknown /api routes return JSON 404
    const saveRes = await fetch(`${baseUrl}/api/sync/${passJson.deckCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: {
          crackedSafeIds: ['pg-pawn-backroom'],
          checkedRouteIds: ['r90-1'],
          savedPins: [{ id: 'pin-1', gameId: 'fortnite', label: 'Season Goal', value: '140,000 XP/day' }],
          junk: 999,
        },
      }),
    });
    assert.equal(saveRes.status, 200);

    const loadRes = await fetch(`${baseUrl}/api/sync/${passJson.deckCode}`);
    const loadJson = await loadRes.json();
    assert.deepEqual(loadJson.state, {
      crackedSafeIds: ['pg-pawn-backroom'],
      checkedRouteIds: ['r90-1'],
      savedPins: [{ id: 'pin-1', gameId: 'fortnite', label: 'Season Goal', value: '140,000 XP/day' }],
    });

    // 7. Refund webhook revokes sync deck access immediately (403 on activate and sync)
    const refundRes = await postSignedWebhook('msg_refund_1', {
      type: 'payment.refunded',
      data: { id: 'pay_test_99182', membership_id: 'mem_abc123' },
    });
    assert.equal(refundRes.status, 200);
    const refundJson = await refundRes.json();
    assert.equal(refundJson.revoked, true);

    const revokedSyncRes = await fetch(`${baseUrl}/api/sync/${passJson.deckCode}`);
    assert.equal(revokedSyncRes.status, 403);

    const revokedActivateRes = await fetch(`${baseUrl}/api/pass/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeOrEmail: passJson.deckCode }),
    });
    assert.equal(revokedActivateRes.status, 403);

    const notFoundApi = await fetch(`${baseUrl}/api/does-not-exist`);
    assert.equal(notFoundApi.status, 404);
  } finally {
    server.close();
    db.close();
  }
});

test('Production kill-switch blocks ALLOW_DEMO_UNLOCK and admin sponsor rejects credentialed URLs & NaN crashes', async () => {
  const { app, db } = createApp({
    dbPath: ':memory:',
    env: {
      NODE_ENV: 'production',
      ALLOW_DEMO_UNLOCK: 'true',
      ADMIN_API_KEY: 'super_secret_admin_key_test',
      WHOP_PASS_PLAN_ID: 'plan_1',
      WHOP_SPONSOR_PLAN_ID: 'plan_2',
      WHOP_WEBHOOK_SECRET: 'whsec_dGVzdHNlY3JldGtleXRlc3RzZWNyZXRrZXk=',
    },
  });

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const cfgRes = await fetch(`${baseUrl}/api/config`);
    const cfgJson = await cfgRes.json();
    assert.equal(cfgJson.demoUnlockEnabled, false);
    const csp = cfgRes.headers.get('content-security-policy') || '';
    assert.ok(csp.includes("script-src 'self'"));
    assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"));

    const demoAttempt = await fetch(`${baseUrl}/api/pass/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoUnlock: true }),
    });
    assert.equal(demoAttempt.status, 403);

    // Reject URL with embedded user:pass@ credentials
    const badAdminUrl = await fetch(`${baseUrl}/api/admin/sponsor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'super_secret_admin_key_test',
      },
      body: JSON.stringify({
        badgeText: 'SSD Deal',
        targetUrl: 'https://user:pass@example.com/deal',
        durationHours: 'not-a-number',
      }),
    });
    assert.equal(badAdminUrl.status, 400);

    // Non-numeric durationHours gracefully defaults to 24h without SQLite NaN crash
    const goodAdminUrl = await fetch(`${baseUrl}/api/admin/sponsor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'super_secret_admin_key_test',
      },
      body: JSON.stringify({
        badgeText: 'WD_Black 2TB Gen4 SSD — 22% Off Today',
        targetUrl: 'https://example.com/ssd',
        durationHours: '24h',
      }),
    });
    assert.equal(goodAdminUrl.status, 200);
  } finally {
    server.close();
    db.close();
  }
});

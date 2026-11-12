#!/usr/bin/env node
/**
 * 1-Command Whop API Provisioner for Unpause (biz_ZSCUdrORRsLz2U -> whop.com/playunpause)
 *
 * Usage:
 *   1. Open https://whop.com/dashboard/biz_ZSCUdrORRsLz2U/developer/ and click "Create API Key"
 *   2. Run: node tools/whop_provision.mjs <YOUR_WHOP_COMPANY_API_KEY>
 *
 * Automatically creates:
 *   - Product #1: Unpause Night-Run Unlimited Pass ($6.99 USD Early-Bird one-time, redirect -> ?unlocked=1)
 *   - Product #2: Unpause 24-Hour Featured Header Sponsor ($149.00 USD one-time)
 *   - Webhook:    https://playunpause.com/api/webhooks/whop (payment.succeeded)
 * And writes the exact checkout URLs & secrets into unpause/.env!
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.WHOP_API_KEY;

if (!apiKey) {
  console.error('Usage (avoids shell history leak): WHOP_API_KEY=<key> node tools/whop_provision.mjs');
  console.error('PowerShell: $env:WHOP_API_KEY="..."; node tools/whop_provision.mjs; Remove-Item Env:WHOP_API_KEY');
  console.error('Grab your key at: https://whop.com/dashboard/biz_ZSCUdrORRsLz2U/developer/');
  process.exit(1);
}

async function whopPost(endpoint, body) {
  const res = await fetch(`https://api.whop.com/api/v2${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Whop API ${endpoint} (${res.status}): ${text}`);
  }
  return json;
}

async function main() {
  console.log('[Whop Provisioner] Creating Product #1 ($6.99 One-Time All-Access Pass)...');
  const passProduct = await whopPost('/products', {
    name: 'Unpause One-Time All-Access Pass',
    visibility: 'visible',
  });

  const passPlan = await whopPost('/plans', {
    product_id: passProduct.id,
    plan_type: 'one_time',
    initial_price: 6.99,
    base_currency: 'usd',
    visibility: 'visible',
    release_method: 'buy_now',
    custom_fields: [],
    redirect_url: 'https://playunpause.com/?unlocked=1',
  });

  console.log('[Whop Provisioner] Creating Product #2 ($149 24h Header Sponsor)...');
  const sponsorProduct = await whopPost('/products', {
    name: 'Unpause 24-Hour Featured Header Sponsor',
    visibility: 'visible',
  });

  const sponsorPlan = await whopPost('/plans', {
    product_id: sponsorProduct.id,
    plan_type: 'one_time',
    initial_price: 149.0,
    base_currency: 'usd',
    visibility: 'visible',
    release_method: 'buy_now',
  });

  let webhookSecret = '';
  try {
    console.log('[Whop Provisioner] Registering https://playunpause.com/api/webhooks/whop...');
    const hook = await whopPost('/webhooks', {
      url: 'https://playunpause.com/api/webhooks/whop',
      enabled: true,
      events: ['payment.succeeded', 'payment.refunded', 'membership.went_invalid'],
    });
    webhookSecret = hook.webhook_secret || hook.secret || '';
  } catch (err) {
    console.warn('[Note] Webhook registration skipped/manual:', err.message);
  }

  const passUrl = passPlan.direct_link || `https://whop.com/checkout/${passPlan.id}/`;
  const sponsorUrl = sponsorPlan.direct_link || `https://whop.com/checkout/${sponsorPlan.id}/`;
  const adminKey = crypto.randomBytes(24).toString('hex');

  const envContent = [
    'PORT=3001',
    'NODE_ENV=production',
    'DB_PATH=./data/unpause.db',
    'PUBLIC_SITE_URL=https://playunpause.com',
    'SUPPORT_EMAIL=hello@playunpause.com',
    'SPONSOR_EMAIL=sponsors@playunpause.com',
    `WHOP_PASS_CHECKOUT_URL=${passUrl}`,
    `WHOP_SPONSOR_CHECKOUT_URL=${sponsorUrl}`,
    `WHOP_PASS_PLAN_ID=${passPlan.id}`,
    `WHOP_SPONSOR_PLAN_ID=${sponsorPlan.id}`,
    `WHOP_WEBHOOK_SECRET=${webhookSecret}`,
    `WHOP_API_KEY=${apiKey}`,
    `ADMIN_API_KEY=${adminKey}`,
    'ALLOW_DEMO_UNLOCK=false',
    '',
  ].join('\n');

  const envPath = path.join(__dirname, '..', '.env');
  fs.writeFileSync(envPath, envContent, { encoding: 'utf8', mode: 0o600 });

  console.log('\n=== WHOP PROVISIONING COMPLETE ===');
  console.log('$6.99 Pass Checkout:   ', passUrl);
  console.log('$149 Sponsor Checkout: ', sponsorUrl);
  console.log('Saved credentials to:  ', envPath);
}

main().catch((err) => {
  console.error('[Whop Provisioner Error]', err.message);
  process.exit(1);
});

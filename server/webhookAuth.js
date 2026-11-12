import crypto from 'node:crypto';

/**
 * Verifies Standard Webhooks (Whop v5 / Svix / StandardWebhooks spec)
 * AND timestamp-bound HMAC-SHA256 fallback (`x-whop-signature` + `webhook-timestamp`).
 */
export function verifyWhopWebhook({
  rawBody,
  headers = {},
  secret,
  nowEpochSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
}) {
  if (!secret || typeof secret !== 'string' || !rawBody) {
    return { valid: false, reason: 'missing_secret_or_body' };
  }

  const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  if (!rawString.length) {
    return { valid: false, reason: 'empty_body' };
  }

  const normHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string') normHeaders[k.toLowerCase()] = v;
  }

  const webhookId = normHeaders['webhook-id'] || normHeaders['svix-id'];
  const webhookTimestamp = normHeaders['webhook-timestamp'] || normHeaders['svix-timestamp'];
  const webhookSignature = normHeaders['webhook-signature'] || normHeaders['svix-signature'];

  const secretKeys = secret.startsWith('whsec_')
    ? [Buffer.from(secret.slice('whsec_'.length), 'base64'), Buffer.from(secret, 'utf8')]
    : secret.startsWith('ws_')
      ? [
          Buffer.from(secret, 'utf8'),
          Buffer.from(secret.slice('ws_'.length), 'base64'),
          Buffer.from(secret.slice('ws_'.length), 'utf8'),
        ].filter((buf) => buf.length >= 16)
      : [Buffer.from(secret, 'utf8')];

  if (webhookId && webhookTimestamp && webhookSignature) {
    const ts = Number(webhookTimestamp);
    if (!Number.isFinite(ts) || Math.abs(nowEpochSeconds - ts) > toleranceSeconds) {
      return { valid: false, reason: 'timestamp_out_of_range' };
    }

    const signedContent = `${webhookId}.${webhookTimestamp}.${rawString}`;
    const candidates = webhookSignature
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => part.startsWith('v1,'))
      .slice(0, 5)
      .map((part) => part.slice(3));

    for (const keyBuf of secretKeys) {
      const expectedBase64 = crypto
        .createHmac('sha256', keyBuf)
        .update(signedContent, 'utf8')
        .digest('base64');
      const expectedBuf = Buffer.from(expectedBase64, 'utf8');

      for (const candidate of candidates) {
        const candBuf = Buffer.from(candidate, 'utf8');
        if (candBuf.length === expectedBuf.length && crypto.timingSafeEqual(candBuf, expectedBuf)) {
          return { valid: true, eventId: webhookId };
        }
      }
    }
    return { valid: false, reason: 'signature_mismatch' };
  }

  // Fallback: timestamp-required HMAC-SHA256 hex header
  const hexSigHeader = normHeaders['x-whop-signature'];
  if (hexSigHeader) {
    if (!webhookTimestamp) {
      return { valid: false, reason: 'missing_timestamp' };
    }
    const ts = Number(webhookTimestamp);
    if (!Number.isFinite(ts) || Math.abs(nowEpochSeconds - ts) > toleranceSeconds) {
      return { valid: false, reason: 'timestamp_out_of_range' };
    }
    const cleanSig = hexSigHeader.replace(/^sha256=/i, '').trim();
    const b = Buffer.from(cleanSig, 'utf8');
    for (const keyBuf of secretKeys) {
      const expectedHex = crypto.createHmac('sha256', keyBuf).update(rawString, 'utf8').digest('hex');
      const a = Buffer.from(expectedHex, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return { valid: true, eventId: webhookId || null };
      }
    }
  }

  return { valid: false, reason: 'missing_signature_headers' };
}

/**
 * Generates an unambiguous, cryptographically uniform Deck Sync Code: UP-XXXXXXXX
 * Excludes 0/O/1/I/L to eliminate couch-to-TV reading typos.
 */
const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateDeckCode(length = 8) {
  let chars = '';
  for (let i = 0; i < length; i += 1) {
    chars += SAFE_ALPHABET[crypto.randomInt(0, SAFE_ALPHABET.length)];
  }
  return `UP-${chars}`;
}

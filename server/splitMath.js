/**
 * Exact integer-dollar / integer-cent heist split & Largest-Remainder crew balancer.
 * Prevents NaN, Infinity, negative share exploits, or >100% slider drift.
 */
export const MAX_HEIST_DOLLARS = 10_000_000_000;

export function normalizePercentages(rawWeights, minPct = 5) {
  const n = Array.isArray(rawWeights) ? rawWeights.length : 0;
  if (n === 0) return [];
  if (n === 1) return [100];

  const effectiveMin = Math.min(minPct, Math.floor(100 / n));
  const distributable = Math.max(0, 100 - effectiveMin * n);
  const cleanWeights = rawWeights.map((w) => {
    const num = Number(w);
    return Number.isFinite(num) && num > 0 ? num : 1;
  });
  const totalWeight = cleanWeights.reduce((a, b) => a + b, 0) || n;

  const rawExtras = cleanWeights.map((w) => (distributable * w) / totalWeight);
  const floored = rawExtras.map((v) => Math.floor(v));
  let remainder = distributable - floored.reduce((a, b) => a + b, 0);

  rawExtras
    .map((v, idx) => ({ idx, frac: v - floored[idx] }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ idx }) => {
      if (remainder > 0) {
        floored[idx] += 1;
        remainder -= 1;
      }
    });

  return floored.map((extra) => effectiveMin + extra);
}

export function computeHeistSplit({
  grossTakeDollars,
  supportFeePct = 12,
  sharesPct = [40, 20, 20, 20],
}) {
  const parsedGross = Number(grossTakeDollars);
  if (!Number.isFinite(parsedGross) || parsedGross < 0) {
    throw new Error('Invalid gross take');
  }

  const clampedDollars = Math.min(MAX_HEIST_DOLLARS, Math.round(parsedGross));
  const grossCents = clampedDollars * 100;

  const parsedSupport = Number(supportFeePct);
  const clampedSupportPct = Number.isFinite(parsedSupport)
    ? Math.min(50, Math.max(0, parsedSupport))
    : 0;

  const supportFeeCents = Math.round((grossCents * clampedSupportPct) / 100);
  const netPoolCents = Math.max(0, grossCents - supportFeeCents);

  if (!Array.isArray(sharesPct) || sharesPct.length === 0 || sharesPct.length > 6) {
    throw new Error('Crew size must be between 1 and 6');
  }

  const normalizedSharesPct = normalizePercentages(sharesPct, 0);

  let distributedCents = 0;
  const payoutsCents = normalizedSharesPct.map((share, idx) => {
    if (idx === normalizedSharesPct.length - 1) {
      return Math.max(0, netPoolCents - distributedCents);
    }
    const amt = Math.floor((netPoolCents * share) / 100);
    distributedCents += amt;
    return amt;
  });

  return {
    grossDollars: Math.round(grossCents / 100),
    supportFeeDollars: Math.round(supportFeeCents / 100),
    netPoolDollars: Math.round(netPoolCents / 100),
    normalizedSharesPct,
    payoutsDollars: payoutsCents.map((c) => Math.round(c / 100)),
    exactSumCheckCents:
      payoutsCents.reduce((a, b) => a + b, 0) === netPoolCents &&
      normalizedSharesPct.reduce((a, b) => a + b, 0) === 100,
  };
}

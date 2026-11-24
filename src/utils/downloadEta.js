/**
 * Shared Download ETA calculator across GTA VI live calculators & programmatic SEO routes.
 * Uses decimal GB (1 GB = 8,000 Mb) with 0% overhead:
 *   seconds = Math.round((sizeGB * 8000) / speedMbps)
 * Example: 213.6 GB @ 100 Mbps = 17,088s = 4h 45m.
 */
export function computeDownloadEtaSeconds(sizeGb, speedMbps) {
  const safeGb = Math.max(0, Number(sizeGb) || 0);
  const safeMbps = Math.max(5, Math.min(10000, Number(speedMbps) || 100));
  return Math.round((safeGb * 8000) / safeMbps);
}

export function formatDownloadEta(sizeGb, speedMbps, { includeMinutes = false } = {}) {
  const totalSeconds = computeDownloadEtaSeconds(sizeGb, speedMbps);
  const totalMins = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  return includeMinutes ? `${hours}h ${mins}m (${totalMins}m)` : `${hours}h ${mins}m`;
}

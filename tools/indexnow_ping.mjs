#!/usr/bin/env node
import { CANONICAL_ORIGIN, INDEXNOW_KEY, getSitemapRoutes } from '../src/data/seoRoutes.js';

export function buildIndexNowPayload(origin = CANONICAL_ORIGIN) {
  const routes = getSitemapRoutes().filter((r) => !r.legal);
  const host = new URL(origin).hostname;
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
    urlList: routes.map((r) => `${origin}${r.path}`),
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const payload = buildIndexNowPayload();

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          endpoint: 'https://api.indexnow.org/indexnow',
          host: payload.host,
          keyLocation: payload.keyLocation,
          urlCount: payload.urlList.length,
          sampleUrls: payload.urlList.slice(0, 5),
        },
        null,
        2
      )
    );
    return;
  }

  const resp = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`IndexNow ping failed (${resp.status}): ${body.slice(0, 200)}`);
  }

  console.log(`[Unpause IndexNow] Submitted ${payload.urlList.length} canonical URLs (${resp.status}).`);
}

const isCli =
  process.argv[1] &&
  import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href;

if (isCli) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

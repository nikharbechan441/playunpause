import {
  CANONICAL_ORIGIN,
  CORE_ROUTES,
  getRelatedRoutesFor,
} from './seoRoutes.js';

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildCspHeader({ isEmbed = false } = {}) {
  const frameAncestors = isEmbed
    ? 'frame-ancestors https: http://localhost:* http://127.0.0.1:*'
    : "frame-ancestors 'none'";
  return [
    "default-src 'self'",
    "script-src 'self' https://static.cloudflareinsights.com",
    "style-src 'self'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com",
    "manifest-src 'self'",
    "form-action 'self'",
    frameAncestors,
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

export function isPublicCrossOriginAssetPath(pathname) {
  return /^\/(?:og\/[a-z0-9-]+\.png|og-cover\.png|og-image\.png|icon-[^/]+\.png|apple-touch-icon\.png|favicon\.[^/]+)$/i.test(
    String(pathname || '')
  );
}

export function applyHttpSecurityHeaders(
  headersOrRes,
  env = {},
  { isPublicAsset = false, isEmbed = false } = {}
) {
  const setHeader =
    typeof headersOrRes.set === 'function'
      ? (k, v) => headersOrRes.set(k, v)
      : (k, v) => headersOrRes.setHeader(k, v);
  const deleteHeader =
    typeof headersOrRes.delete === 'function'
      ? (k) => headersOrRes.delete(k)
      : (k) => headersOrRes.removeHeader?.(k);

  setHeader('Content-Security-Policy', buildCspHeader({ isEmbed }));
  setHeader('X-Content-Type-Options', 'nosniff');
  if (isEmbed) {
    deleteHeader('X-Frame-Options');
    setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    setHeader('X-Robots-Tag', 'noindex, follow');
  } else {
    setHeader('X-Frame-Options', 'DENY');
    setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  }
  setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  setHeader('Cross-Origin-Resource-Policy', isPublicAsset ? 'cross-origin' : 'same-origin');
  if ((env.NODE_ENV || 'production') === 'production') {
    setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  return headersOrRes;
}

function upsertMetaTag(html, regex, replacementTag) {
  if (regex.test(html)) {
    return html.replace(regex, () => replacementTag);
  }
  return html.replace('</head>', () => `    ${replacementTag}\n  </head>`);
}

export function renderSeoHtmlDocument(baseHtml, resolution, passPriceUsd = 6.99) {
  if (!resolution || resolution.notFound || !resolution.route) {
    const title = 'Page Not Found — Unpause';
    const desc =
      'The requested Unpause calculator page does not exist. Explore GTA VI storage, Warzone TTK, Minecraft Nether portal, and EA FC 27 tools.';
    const linksHtml = CORE_ROUTES.filter((r) => r.path !== '/')
      .map((r) => `<li><a href="${escapeHtml(r.path)}">${escapeHtml(r.shortLabel)}</a></li>`)
      .join('');
    const mainHtml = `<main class="ssr-fallback-shell"><h1>404 — Calculator Route Not Found</h1><p>${escapeHtml(desc)}</p><nav aria-label="Popular Calculators"><ul>${linksHtml}</ul></nav></main>`;
    let html = baseHtml
      .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
        () => `<meta name="description" content="${escapeHtml(desc)}" />`
      )
      .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>\s*/g, '')
      .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>\s*/g, '')
      .replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
        () => `<meta property="og:title" content="${escapeHtml(title)}" />`
      )
      .replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
        () => `<meta property="og:description" content="${escapeHtml(desc)}" />`
      )
      .replace(
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
        () => `<meta name="twitter:title" content="${escapeHtml(title)}" />`
      )
      .replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
        () => `<meta name="twitter:description" content="${escapeHtml(desc)}" />`
      )
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '')
      .replace(
        /<div id="root">[\s\S]*?<\/div>/,
        () => `<div id="root">${mainHtml}</div>`
      );
    html = upsertMetaTag(
      html,
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      '<meta name="robots" content="noindex, nofollow" />'
    );
    return html;
  }

  const { route, isEmbed = false } = resolution;
  const canonicalPath = isEmbed ? route.parentCanonicalPath : route.path;
  const canonicalUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;
  const ogImageUrl = `${CANONICAL_ORIGIN}${route.ogImage || '/og-cover.png'}`;
  const ogAlt = route.ogAlt || route.h1 || route.title;

  const syncFaq = {
    q: `What does the one-time $${passPriceUsd} Sync Pass unlock?`,
    a: `All calculators stay free forever with zero ads. One-time $${passPriceUsd} Sync Pass via Whop unlocks instant Phone ↔ PC QR sync (UP-XXXXXXXX code), 90m/120m extended weeknight chains, unlimited pinned calcs, and 14-day hassle-free refunds.`,
  };

  const faqEntities = route.legal
    ? []
    : [...(Array.isArray(route.faqs) ? route.faqs : []), syncFaq];

  const breadcrumbsHtml =
    Array.isArray(route.breadcrumbs) && route.breadcrumbs.length > 0
      ? `<nav aria-label="Breadcrumb"><ol>${route.breadcrumbs
          .map((b, i) =>
            i === route.breadcrumbs.length - 1
              ? `<li>${escapeHtml(b.name)}</li>`
              : `<li><a href="${escapeHtml(b.path)}">${escapeHtml(b.name)}</a></li>`
          )
          .join('')}</ol></nav>`
      : '';

  const mojNotice =
    route.gameId === 'minecraft'
      ? '<p><strong>NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.</strong></p>'
      : '';

  const metaRowsHtml =
    Array.isArray(route.metaRows) && route.metaRows.length > 0
      ? `<ul>${route.metaRows
          .map((r) => `<li><strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.val)}</li>`)
          .join('')}</ul>`
      : '';

  const faqHtml =
    faqEntities.length > 0
      ? `<section aria-label="Quick Reference FAQs">${faqEntities
          .map((f) => `<article><h2>${escapeHtml(f.q)}</h2><p>${escapeHtml(f.a)}</p></article>`)
          .join('')}</section>`
      : '';

  const relatedLinks = !route.legal && !isEmbed ? getRelatedRoutesFor(route, 8) : [];
  const relatedHtml =
    relatedLinks.length > 0
      ? `<nav aria-label="Related Calculators"><h2>Related Unpause Tools</h2><ul>${relatedLinks
          .map((r) => `<li><a href="${escapeHtml(r.path)}">${escapeHtml(r.shortLabel)}</a></li>`)
          .join('')}</ul></nav>`
      : '';

  const mainHtml = `<main class="ssr-fallback-shell">${breadcrumbsHtml}<h1>${escapeHtml(
    route.h1
  )}</h1><p>${escapeHtml(route.answerSummary)}</p>${mojNotice}${metaRowsHtml}${faqHtml}${relatedHtml}</main>`;

  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(route.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="description" content="${escapeHtml(route.description)}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      () => `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:title" content="${escapeHtml(route.title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:description" content="${escapeHtml(route.description)}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`
    )
    .replace(
      /("price"\s*:\s*")6\.99(")/,
      (_, prefix, suffix) => `${prefix}${Number(passPriceUsd).toFixed(2)}${suffix}`
    );

  html = upsertMetaTag(
    html,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`
  );
  html = upsertMetaTag(
    html,
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image:alt" content="${escapeHtml(ogAlt)}" />`
  );
  html = upsertMetaTag(
    html,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`
  );

  if (isEmbed) {
    html = upsertMetaTag(
      html,
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      '<meta name="robots" content="noindex, follow" />'
    );
  }

  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>/,
    () => `<div id="root">${mainHtml}</div>`
  );

  const schemaGraph = [];
  if (Array.isArray(route.breadcrumbs) && route.breadcrumbs.length > 0) {
    schemaGraph.push({
      '@type': 'BreadcrumbList',
      itemListElement: route.breadcrumbs.map((b, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: b.name,
        item: `${CANONICAL_ORIGIN}${b.path}`,
      })),
    });
  }
  if (faqEntities.length > 0) {
    schemaGraph.push({
      '@type': 'FAQPage',
      mainEntity: faqEntities.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    });
  }

  if (schemaGraph.length > 0) {
    const ldObj = {
      '@context': 'https://schema.org',
      '@graph': schemaGraph,
    };
    const safeJson = JSON.stringify(ldObj).replace(/</g, '\\u003c');
    html = html.replace(
      '</head>',
      () => `  <script type="application/ld+json">${safeJson}</script>\n  </head>`
    );
  }

  return html;
}

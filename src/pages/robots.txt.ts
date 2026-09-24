import type { APIRoute } from 'astro';
import { SITE } from '../consts.ts';

/**
 * Generated rather than kept in public/, so the Sitemap: line is built from
 * SITE.url and cannot drift from it.
 *
 * The filename is @astrojs/sitemap's: it emits /sitemap-index.xml, which
 * points at /sitemap-0.xml and any further pages. Pointing a crawler at the
 * index is correct and means this line never needs to change as the site grows.
 */
export const GET: APIRoute = () => {
  // Concatenated, not new URL(base, SITE.url): resolving a relative path
  // against "https://example.com/repo" (no trailing slash) drops the last
  // segment and yields "https://example.com/sitemap-index.xml".
  const sitemap = `${SITE.url.replace(/\/$/, '')}/sitemap-index.xml`;

  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${sitemap}
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
};

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
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', SITE.url).href}
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );

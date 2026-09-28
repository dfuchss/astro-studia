import type { APIRoute } from 'astro';
import { SITE } from '../consts.ts';

/** Generated so the Sitemap: line is built from SITE.url. The filename is
    @astrojs/sitemap's index, which never changes as the site grows. */
export const GET: APIRoute = () => {
  // Concatenated, not new URL(): resolving against "https://host/repo" drops
  // the last segment.
  const sitemap = `${SITE.url.replace(/\/$/, '')}/sitemap-index.xml`;

  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${sitemap}
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
};

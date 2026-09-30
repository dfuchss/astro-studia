import type { APIRoute } from 'astro';
import { SITE } from '../consts.ts';

/** Generated so the Sitemap: line is built from SITE.url. */
export const GET: APIRoute = () => {
  // Concatenated, not new URL(): resolving against "https://host/repo" drops "/repo".
  const sitemap = `${SITE.url.replace(/\/$/, '')}/sitemap-index.xml`;

  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${sitemap}
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
};

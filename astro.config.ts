// @ts-check
import { readdirSync, existsSync } from 'node:fs';
import { posix } from 'node:path';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { SITE } from './src/consts.ts';
import { URL_POLICY } from './src/lib/paths.ts';
import basePaths from './src/integrations/base-paths.ts';
import sitemapShape from './src/integrations/sitemap-shape.ts';

export default defineConfig({
  site: SITE.url,

  // Both derived from URL_POLICY (src/lib/paths.ts): one decision, not two. Set
  // by hand, the helpers, feed and canonicals drift from disk, as the audit says.
  trailingSlash: URL_POLICY === 'preserve' ? 'ignore' : 'always',
  build: { format: URL_POLICY },

  // Order matters: sitemapShape must run after the sitemap exists.
  integrations: [
    // customPages carries the PDFs: a file in public/ is not a page Astro builds.
    sitemap({ customPages: publicPdfs() }),
    // @astrojs/sitemap keys its trailing slash on build.format === 'directory'
    // and gets 'preserve' wrong; this reshapes each entry to the file emitted.
    sitemapShape(),
    // Astro's `base` does not prefix a `/cv/` you wrote by hand; this does.
    basePaths(),
  ],

  markdown: {
    shikiConfig: { theme: 'github-dark-default', wrap: true },
  },

  // Derived from SITE.url, never set by hand: https://user.github.io/repo/ would
  // otherwise state "/repo" here and in consts.ts, and two copies of one fact
  // drift. A domain root gives '/', Astro's default. See docs/Deploying.md.
  base: new URL(SITE.url).pathname,

  // Redirects for URLs you have already published elsewhere and cannot move:
  // redirects: { '/old-path/': '/new-path/' },

  devToolbar: { enabled: false },
});

/** Every PDF under public/assets/pdf/, recursively, as absolute URLs. */
function publicPdfs(dir: string = 'public/assets/pdf', out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = posix.join(dir, name.name);
    if (name.isDirectory()) publicPdfs(rel, out);
    else if (name.name.toLowerCase().endsWith('.pdf')) {
      // Concatenated, not new URL(): with a base, SITE.url ends "/repo" and a
      // root-absolute path resolved against it drops it. robots.txt.ts does the same.
      out.push(`${SITE.url.replace(/\/$/, '')}${rel.replace(/^public/, '')}`);
    }
  }
  return out;
}

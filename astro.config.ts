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

  // Both derived from URL_POLICY (src/lib/paths.ts): one decision, not two.
  // Set by hand, the link helpers, the feed and the canonicals stop agreeing
  // with the files on disk, which the audit reports.
  trailingSlash: URL_POLICY === 'preserve' ? 'ignore' : 'always',
  build: { format: URL_POLICY },

  // Order matters: sitemapShape must run after the sitemap exists.
  integrations: [
    // customPages carries the PDFs: the integration lists pages Astro builds,
    // and a file in public/ is not one.
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

  // For https://<user>.github.io/<repo>/: set this to '/<repo>' and include
  // the path in SITE.url. docs/Deploying.md.
  // base: '/astro-studia',

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
      // Concatenated, not new URL(path, SITE.url): with a base configured
      // SITE.url is "https://host/repo", and resolving a root-absolute path
      // against it drops the last segment. robots.txt.ts does the same.
      out.push(`${SITE.url.replace(/\/$/, '')}${rel.replace(/^public/, '')}`);
    }
  }
  return out;
}

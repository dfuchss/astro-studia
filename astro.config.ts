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
  // Imported rather than written out, so the site's address exists in exactly
  // one place. src/pages/robots.txt.ts reads the same constant.
  site: SITE.url,

  // Both derived from URL_POLICY in src/lib/paths.ts, which is where the
  // choice is made and explained. They are one decision, not two: 'directory'
  // pairs with 'always' (every page is <route>/index.html at a slash URL), and
  // 'preserve' pairs with 'ignore' (a page's file mirrors its source, so the
  // paper pages are flat /papers/<slug> files and the surface is mixed). Set
  // them by hand and the link helpers, the feed and the canonical URLs would
  // no longer agree with the files on disk — which the audit then reports.
  trailingSlash: URL_POLICY === 'preserve' ? 'ignore' : 'always',
  build: { format: URL_POLICY },

  integrations: [
    // Emits /sitemap-index.xml plus /sitemap-0.xml. src/pages/robots.txt.ts
    // points at the index, so the two cannot drift apart.
    //
    // customPages carries the PDFs, because the integration lists pages Astro
    // builds and a file in public/ is not one. On an academic site those files
    // are the single highest-value thing to have indexed — Google Scholar and
    // DBLP find papers that way — and a list maintained by hand is a list that
    // silently stops matching the directory.
    sitemap({ customPages: publicPdfs() }),

    // Runs after the sitemap is written and makes each entry name the file
    // that was actually emitted. @astrojs/sitemap adds a trailing slash only
    // when build.format is 'directory', so under 'preserve' it publishes
    // /people for a page that is people/index.html — see the integration's
    // header. A no-op under the default policy.
    sitemapShape(),

    // Makes `base` below actually work for hand-written links. Astro prefixes
    // the URLs it generates itself but not a `/cv/` you typed, and there is no
    // built-in option that changes that — see the integration's own header for
    // why, and why a withBase() helper is the worse answer.
    //
    // A no-op when no base is set, which is the common case.
    basePaths(),
  ],

  markdown: {
    shikiConfig: { theme: 'github-dark-default', wrap: true },
  },

  // Deploying to https://<user>.github.io/<repo>/ rather than a domain of your
  // own? Set `base` to '/<repo>' and point SITE.url at the full address
  // including that path. The basePaths() integration above handles every
  // internal link and asset, including the ones in markdown and YAML that no
  // helper function could reach, and `npm run verify` proves it worked.
  // base: '/aca-theme',

  // Redirects for URLs you have already published elsewhere and cannot move:
  // redirects: { '/old-path/': '/new-path/' },

  devToolbar: { enabled: false },
});

/**
 * Every PDF under public/assets/pdf/, as absolute URLs.
 *
 * Walked at config time rather than listed, so adding a paper needs no upkeep
 * here. Both sites this template came from hand-rolled their whole sitemap for
 * exactly this one capability; this keeps the integration and gets it anyway.
 *
 * Nested directories are included because PDFs are usually filed by year, and
 * posix.join builds the paths because a URL is never backslash-separated —
 * node:path's join would produce Windows separators on Windows.
 */
function publicPdfs(dir: string = 'public/assets/pdf', out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = posix.join(dir, name.name);
    if (name.isDirectory()) publicPdfs(rel, out);
    else if (name.name.toLowerCase().endsWith('.pdf')) {
      // Concatenated, not new URL(path, SITE.url): with a base configured
      // SITE.url is "https://host/repo", and resolving a root-absolute path
      // against it drops the last segment — the sitemap then advertised
      // /assets/pdf/… at the domain root, where nothing is. robots.txt.ts
      // builds its one URL the same way, for the same reason.
      out.push(`${SITE.url.replace(/\/$/, '')}${rel.replace(/^public/, '')}`);
    }
  }
  return out;
}

// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { SITE } from './src/consts.ts';
import basePaths from './src/integrations/base-paths.ts';

export default defineConfig({
  // Imported rather than written out, so the site's address exists in exactly
  // one place. src/pages/robots.txt.ts reads the same constant.
  site: SITE.url,

  // Emit <route>/index.html and publish trailing-slash URLs. The pairing
  // matters: with 'always' + 'directory', Astro.url.pathname is the address a
  // visitor sees, so canonical links, OG URLs and internal hrefs can all use it
  // directly. (Astro's other build format, 'preserve', makes it the *file*
  // path — "/papers/foo.html" — and then every one of those needs a helper.)
  trailingSlash: 'always',
  build: { format: 'directory' },

  integrations: [
    // Emits /sitemap-index.xml plus /sitemap-0.xml. src/pages/robots.txt.ts
    // points at the index, so the two cannot drift apart.
    //
    // It lists pages Astro builds, and nothing else. If you serve PDFs out of
    // public/ and want them indexed, add them explicitly — see docs/deploying.md:
    //   sitemap({ customPages: [`${SITE.url}/assets/pdf/paper.pdf`] })
    sitemap(),

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

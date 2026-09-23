// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { SITE } from './src/consts.ts';

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
  ],

  markdown: {
    shikiConfig: { theme: 'github-dark-default', wrap: true },
  },

  // Deploying to https://<user>.github.io/<repo>/ rather than a domain of your
  // own? Set `base` to '/<repo>' and make SITE.url the full origin. Every
  // internal href in src/ is root-relative, so this is the only edit needed.
  // base: '/aca-theme',

  // Redirects for URLs you have already published elsewhere and cannot move:
  // redirects: { '/old-path/': '/new-path/' },

  devToolbar: { enabled: false },
});

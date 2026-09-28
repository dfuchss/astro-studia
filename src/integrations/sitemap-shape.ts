import type { AstroIntegration } from 'astro';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Make every sitemap entry name the file that was actually emitted.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * @astrojs/sitemap decides whether an entry ends in a slash by looking at
 * `build.format`: 'directory' gets a slash appended, anything else is left as
 * the route pattern, which has none. Under URL_POLICY 'preserve' (see
 * src/lib/paths.ts) that is wrong for most of the site: /people/ is still
 * people/index.html and its address still ends in a slash, but the sitemap
 * says /people. Only the paper pages — flat files — are right by accident.
 * ardoco.de's deployed sitemap has the slashes; a template that dropped them
 * would be publishing a different set of URLs from the ones that are indexed.
 *
 * There is no option that changes this, and the integration's `serialize`
 * hook cannot tell /people (a directory) from /papers/foo (a file) by looking
 * at the URL alone. The build output can: after the pages are written, one of
 * `<path>/index.html` or `<path>.html` exists, and that is the shape the entry
 * must have. So this runs once, over the sitemap as written, and asks the disk.
 * It is the same answer src/integrations/base-paths.ts gives to the same kind
 * of problem — the bytes that are published are the thing to get right — and
 * the same shape of check scripts/audit-site.mjs makes afterwards.
 *
 * ── What it touches ────────────────────────────────────────────────────────
 *
 * Every <loc> in every sitemap-*.xml under the output directory. An entry whose
 * path is `<path>/index.html` on disk gets a trailing slash; one whose path is
 * `<path>.html` loses it; a path that is itself a file (a PDF from customPages)
 * or nothing on disk at all is left alone — the audit reports the latter. The
 * index file's own entries point at other sitemaps, which are files, so they
 * fall through untouched.
 *
 * Under the default policy every entry already ends in a slash and resolves to
 * an index.html, so nothing changes and the output is byte-identical.
 */
export default function sitemapShape(): AstroIntegration {
  let site = '';
  let base = '/';

  return {
    name: 'aca-theme:sitemap-shape',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site ?? '';
        base = config.base;
      },

      'astro:build:done': ({ dir, logger }) => {
        if (!site) {
          logger.warn('no `site` configured; the sitemap has no absolute URLs to check');
          return;
        }
        const root = fileURLToPath(dir);
        const origin = new URL(base, site).href.replace(/\/$/, '');

        let fixed = 0;
        for (const name of readdirSync(root)) {
          if (!/^sitemap(-\d+|-index)?\.xml$/.test(name)) continue;
          const file = join(root, name);
          const text = readFileSync(file, 'utf8').replace(/<loc>([^<]+)<\/loc>/g, (whole, loc) => {
            const shaped = shape(loc, origin, root);
            if (shaped === loc) return whole;
            fixed += 1;
            return `<loc>${shaped}</loc>`;
          });
          writeFileSync(file, text);
        }
        logger.info(
          fixed === 0
            ? 'every sitemap entry already matches its file'
            : `reshaped ${fixed} sitemap entr${fixed === 1 ? 'y' : 'ies'} to match the files on disk`,
        );
      },
    },
  };
}

/**
 * The URL an entry should have, given what is on disk. Exported so the rule can
 * be exercised without a build.
 */
export function shape(loc: string, origin: string, root: string): string {
  if (!loc.startsWith(origin)) return loc;
  const path = loc.slice(origin.length).replace(/\/+$/, '');
  // The site root: "" after stripping, and its file is index.html.
  if (path === '') return `${origin}/`;
  const rel = path.replace(/^\//, '');
  const isFile = (p: string) => existsSync(p) && statSync(p).isFile();
  if (isFile(join(root, rel, 'index.html'))) return `${origin}${path}/`;
  if (isFile(join(root, `${rel}.html`))) return `${origin}${path}`;
  return loc;
}

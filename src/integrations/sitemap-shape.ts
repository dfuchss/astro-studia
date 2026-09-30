import type { AstroIntegration } from 'astro';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Make every sitemap entry name the file that was actually emitted.
 * @astrojs/sitemap takes the trailing slash from `build.format`, which under
 * URL_POLICY 'preserve' is wrong for most of the site. Only the output can tell
 * a directory route from a flat one, so this asks the disk after the build.
 * docs/Architecture.md, "The two integrations".
 */
export default function sitemapShape(): AstroIntegration {
  let site = '';
  let base = '/';

  return {
    name: 'astro-studia:sitemap-shape',
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

/** The URL an entry should have, given what is on disk. Exported so the rule
    can be exercised without a build. */
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

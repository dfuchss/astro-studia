import type { AstroIntegration } from 'astro';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Prefix every site-absolute URL in the built output with the configured
 * base. Astro's `base` does not touch a `/cv/` you wrote by hand, and a
 * withBase() helper cannot reach a path in YAML, front matter or markdown, so
 * this rewrites the bytes once after the build: href, src, srcset and URL
 * `content` attributes, with <script>/<style> bodies masked. A client-side
 * script that builds a path at runtime (src/pages/blog/index.astro) must read
 * import.meta.env.BASE_URL itself. docs/Architecture.md.
 */
export default function basePaths(): AstroIntegration {
  // Captured from the resolved config rather than read from
  // import.meta.env.BASE_URL: an integration runs in the config context, where
  // that is not populated, and reading it there silently yields '/' — which
  // looks exactly like "no base set" and turns this whole file into a no-op.
  let base = '';

  return {
    name: 'astro-studia:base-paths',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base.replace(/\/$/, '');
      },

      'astro:build:done': async ({ dir, logger }) => {
        if (!base) {
          logger.info('no base configured; nothing to rewrite');
          return;
        }

        const root = fileURLToPath(dir);
        let files = 0;
        let urls = 0;

        for (const file of walk(root)) {
          if (!/\.(html|xml)$/.test(file)) continue;
          const { text, count } = rewrite(readFileSync(file, 'utf8'), base);
          if (count === 0) continue;
          writeFileSync(file, text);
          files += 1;
          urls += count;
        }

        logger.info(`prefixed ${urls} URL(s) with ${base} across ${files} file(s)`);
      },
    },
  };
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Attributes whose value is always a single URL wherever they appear. */
const URL_ATTR = /\s(href|src)="(\/[^"]*)"/g;
/** srcset is a comma-separated list of "url descriptor" pairs. */
const SRCSET_ATTR = /\ssrcset="([^"]*)"/g;
/** Regions whose contents are not markup and must not be touched. */
const MASKED = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
/**
 * `content` is a URL on a couple of meta tags and prose on every other, so it
 * is matched against the WHOLE tag: an attribute match never contains the
 * sibling `property=`, and testing that silently skipped og:image.
 */
const URL_META = /<meta\b[^>]*\bcontent="(\/[^"]*)"[^>]*>/g;
const IS_URL_META = /property="og:(url|image)"|name="twitter:image"/;

const MASK_OPEN = '\u{1F512}MASK';
const MASK_CLOSE = 'MASK\u{1F512}';

const needsBase = (url: string, base: string) =>
  url.startsWith('/') && !url.startsWith('//') && url !== base && !url.startsWith(`${base}/`);

/** Exported so the rewrite can be exercised on its own, without a build. */
export function rewrite(text: string, base: string): { text: string; count: number } {
  let count = 0;

  const masked: string[] = [];
  const body = text.replace(MASKED, (m) => {
    masked.push(m);
    return `${MASK_OPEN}${masked.length - 1}${MASK_CLOSE}`;
  });

  let out = body.replace(URL_ATTR, (whole, attr: string, url: string) => {
    if (!needsBase(url, base)) return whole;
    count += 1;
    return ` ${attr}="${base}${url}"`;
  });

  out = out.replace(URL_META, (tag: string, url: string) => {
    if (!IS_URL_META.test(tag) || !needsBase(url, base)) return tag;
    count += 1;
    return tag.replace(`content="${url}"`, `content="${base}${url}"`);
  });

  out = out.replace(SRCSET_ATTR, (_whole, value: string) => {
    const parts = value.split(',').map((part) => {
      const trimmed = part.trim();
      const [url, ...rest] = trimmed.split(/\s+/);
      if (!needsBase(url, base)) return trimmed;
      count += 1;
      return [`${base}${url}`, ...rest].join(' ');
    });
    return ` srcset="${parts.join(', ')}"`;
  });

  out = out.replace(
    new RegExp(`${MASK_OPEN}(\\d+)${MASK_CLOSE}`, 'gu'),
    (_, i: string) => masked[Number(i)],
  );

  return { text: out, count };
}

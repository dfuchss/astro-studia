import type { AstroIntegration } from 'astro';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Prefix every site-absolute URL in the built output with the configured base.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * Astro's `base` rewrites the URLs Astro itself generates — hashed assets,
 * imported images — but not a `/cv/` you wrote by hand. Deploy to
 * https://user.github.io/repo/ without this and every internal link points at
 * the domain root and 404s. The configuration reference is blunt about it:
 * "all of your static asset imports and URLs should add the base as a prefix".
 *
 * Astro does not do it for you, and deliberately: given `/something` it cannot
 * know whether you meant it relative to the base or to the server root, and
 * guessing would stop you linking to a sibling directory.
 *
 * The obvious alternative is a withBase() helper called at each of the ~20
 * places that emit a path. That is worse than it sounds. You have to remember
 * it every time, forgetting is silent, and it cannot reach the cases that
 * matter most — an image path in a YAML data file, a link in a paper's front
 * matter, a plain ![](/assets/…) in markdown. Those are strings in content,
 * not expressions in a component, and no helper can be called from them.
 *
 * So this runs once, over the bytes that are actually published. You write
 * `/cv/` everywhere, which is what you would write anyway, and it is correct
 * at the root and in a subdirectory alike. Starlight's ecosystem arrived at
 * the same answer (starlight-base-path), for the same reason.
 *
 * ── What it touches ────────────────────────────────────────────────────────
 *
 * Only URL-bearing attributes: href, src, srcset, and `content` on exactly the
 * meta tags where it is a URL. Never the inside of a <script> or <style>,
 * where a leading slash means something else entirely — those regions are
 * masked out before anything is rewritten and restored afterwards.
 *
 * A URL is left alone when it already carries the base, is protocol-relative
 * (//host), or has a scheme (https:, mailto:, data:, #fragment).
 *
 * ── The one case it cannot reach ───────────────────────────────────────────
 *
 * A client-side script that builds a path at runtime. There is one, in
 * src/pages/blog/index.astro, and it reads import.meta.env.BASE_URL directly.
 * If you add another, do the same.
 *
 * scripts/audit-site.mjs asserts the outcome: with a base configured, any
 * internal link or subresource that does not carry it fails the build. So if
 * this integration ever stops working, you are told rather than shipping a
 * site whose every link is broken.
 */
export default function basePaths(): AstroIntegration {
  // Captured from the resolved config rather than read from
  // import.meta.env.BASE_URL: an integration runs in the config context, where
  // that is not populated, and reading it there silently yields '/' — which
  // looks exactly like "no base set" and turns this whole file into a no-op.
  let base = '';

  return {
    name: 'aca-theme:base-paths',
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
 * `content` is a URL on a couple of meta tags and prose on every other one, so
 * it is matched against the WHOLE tag rather than the attribute alone. An
 * earlier version tested the attribute match, which of course never contains
 * the sibling `property=` — so og:image was silently skipped, which is exactly
 * the case docs/deploying.md tells you to add.
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

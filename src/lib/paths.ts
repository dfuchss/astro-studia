/**
 * Every URL shape the site publishes, in one place.
 *
 * Nothing else should build a path by interpolating a slug into a string, and
 * nothing else should write one of these prefixes as a literal — not a back
 * link, not a breadcrumb, not a NAV row, not the regex `src/content.config.ts`
 * validates `page = {…}` with. They all read the constants below, so renaming
 * a route is this file plus the route directory, and the audit's internal-link
 * check tells you about anything that was missed.
 *
 * Whether a path ends in a slash is decided by URL_POLICY below, once, and
 * astro.config.ts reads its two build settings from the same constant.
 *
 * ── Renaming a route ───────────────────────────────────────────────────────
 *
 * `/papers/` -> `/conferences/`, end to end:
 *
 *   1. `PAPERS` below.
 *   2. `git mv src/pages/papers src/pages/conferences` — Astro derives routes
 *      from the filesystem, so this one cannot be a constant.
 *   3. the `page = {/papers/<slug>/}` fields in `src/data/papers.bib`, which
 *      are data and have to agree with the new prefix. The build says so, with
 *      the offending BibTeX key, if you forget.
 *
 * The collection name (`papers` in `src/content.config.ts`) and its source
 * directory (`src/content/papers/`) are deliberately NOT in that list: neither
 * appears in a URL, so renaming the route does not touch them.
 */

/**
 * THE URL POLICY: how a route becomes a file, and so what its address is.
 *
 *   'directory'  Every page is <route>/index.html and every URL ends in a
 *                slash: /papers/de-officiis/. Astro's trailingSlash: 'always'.
 *                The default, and what every static host serves correctly with
 *                no configuration.
 *
 *   'preserve'   A page's file mirrors its source file. src/pages/cv/index.astro
 *                is still cv/index.html and /cv/ — but src/pages/papers/[slug].astro
 *                is papers/de-officiis.html, published as /papers/de-officiis:
 *                no slash, no extension. Astro's trailingSlash: 'ignore', because
 *                the surface is mixed and 'always' or 'never' would make half of
 *                it unreachable in dev.
 *
 * The second one exists for a site that cannot move: ardoco.de published its
 * paper pages as /c/icse25 for years, they are indexed and cited that way, and
 * a template that could only emit /c/icse25/ would be asking it to break every
 * one of those links. Under 'preserve' the paper pages are the ONLY flat routes,
 * on purpose — the pages tree is laid out so that every other route is an
 * index.astro in a directory, which both policies publish at the same address.
 * (Want a different mix? Move a route between <name>.astro and <name>/index.astro
 * and teach its helper below the same thing paperPath() knows.)
 *
 * This constant is the one place the choice is made:
 *
 *   astro.config.ts          derives `trailingSlash` and `build.format` from it
 *   paperPath()              is the one helper whose shape differs between the two
 *   routePath()              turns Astro.url.pathname — the FILE path under
 *                            'preserve' — back into the published address, for
 *                            the canonical link, og:url and the JSON-LD
 *   src/pages/feed.xml.ts    emits every item link absolute, so @astrojs/rss
 *                            cannot re-shape it
 *   src/integrations/        sitemap-shape.ts rewrites each sitemap entry to the
 *                            file that was actually emitted, because
 *                            @astrojs/sitemap keys its own slash logic on
 *                            build.format and gets 'preserve' wrong
 *
 * and scripts/audit-site.mjs asserts the outcome: every internal link, sitemap
 * entry, feed link and canonical must name a file on disk by its exact shape,
 * so a page or helper that gets the policy wrong fails the build rather than
 * shipping a 404.
 */
// `as`, not a type annotation: TypeScript narrows an annotated const to its
// literal initialiser, and then reports the comparison in paperPath() as one
// that can never be true.
export const URL_POLICY = 'directory' as 'directory' | 'preserve';

/**
 * The published address of the page being rendered, from Astro.url.pathname.
 *
 * Under 'directory' the pathname IS the address and this returns it unchanged.
 * Under 'preserve' Astro hands the components the file path — "/cv.html" for a
 * flat route, and it is the extension that has to come off; a directory route
 * still arrives as "/people/". Both suffixes are handled so that this does not
 * depend on which of the two Astro chose, and 404.html keeps its extension
 * because that page has no address of its own at all.
 *
 * Only BaseHead.astro and ScholarMeta.astro call it, and the audit checks
 * every URL they emit against the page's own file — so a third caller that
 * forgets to would be told, not silently wrong.
 */
export function routePath(pathname: string): string {
  if (pathname.endsWith('/index.html')) return pathname.slice(0, -'index.html'.length);
  if (pathname.endsWith('.html') && pathname !== '/404.html') return pathname.slice(0, -5);
  return pathname;
}

/** The index of the paper pages. `src/pages/papers/` must agree with it. */
export const PAPERS = '/papers/';

/** The index of the projects. `src/pages/projects/` must agree with it. */
export const PROJECTS = '/projects/';

/** The blog index. `src/pages/blog/` must agree with it. */
export const BLOG = '/blog/';

/** The people roster. `src/pages/people/` must agree with it. */
export const PEOPLE = '/people/';

/** The bibliography. `src/pages/publications/` must agree with it. */
export const PUBLICATIONS = '/publications/';

/*
 * The single-page routes. They have no slug and no helper, but they are here
 * for the same reason as the five above: each appears in more than one place —
 * a NAV or FOOTER_LINKS row in src/consts.ts, and a link somewhere in a
 * component — and a route that is written down twice is a route that gets
 * renamed once.
 */
export const CV = '/cv/';
export const PGP_KEY = '/pgp-key/';
export const REPOSITORIES = '/repositories/';
export const IMPRINT = '/imprint/';

/**
 * The one helper whose shape follows URL_POLICY: /papers/<slug>/ under
 * 'directory', /papers/<slug> under 'preserve', where the route is
 * src/pages/papers/[slug].astro and so a flat file. Every other route is an
 * index.astro in a directory and keeps its slash under both.
 */
export const paperPath = (slug: string) =>
  URL_POLICY === 'preserve' ? `${PAPERS}${slug}` : `${PAPERS}${slug}/`;
export const projectPath = (slug: string) => `${PROJECTS}${slug}/`;
export const tagPath = (slug: string) => `${BLOG}tag/${slug}/`;

/** The anchor for one person on /people/ — the key from people.yml. */
export const personAnchor = (id: string) => `${PEOPLE}#${id}`;

/**
 * Every URL shape the site publishes. Nothing else writes one of these
 * prefixes as a literal — not a back link, not a NAV row, not the regex in
 * src/content.config.ts. Renaming a route: docs/Content.md.
 */

/**
 * 'directory': every page is <route>/index.html at a slash URL. 'preserve':
 * a page's file mirrors its source, so the paper pages ([slug].astro) become
 * flat /papers/<slug>, for a site whose paper URLs are indexed that way.
 * Everything that follows from the choice: docs/Deploying.md, "The URL policy".
 */
// `as`, not a type annotation: TypeScript narrows an annotated const to its
// literal initialiser, and then reports the comparison in paperPath() as one
// that can never be true.
export const URL_POLICY = 'directory' as 'directory' | 'preserve';

/**
 * The published address of the page being rendered: under 'preserve'
 * Astro.url.pathname is the FILE path ("/cv.html"). 404.html keeps its
 * extension because that page has no address. The audit checks the result.
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

/* The single-page routes: no slug, no helper, but each is linked from more
   than one place. */
export const CV = '/cv/';
export const PGP_KEY = '/pgp-key/';
export const REPOSITORIES = '/repositories/';
export const IMPRINT = '/imprint/';

/** The one helper whose shape follows URL_POLICY. */
export const paperPath = (slug: string) =>
  URL_POLICY === 'preserve' ? `${PAPERS}${slug}` : `${PAPERS}${slug}/`;
export const projectPath = (slug: string) => `${PROJECTS}${slug}/`;
export const tagPath = (slug: string) => `${BLOG}tag/${slug}/`;

/** The anchor for one person on /people/ — the key from people.yml. */
export const personAnchor = (id: string) => `${PEOPLE}#${id}`;

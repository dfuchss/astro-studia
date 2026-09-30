/**
 * Every URL shape the site publishes; each index must agree with its directory
 * under `src/pages/`. `PAPERS` and `PROJECTS` are honoured everywhere; `/blog/`
 * and `/publications/` are still literals in a few back links. Renaming a
 * route: docs/Content.md. Fenced by feature because TypeScript never reports an
 * unused export, so a prune left routes here pointing at deleted pages.
 */

/** The site's URL shape: docs/Deploying.md, "The URL policy". */
// `as`, not a type annotation: TypeScript narrows an annotated const to its
// literal initialiser, and then reports the comparison in paperPath() as
// unreachable.
export const URL_POLICY = 'directory' as 'directory' | 'preserve';

/** The published address of the page being rendered: under 'preserve'
    Astro.url.pathname is the FILE path ("/cv.html"). 404.html has no address,
    so it keeps its extension. */
export function routePath(pathname: string): string {
  if (pathname.endsWith('/index.html')) return pathname.slice(0, -'index.html'.length);
  if (pathname.endsWith('.html') && pathname !== '/404.html') return pathname.slice(0, -5);
  return pathname;
}

/* ▼ FEATURE:papers ▼ */
export const PAPERS = '/papers/';

/** The one helper whose shape follows URL_POLICY. */
export const paperPath = (slug: string) =>
  URL_POLICY === 'preserve' ? `${PAPERS}${slug}` : `${PAPERS}${slug}/`;
/* ▲ FEATURE:papers ▲ */

/* ▼ FEATURE:projects ▼ */
export const PROJECTS = '/projects/';
export const projectPath = (slug: string) => `${PROJECTS}${slug}/`;
/* ▲ FEATURE:projects ▲ */

/* ▼ FEATURE:blog ▼ */
export const BLOG = '/blog/';
export const tagPath = (slug: string) => `${BLOG}tag/${slug}/`;
/* ▲ FEATURE:blog ▲ */

/* ▼ FEATURE:people ▼ */
export const PEOPLE = '/people/';

/** The anchor for one person on /people/ — `id` is the people.yml key. */
export const personAnchor = (id: string) => `${PEOPLE}#${id}`;
/* ▲ FEATURE:people ▲ */

/* ▼ FEATURE:publications ▼ */
export const PUBLICATIONS = '/publications/';
/* ▲ FEATURE:publications ▲ */

/* The single-page routes: no slug, no helper, each linked from more than one place. */
/* ▼ FEATURE:cv ▼ */
export const CV = '/cv/';
/* ▲ FEATURE:cv ▲ */
/* ▼ FEATURE:pgp ▼ */
export const PGP_KEY = '/pgp-key/';
/* ▲ FEATURE:pgp ▲ */
/* ▼ FEATURE:repositories ▼ */
export const REPOSITORIES = '/repositories/';
/* ▲ FEATURE:repositories ▲ */
/* ▼ FEATURE:imprint ▼ */
export const IMPRINT = '/imprint/';
/* ▲ FEATURE:imprint ▲ */

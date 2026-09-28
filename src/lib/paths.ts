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
 * All of these end in a slash, because astro.config.ts sets
 * trailingSlash: 'always'.
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

export const paperPath = (slug: string) => `${PAPERS}${slug}/`;
export const projectPath = (slug: string) => `${PROJECTS}${slug}/`;
export const tagPath = (slug: string) => `${BLOG}tag/${slug}/`;

/** The anchor for one person on /people/ — the key from people.yml. */
export const personAnchor = (id: string) => `${PEOPLE}#${id}`;

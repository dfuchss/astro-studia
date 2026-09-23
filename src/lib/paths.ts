/**
 * Every URL shape the site publishes, in one place.
 *
 * Nothing else should build a path by interpolating a slug into a string. When
 * you decide that /papers/ should have been /publications/<slug>/ after all,
 * this is the file you edit, and the audit tells you about anything you missed.
 *
 * All of these end in a slash, because astro.config.ts sets
 * trailingSlash: 'always'.
 */

export const paperPath = (slug: string) => `/papers/${slug}/`;
export const projectPath = (slug: string) => `/projects/${slug}/`;
export const tagPath = (slug: string) => `/blog/tag/${slug}/`;

/** The anchor for one person on /people/ — the key from people.yml. */
export const personAnchor = (id: string) => `/people/#${id}`;

import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';
import { file } from 'astro/loaders';
import { bibtexLoader } from './loaders/bibtex.ts';

/*
 * The content model.
 *
 * Every collection is one fenced block below, and every cross-reference goes
 * through Astro's `reference()`. That is the point of the whole file: a bad
 * slug, an unknown venue or a BibTeX key pointing at a page that does not
 * exist stops the build with the offending id in the message. The same
 * mistakes in a template language are a silent lookup that renders blank, and
 * you find them when a reader tells you.
 *
 * To remove a collection, delete its block AND its name from the `collections`
 * export at the bottom. See docs/removing-features.md — some have a required
 * order, because `publications` needs `venues` and `papers` needs `authors`.
 */

/** Badge colours for the publication list, keyed by the BibTeX `abbr`. */
const venues = defineCollection({
  loader: file('src/data/venues.yml'),
  schema: z.object({
    name: z.string(),
    url: z.url().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'venue colour must be a 6-digit hex value'),
  }),
});

/** Everyone who appears as an author anywhere, plus everyone in people.yml. */
const authors = defineCollection({
  loader: file('src/data/authors.yml'),
  schema: z.object({
    name: z.string(),
    orcid: z.string().nullable().default(null),
  }),
});

const publications = defineCollection({
  loader: bibtexLoader({
    file: 'src/data/papers.bib',

    links: [
      // A PDF you host. An absolute URL passes straight through; a relative
      // path must exist under public/assets/pdf/ or the build fails.
      {
        field: 'pdf',
        as: 'pdfUrl',
        allowAbsolute: true,
        resolve: (rel) => ({
          value: `/assets/pdf/${rel}`,
          file: `public/assets/pdf/${rel}`,
        }),
      },
      // This paper's own page. A slug with no markdown file behind it used to
      // be the classic way to publish a live-looking link that 404s; here it
      // is a build error with the BibTeX key attached.
      {
        field: 'page',
        as: 'pageSlug',
        resolve: (raw, { key }) => {
          const m = /^\/papers\/([a-z0-9._-]+)\/?$/.exec(raw);
          if (!m) throw new Error(`${key}: page = {${raw}} is not a /papers/<slug>/ path`);
          return { value: m[1], file: `src/content/papers/${m[1]}.md` };
        },
      },
    ],
  }),

  // Every field the loader produces has to be declared here or Zod drops it.
  schema: z.object({
    key: z.string(),
    type: z.string(),
    title: z.string(),
    authors: z.array(z.object({ first: z.string(), last: z.string() })).min(1),
    year: z.number().int(),
    month: z.number().int().min(1).max(12).optional(),
    // Optional: a preprint with no venue renders without a badge. When it IS
    // set, reference() turns an unknown abbr into a build failure.
    abbr: reference('venues').optional(),
    booktitle: z.string().optional(),
    journal: z.string().optional(),
    school: z.string().optional(),
    institution: z.string().optional(),
    publisher: z.string().optional(),
    series: z.string().optional(),
    volume: z.string().optional(),
    number: z.string().optional(),
    pages: z.string().optional(),
    location: z.string().optional(),
    doi: z.string().optional(),
    url: z.url().optional(),
    keywords: z.array(z.string()).default([]),
    /** Scholar cluster id; the key into src/data/citations.yml. */
    googleScholarId: z.string().optional(),
    /** From `pdf` — see the links[] wiring above. */
    pdfUrl: z.string().optional(),
    /** From `page` — the slug of this paper's own page under /papers/. */
    pageSlug: z.string().optional(),
    bibtex: z.string(),
    searchText: z.string(),
  }),
});

export const collections = { venues, authors, publications };

import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';
import { file, glob } from 'astro/loaders';
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

/**
 * The people shown at /people/.
 *
 * The collection id is the page anchor — see the header of people.yml — and
 * inbound author links depend on it, so a key here is a published URL.
 */
const people = defineCollection({
  loader: file('src/data/people.yml'),
  schema: z.object({
    /** Name and ORCID come from authors.yml, not from here. */
    author: reference('authors'),
    order: z.number().int(),
    role: z.string().optional(),
    /** Path under public/. Figure/img dimensions are read off disk. */
    image: z.string(),
    email: z.string().optional(),
    url: z.url().optional(),
    github: z.string().optional(),
    /**
     * Every surname this person publishes under. Used to link an author name
     * in the publication list back to their entry here.
     */
    surnames: z.array(z.string()).min(1),
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

/**
 * An image under public/, with the one decision a dark page forces on you.
 * Figure.astro reads the dimensions off disk, so there is nothing to declare
 * here but the path.
 */
const figure = z.object({
  src: z.string(),
  alt: z.string(),
  /**
   * Put it on a white plate. True is right for the usual case — a diagram
   * exported from a paper, dark line art on transparency, which is invisible
   * on this background. Set false when the image has its own background.
   */
  plate: z.boolean().default(true),
});

/**
 * A map of label -> URL, rendered as a row of chips: `{ acm: "https://…" }`.
 * A plain record rather than a fixed set of fields, because every paper has a
 * different handful of places it lives.
 */
const linkMap = z
  .record(
    z.string(),
    z.union([
      z.url(),
      z.string().regex(/^\/[^\s]*$/, 'link must be an absolute URL or a site-relative path'),
    ]),
  )
  .optional();

/**
 * One page per paper: the abstract, the figure, the links, the citation.
 *
 * The filename is the URL — src/content/papers/de-officiis.md is
 * /papers/de-officiis/ — and it is what a `page = {/papers/<slug>/}` field in
 * papers.bib has to match. Renaming this file without touching the .bib fails
 * the build, which is the point.
 */
const papers = defineCollection({
  loader: glob({ base: 'src/content/papers', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),

    /** The BibTeX key. Everything bibliographic is read from there, not here. */
    publication: reference('publications'),

    /**
     * Authors as entries in authors.yml, so the page can link each to their
     * ORCID. Separate from the BibTeX author list on purpose: that one is
     * strings, this one is identities.
     */
    authors: z.array(reference('authors')).default([]),

    /** Sort key for /papers/. Lower comes first. */
    order: z.number().int().default(100),
    featured: z.boolean().default(false),

    figure: figure.optional(),

    links: z.object({ paper: linkMap, replication: linkMap, slides: linkMap }).default({}),
  }),
});

/**
 * Things you have made: a tool, a corpus, a long-running line of work.
 *
 * An entry with `redirect` is a link out and gets no page of its own — useful
 * for something that lives on someone else's site but should still appear in
 * your list.
 */
const projects = defineCollection({
  loader: glob({ base: 'src/content/projects', pattern: '**/*.md' }),
  /**
   * The schema is a function here so it can take `image()`, which runs the
   * logo through Astro's asset pipeline: hashed filename, and width and height
   * known at build time without reading the file. That is why project logos
   * live in src/assets/ and figures live in public/ — the two are served by
   * different machinery, and only public/ has stable URLs.
   */
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      /** Buckets on /projects/. Labels for these live in that page. */
      category: z.enum(['research', 'tools', 'misc']),
      order: z.number().int().default(100),
      /** When set, the entry links straight out and no page is generated. */
      redirect: z.url().optional(),
      logo: image().optional(),
    }),
});

/** Front matter in the wild uses both `tags: x` and `tags: [x, y]`. */
const toArray = (v: string | string[]) => (Array.isArray(v) ? v : [v]);

/**
 * Posts. The FILENAME sets the URL and must be YYYY-MM-DD-slug — see
 * src/lib/blog.ts for why the date is not taken from the front matter.
 */
const posts = defineCollection({
  loader: glob({ base: 'src/content/posts', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    /** Must agree with the filename; publishedPosts() throws if it does not. */
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z
      .union([z.string(), z.array(z.string())])
      .transform(toArray)
      .default([]),
    featured: z.boolean().default(false),
    /** Kept out of the list, the feed, the sitemap and its own page. */
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  venues,
  authors,
  people,
  publications,
  papers,
  projects,
  posts,
};

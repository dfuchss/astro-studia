import { defineCollection, reference, type SchemaContext } from 'astro:content';
import { z } from 'zod';
import { file, glob } from 'astro/loaders';
import { bibtexLoader } from './loaders/bibtex.ts';
import { PAPERS } from './lib/paths.ts';

/*
 * The content model. Every cross-reference goes through `reference()`, so a
 * bad slug or an unknown venue stops the build naming the offender instead of
 * rendering blank. Field by field: docs/Content.md. To remove a collection,
 * delete its block AND its name from the export at the bottom
 * (docs/Removing-Features.md has the order that matters).
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

/** The people shown at /people/. The collection id is the page anchor, so a
    key here is a published URL. */
const people = defineCollection({
  loader: file('src/data/people.yml'),
  /* A function so it can take `image()`. It works under a file() loader as it
     does under glob(): the path is relative to the file the entry was loaded
     from, which here is src/data/people.yml — so `../assets/…`. */
  schema: ({ image }) =>
    z.object({
      /** Name and ORCID come from authors.yml, not from here. */
      author: reference('authors'),
      order: z.number().int(),
      role: z.string().optional(),
      /** A portrait under src/assets/, relative to src/data/. */
      image: image(),
      email: z.string().optional(),
      url: z.url().optional(),
      github: z.string().optional(),
      /** Every surname this person publishes under; links an author name in the
          publication list back to this entry. */
      surnames: z.array(z.string()).min(1),
    }),
});

const publications = defineCollection({
  loader: bibtexLoader({
    file: 'src/data/papers.bib',

    links: [
      // A PDF you host: an absolute URL, or a path under public/assets/pdf/.
      {
        field: 'pdf',
        as: 'pdfUrl',
        allowAbsolute: true,
        resolve: (rel) => ({
          value: `/assets/pdf/${rel}`,
          file: `public/assets/pdf/${rel}`,
        }),
      },
      /* ▼ FEATURE:papers ▼ */
      // This paper's own page; a slug with no markdown behind it fails the build.
      // Assembled from PAPERS rather than typed out, so renaming the route cannot
      // leave a validator insisting on the old prefix. A `page = {…}` left in
      // papers.bib once this is gone stays private: see DEFAULT_PRIVATE_FIELDS.
      {
        field: 'page',
        as: 'pageSlug',
        resolve: (raw, { key }) => {
          const re = new RegExp(`^${PAPERS}([a-z0-9._-]+)/?$`);
          const m = re.exec(raw);
          if (!m) throw new Error(`${key}: page = {${raw}} is not a ${PAPERS}<slug>/ path`);
          return { value: m[1], file: `src/content/papers/${m[1]}.md` };
        },
      },
      /* ▲ FEATURE:papers ▲ */
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
    // Optional: an entry with no venue renders without a badge.
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
 * A figure: an image from src/assets/, through the asset pipeline, so the
 * dimensions and the hashed filename come from the build rather than from a
 * disk read at render time.
 *
 * A factory rather than a constant, because `image()` is handed to a schema and
 * cannot be imported — and both collections that take a figure pass their own.
 */
const figureFor = ({ image }: SchemaContext) =>
  z.object({
    src: image(),
    alt: z.string(),
    /** A white plate behind it. True for dark line art on transparency, which
        is invisible on this background; false for an image with its own. */
    plate: z.boolean().default(true),
    /** A window frame with this titlebar label. Explicit rather than derived
        from `plate`: the two coincide often enough to look right until they don't. */
    frame: z.string().optional(),
  });

/** label -> URL, rendered as a row of chips. A record, because every paper
    lives in a different handful of places. */
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
 * One page per paper. The filename is the URL, and what a `page = {…}` field
 * in papers.bib has to match.
 */
const papers = defineCollection({
  loader: glob({ base: 'src/content/papers', pattern: '**/*.md' }),
  /** A function so it can take `image()` — the figure goes through src/assets/. */
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        description: z.string().optional(),

        /**
         * The BibTeX key. Everything bibliographic is read from there, not here.
         * OPTIONAL: a talk at a venue that publishes nothing has no entry to
         * point at, and states its `venue` and `year` itself instead. The
         * refinements below make those the only two possibilities.
         */
        publication: reference('publications').optional(),

        /** The year, only for a page with no `publication`; with one it comes
          from the entry. */
        year: z.number().int().optional(),

        /**
         * The venue, stated outright, for a page with no `publication`. The
         * presence of this object IS which of the two sources a page has.
         *
         * One object, not four sibling strings: the four mean nothing apart
         * from each other, and four loose fields once ended in a default prefix
         * doubling as the "is a venue stated at all?" sentinel. It is also the
         * home of the label's language — a German sentence makes every English
         * word the template adds beside it wrong, so the byline's "by" lives
         * here and the serial "and" between names goes away. `status` is not
         * consulted for a stated venue.
         */
        venue: z
          .object({
            /** The whole sentence, in the page's own language. Not a prefix. */
            label: z.string(),
            /** The event's own page, if it has one. */
            url: z.url().optional(),
            /** A flag or other mark, before the label. */
            mark: z.string().optional(),
            /** For the breadcrumb and the list rows, where the sentence does not
              fit. Defaults to `label`. */
            short: z.string().optional(),
            /** The byline's "by", in the page's language: "von", "par", "a". */
            bylineConnector: z.string().default('by'),
          })
          .optional(),

        /** Authors as authors.yml entries, so each can link to an ORCID. The
          BibTeX author list is strings; this one is identities. */
        /* ▼ FEATURE:authors ▼ */
        authors: z.array(reference('authors')).default([]),
        /* ▲ FEATURE:authors ▲ */

        /** Spelled out rather than a boolean: `inPress: false` is true of a paper
          that is out and of one never submitted. */
        status: z.enum(['published', 'to-appear']).default('published'),

        /**
         * The conference or series' OWN homepage, which neither `abbr` (the
         * proceedings), `links.paper` (the publisher's copy) nor the DOI points
         * at. For a paper with an entry; the page wraps it in "Published at".
         */
        conferenceName: z.string().optional(),
        conferenceUrl: z.url().optional(),

        /** Later outings for the same work. Not in papers.bib, where one entry
          per talk would show the same paper five times on /publications/. */
        additionalPresentations: z
          .array(z.object({ name: z.string(), shortName: z.string().optional(), url: z.url() }))
          .default([]),

        /**
         * The projects this work came out of, stated here and nowhere else: a
         * project page derives its paper list by scanning this field. A project
         * with a `redirect` is fine; the page links out to it.
         *
         * Fenced because `papers` does not require `projects`: a reference() to
         * a pruned collection breaks getEntry()'s type, and every paper page.
         */
        /* ▼ FEATURE:projects ▼ */
        projects: z.array(reference('projects')).default([]),
        /* ▲ FEATURE:projects ▲ */

        /** Sort key for /papers/. Lower comes first. */
        order: z.number().int().default(100),
        featured: z.boolean().default(false),

        figure: figureFor({ image }).optional(),

        links: z.object({ paper: linkMap, replication: linkMap, slides: linkMap }).default({}),
      })
      /* Refinements rather than prose, because the failure is silent: a page
       with both sources renders whichever the markup checks first, and one
       with neither renders an empty venue line and sorts last. */
      .refine((d) => Boolean(d.publication) !== Boolean(d.venue), {
        message:
          'a paper page needs exactly one venue source: a `publication` (the BibTeX entry) or a stated `venue`',
        path: ['venue'],
      })
      .refine((d) => !(d.venue && (d.conferenceName || d.conferenceUrl)), {
        message:
          '`conferenceName`/`conferenceUrl` belong to a paper with a `publication`; a stated `venue` already carries its own label and url',
        path: ['conferenceName'],
      })
      .refine((d) => Boolean(d.publication) !== (d.year !== undefined), {
        message:
          'set `year` only on a paper with no `publication` — with an entry the year comes from the BibTeX, and without one nothing else has a date',
        path: ['year'],
      }),
});

/** Things you have made. An entry with `redirect` is a link out and gets no
    page of its own. */
const projects = defineCollection({
  loader: glob({ base: 'src/content/projects', pattern: '**/*.md' }),
  /** A function so it can take `image()`: the logo and the figure both go
      through the asset pipeline from src/assets/. */
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      /**
       * Buckets on /projects/; the labels live on that page. Optional: leave it
       * off every entry for a flat list, and entries without one gather under
       * a final "Other" group rather than dropping off the page.
       */
      category: z.enum(['research', 'tools', 'misc']).optional(),
      order: z.number().int().default(100),
      /** When set, the entry links straight out and no page is generated. */
      redirect: z.url().optional(),
      /** The two or three repositories a reader of THIS project needs, as
          chips. Not the site-wide /repositories/ list. */
      repositories: z.array(z.object({ name: z.string(), url: z.url() })).default([]),
      logo: image().optional(),
      /** An overview diagram: the same sub-schema the papers use, so the two
          cannot mean different things. */
      figure: figureFor({ image }).optional(),
    }),
});

/** Front matter in the wild uses both `tags: x` and `tags: [x, y]`. */
const toArray = (v: string | string[]) => (Array.isArray(v) ? v : [v]);

/** Posts. The FILENAME sets the URL and must be YYYY-MM-DD-slug; blog.ts says why. */
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

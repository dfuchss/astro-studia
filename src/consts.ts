import {
  BLOG,
  CV,
  IMPRINT,
  PAPERS,
  PEOPLE,
  PGP_KEY,
  PROJECTS,
  PUBLICATIONS,
  REPOSITORIES,
} from './lib/paths.ts';

/**
 * The config file: single values, short lists, the words the template prints.
 * Lists that grow live in `src/data/`, prose in `src/content/`.
 * docs/Configuration.md.
 */

/** A line of text, or one with exactly one link in it. See SITE.tagline. */
export type Tagline =
  string | { before: string; link: { label: string; href: string }; after?: string };

export const SITE = {
  /** No trailing slash. With a `base` configured, include that path. */
  url: 'https://dfuchss.github.io/astro-studia',

  title: 'Marcus Tullius Cicero — Studia Theme demo',

  /** What the nav shows. Has to fit beside the nav items on a phone. */
  brand: 'M. T. Cicero',

  /** A fainter prefix before the brand, `~/name`. null for a plain wordmark. */
  brandPrompt: '~/',

  /** A mark beside the wordmark, or `null`. Dimensions and alt are derived;
      `replacesWordmark` for a logo with the name already in it. */
  brandLogo: { src: '/assets/img/brand-mark.svg', replacesWordmark: false } as {
    src: string;
    replacesWordmark?: boolean;
  } | null,

  /** The line under the name in the hero. Parts join with no added spaces. */
  tagline: {
    before: 'Bringing ',
    link: { label: 'Greek philosophy', href: 'https://plato.stanford.edu/entries/stoicism/' },
    after: ' into Latin.',
  } as Tagline,

  description:
    'Demo content for Studia Theme, an academic Astro starter. Replace src/consts.ts, src/data/ and src/content/ with your own.',

  /** Used for <html lang>. */
  lang: 'en',

  /** Formats every date and number; toLocaleString()'s default drifts between machines. */
  locale: 'en-US',

  email: 'cicero@example.org',

  repo: 'https://github.com/dfuchss/astro-studia',

  /** The 1200x630 link-preview card. null for the small text-only card. */
  ogImage: '/assets/img/og.png',

  /** The footer's "© 2026 <this>" — a site about someone need not be copyright them. */
  copyright: 'Dominik Fuchß',

  /** SET THIS TO null once the content is yours: banner on the entry page, line in the footer. */
  demoNotice:
    "Demo content for the Studia Theme starter — the works are Cicero's, the website is not.",
} as const;

/**
 * Who the site is about. `surnames` is how an author parsed out of papers.bib is
 * recognised as you (accents and ß folded; see isSelf()) — list every name you,
 * or every member of a group, has published under.
 */
export const SELF = {
  first: 'Marcus Tullius',
  last: 'Cicero',
  surnames: ['Cicero'],
} as const;

/**
 * The areas of the site; `<body data-section>` picks the accent family. ADDING
 * ONE IS TWO EDITS: this union and a `[data-section='…']` block in tokens.css,
 * and the audit compares the two.
 */
export type Section =
  'home' | 'publications' | 'papers' | 'projects' | 'repositories' | 'blog' | 'people' | 'cv';

/** Top-level navigation. The demo ships every area — docs/Removing-Features.md. */
export const NAV: { label: string; href: string; section: Section }[] = [
  { label: 'about', href: '/', section: 'home' },
  { label: 'publications', href: PUBLICATIONS, section: 'publications' },
  { label: 'papers', href: PAPERS, section: 'papers' },
  { label: 'projects', href: PROJECTS, section: 'projects' },
  { label: 'blog', href: BLOG, section: 'blog' },
  { label: 'repositories', href: REPOSITORIES, section: 'repositories' },
  { label: 'people', href: PEOPLE, section: 'people' },
  { label: 'cv', href: CV, section: 'cv' },
];

/** The thin link row in the footer. Add or drop freely. */
export const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: 'Feed', href: '/feed.xml' },
  { label: 'PGP', href: PGP_KEY },
  { label: 'Imprint', href: IMPRINT },
];

/**
 * The rest of the footer. `affiliation` joins with no added spaces; anything
 * these three cannot express goes through Base.astro's `footer` slot.
 */
export const FOOTER: {
  affiliation: (string | { label: string; href: string })[];
  email: boolean;
  credit: boolean;
} = {
  affiliation: [
    'Written at ',
    { label: 'Tusculum', href: 'https://en.wikipedia.org/wiki/Tusculum' },
    ' and ',
    { label: 'Arpinum', href: 'https://en.wikipedia.org/wiki/Arpino' },
  ],
  email: true,
  credit: true,
};

/** Author names shown before "and N more authors". `null` lists everyone. */
export const AUTHOR_LIMIT: number | null = 4;

/** The words under the counted numbers in the hero. Fenced per key: a label
    left behind by a prune would offer a stat with no number under it. */
export const STAT_LABELS = {
  /* ▼ FEATURE:publications ▼ */
  publications: 'publications',
  /* ▲ FEATURE:publications ▲ */
  /* ▼ FEATURE:citations ▼ */
  citations: 'citations',
  hIndex: 'h-index',
  /* ▲ FEATURE:citations ▲ */
  /* ▼ FEATURE:projects ▼ */
  projects: 'projects',
  /* ▲ FEATURE:projects ▲ */
  /* ▼ FEATURE:people ▼ */
  people: 'collaborators',
  /* ▲ FEATURE:people ▲ */
};

/* ▼ FEATURE:people ▼ */
/** The chips on a person's card at /people/; `orcid` shows the word or the id itself. */
export const PEOPLE_CHIPS: {
  homepage: string;
  orcid: 'label' | 'id';
  github: string;
  email: string;
} = {
  homepage: 'Website',
  orcid: 'id',
  github: 'GitHub',
  email: 'Email',
};
/* ▲ FEATURE:people ▲ */

/** Extra origins the audit tolerates for subresources — an embedded talk's host. */
export const ALLOWED_THIRD_PARTY: string[] = [];

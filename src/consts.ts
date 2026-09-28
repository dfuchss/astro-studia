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
 * The config file.
 *
 * Everything here is read by code somewhere. Lists that grow — your
 * bibliography, your CV, the people in your group — live in `src/data/`
 * instead, and prose lives in `src/content/`. Page copy stays on its page.
 */

/** A line of text, or one with exactly one link in it. See SITE.tagline. */
export type Tagline =
  string | { before: string; link: { label: string; href: string }; after?: string };

export const SITE = {
  /**
   * No trailing slash. `astro.config.ts` and `src/pages/robots.txt.ts` both
   * read this, so it is the only place the site's address is written down.
   */
  url: 'https://example.com',

  title: 'Marcus Tullius Cicero — Studia Theme demo',

  /**
   * What the nav shows. A <title> and a brand mark have different length
   * budgets: the title can afford to disambiguate, the brand has to fit beside
   * the nav items on a phone. Keep this to a word or two.
   */
  brand: 'M. T. Cicero',

  /**
   * A prefix rendered in front of the brand in a fainter colour — the shell
   * prompt conceit, `~/name`. Set it to null for a plain wordmark, or to
   * something else entirely; it is decoration and nothing depends on it.
   */
  brandPrompt: '~/',

  /**
   * A mark beside the wordmark in the nav: a group's logo, a project's, a
   * personal seal. `null` for the wordmark alone.
   *
   * A path under public/ and one decision. Nothing else, and in particular no
   * dimensions — Nav.astro reads the file's own aspect ratio off disk and
   * scales it to the bar's height, so a wide logo and a square one both fit
   * without an edit here, and a path with no file behind it is a build error
   * naming the path rather than a silently broken image. And no `alt`: a mark
   * beside the site's own name is decoration, so it takes alt="" rather than
   * making a screen reader say the name twice, while a mark that REPLACES the
   * name IS the name and takes SITE.brand. Both are derived; neither is a
   * choice worth offering.
   *
   * ardoco.de is the case this exists for: a logo and the site's name side by
   * side. `replacesWordmark` is for a logo with the name drawn into it, where
   * the text beside it would be the same word twice.
   */
  brandLogo: { src: '/assets/img/brand-mark.svg', replacesWordmark: false } as {
    src: string;
    replacesWordmark?: boolean;
  } | null,

  /**
   * One line under the name in the hero: the role, for a person; the pitch,
   * for a project. A plain string, or a string with ONE link in it — the
   * shape below, which fuchss.org needs for "Researcher at the [KIT]" and
   * which is not HTML: three typed fields that the Tagline component joins
   * without adding a space, so the punctuation is exactly what you wrote.
   */
  tagline: {
    before: 'Bringing ',
    link: { label: 'Greek philosophy', href: 'https://plato.stanford.edu/entries/stoicism/' },
    after: ' into Latin.',
  } as Tagline,

  description:
    'Demo content for Studia Theme, an academic Astro starter. Replace src/consts.ts, src/data/ and src/content/ with your own.',

  /** Used for <html lang>. */
  lang: 'en',

  /**
   * Every date and number on the site is formatted with this, not with
   * toLocaleString()'s default — which follows the *build machine's* locale
   * and so silently differs between your laptop and CI.
   */
  locale: 'en-US',

  email: 'cicero@example.org',

  repo: 'https://github.com/dfuchss/astro-studia',

  /**
   * The card image a link to this site renders with, 1200x630. Set it to null
   * and BaseHead falls back to the small text-only card — which is the honest
   * thing, because `summary_large_image` without an image is a blank rectangle.
   *
   * Regenerate or replace public/assets/img/og.png; the shipped one says so.
   */
  ogImage: '/assets/img/og.png',

  /**
   * The footer's copyright holder — "© 2026 <this>".
   *
   * Your own name, or your group's or institution's if the site is theirs.
   * Kept separate from `brand` because the two are genuinely different: a site
   * *about* someone is not necessarily copyright them — which is the trap the
   * demo content below would otherwise walk straight into, since it renders
   * somebody else's name in the nav.
   */
  copyright: 'Dominik Fuchß',

  /**
   * DELETE THIS LINE (set it to null) once the content is yours.
   *
   * While it is set, a banner sits at the top of the home page and a line runs
   * in the footer saying the content is a demo — so that an unmodified deploy
   * cannot be mistaken for a real site.
   *
   * Nothing else depends on it — components/DemoNotice.astro renders nothing
   * when it is null.
   */
  demoNotice:
    "Demo content for the Studia Theme starter — the works are Cicero's, the website is not.",
} as const;

/**
 * Who the site is about.
 *
 * `surnames` is how an author parsed out of `papers.bib` is recognised as you,
 * so your name renders bold in an author list. Matching folds accents and the
 * German sharp s, so "Fuchß"/"Fuchss" and "Muñoz"/"Munoz" both hit — see
 * `isSelf()` in `src/lib/authors.ts`. List more than one if you have published
 * under another name.
 *
 * For a group site, list every member's surname here — or delete SELF along
 * with the bolding in `src/components/pub/PubEntry.astro`.
 */
export const SELF = {
  first: 'Marcus Tullius',
  last: 'Cicero',
  surnames: ['Cicero'],
} as const;

/**
 * The areas of the site, and the accent-colour cascade.
 *
 * Whatever lands on `<body data-section>` re-points the neutral `--sec-*`
 * aliases at one accent family in `src/styles/tokens.css`, so a single set of
 * components recolours itself per area. Nav links carry it too, which is how
 * each one previews the colour of the page it leads to.
 *
 * ADDING A SECTION IS TWO EDITS: this union, and a matching
 * `[data-section='…']` block in `src/styles/tokens.css`. Forget the second and
 * `scripts/audit-site.mjs` fails the build — it compares the two.
 */
export type Section =
  'home' | 'publications' | 'papers' | 'projects' | 'repositories' | 'blog' | 'people' | 'cv';

/**
 * Top-level navigation.
 *
 * The demo ships every area the template knows how to render, which is more
 * than any real site wants. Your first edit is almost certainly deleting most
 * of these rows — see `docs/removing-features.md` for what else goes with each.
 */
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
 * The rest of the footer. Every part of it that differed between the two
 * sites this template came from is a field here; the layout is not.
 *
 * `affiliation` is the line after the copyright — "developed at the MCSE
 * group, KASTEL, KIT" on ardoco.de — as plain strings and links in order,
 * joined without spaces, so what you write is what renders. Empty for none.
 *
 * `email` puts SITE.email in the footer through components/Email.astro, which
 * is the only way an address is allowed into a page: the audit greps the
 * built output for anything address-shaped and fails on a plain mailto.
 *
 * `credit` is the "Built with Astro and Studia Theme" line. The licence is MIT
 * and turning this off is expected, not a breach — a credit that cannot be
 * switched off is one people delete from the component on day one.
 *
 * Markup none of these can express goes in Base.astro's `footer` slot.
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

/**
 * How many author names a publication entry shows before "and N more
 * authors". `null` lists everyone — what a group site wants, where the point
 * of the list is the people on it and eliding nine of sixteen entries would
 * hide most of the group. (At exactly limit + 1 names all are shown anyway;
 * see truncateAuthors() in src/lib/authors.ts.)
 */
export const AUTHOR_LIMIT: number | null = 4;

/**
 * The words under the numbers in the hero. The numbers are counted from the
 * collections and cannot be edited; the words can. fuchss.org's fourth stat
 * reads "replication packages", and that is not a rename this component
 * should have to be edited for. A key with no stat behind it is simply unread.
 */
export const STAT_LABELS = {
  publications: 'publications',
  citations: 'citations',
  hIndex: 'h-index',
  projects: 'projects',
  people: 'collaborators',
};

/* ▼ FEATURE:people ▼ */
/**
 * The chips on a person's card at /people/. `homepage` is the label for their
 * `url` — ardoco.de says "Website at KIT", because everyone's is. `orcid`
 * shows either the word or the identifier itself ('id'), which is what a
 * registry-minded reader wants to see and copy.
 */
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

/**
 * Origins `scripts/audit-site.mjs` will tolerate in the built HTML, beyond
 * your own. Empty means first-party only: no script, style, image, iframe or
 * font may point anywhere else, and a new one cannot appear unnoticed.
 *
 * Add an origin when you deliberately embed something — a site that embeds a
 * conference talk would put `'www.youtube.com'` here, and nothing else.
 */
export const ALLOWED_THIRD_PARTY: string[] = [];

/**
 * The config file.
 *
 * Everything here is read by code somewhere. Lists that grow — your
 * bibliography, your CV, the people in your group — live in `src/data/`
 * instead, and prose lives in `src/content/`. Page copy stays on its page.
 */

export const SITE = {
  /**
   * No trailing slash. `astro.config.ts` and `src/pages/robots.txt.ts` both
   * read this, so it is the only place the site's address is written down.
   */
  url: 'https://example.com',

  title: 'Marcus Tullius Cicero — aca-theme demo',

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

  /** One line under the title on the home page and in the feed. Optional. */
  tagline: 'Bringing Greek philosophy into Latin.',

  description:
    'Demo content for aca-theme, an academic Astro starter. Replace src/consts.ts, src/data/ and src/content/ with your own.',

  /** Used for <html lang>. */
  lang: 'en',

  /**
   * Every date and number on the site is formatted with this, not with
   * toLocaleString()'s default — which follows the *build machine's* locale
   * and so silently differs between your laptop and CI.
   */
  locale: 'en-US',

  email: 'cicero@example.org',

  repo: 'https://github.com/dfuchss/aca-theme',

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
    "Demo content for the aca-theme starter — the works are Cicero's, the website is not.",
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
  { label: 'publications', href: '/publications/', section: 'publications' },
  { label: 'papers', href: '/papers/', section: 'papers' },
  { label: 'projects', href: '/projects/', section: 'projects' },
  { label: 'blog', href: '/blog/', section: 'blog' },
  { label: 'repositories', href: '/repositories/', section: 'repositories' },
  { label: 'people', href: '/people/', section: 'people' },
  { label: 'cv', href: '/cv/', section: 'cv' },
];

/** The thin link row in the footer. Add or drop freely. */
export const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: 'Feed', href: '/feed.xml' },
  { label: 'PGP', href: '/pgp-key/' },
  { label: 'Imprint', href: '/imprint/' },
];

/**
 * Origins `scripts/audit-site.mjs` will tolerate in the built HTML, beyond
 * your own. Empty means first-party only: no script, style, image, iframe or
 * font may point anywhere else, and a new one cannot appear unnoticed.
 *
 * Add an origin when you deliberately embed something — a site that embeds a
 * conference talk would put `'www.youtube.com'` here, and nothing else.
 */
export const ALLOWED_THIRD_PARTY: string[] = [];

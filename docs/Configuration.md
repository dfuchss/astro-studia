# Configuration

Two places, and a handful of filenames.

`src/consts.ts` is the config file: single values, short lists, and the words the
template prints. Lists that grow — your bibliography, your CV, the people in your
group — live in `src/data/` instead, and prose lives in `src/content/`. Page copy
stays on its page.

Everything in `src/consts.ts` is read by code somewhere. If you cannot find where
a value goes, grep for it; there is nothing decorative in there but
`SITE.brandPrompt`.

## `SITE`

| Field         | Is                                                                                                                                                                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`         | The site's address, **no trailing slash**. `astro.config.ts` and `src/pages/robots.txt.ts` both read it, so it is written once. With a `base` configured it includes that path.                                                                                               |
| `title`       | The `<title>` suffix. Can afford to disambiguate.                                                                                                                                                                                                                             |
| `brand`       | What the nav shows. Has to fit beside the nav items on a phone, so a word or two.                                                                                                                                                                                             |
| `brandPrompt` | A fainter prefix before the brand — the shell-prompt conceit, `~/name`. `null` for a plain wordmark. Pure decoration.                                                                                                                                                         |
| `brandLogo`   | `{ src, replacesWordmark? }` or `null` — see below.                                                                                                                                                                                                                           |
| `tagline`     | The line under the name in the hero. A string, or one with exactly one link in it — see below.                                                                                                                                                                                |
| `description` | The default meta description, and the fallback for any page without one.                                                                                                                                                                                                      |
| `lang`        | `<html lang>`.                                                                                                                                                                                                                                                                |
| `locale`      | Passed to every date and number format on the site. Explicit because `toLocaleString()`'s default follows the _build machine's_ locale, so your laptop and CI would disagree.                                                                                                 |
| `email`       | Your address. It never reaches the served bytes — see `FOOTER.email` and `contact.yml`.                                                                                                                                                                                       |
| `repo`        | Your repository, linked from the footer credit.                                                                                                                                                                                                                               |
| `ogImage`     | The 1200×630 link-preview card, or `null`. See below.                                                                                                                                                                                                                         |
| `copyright`   | The footer's "© 2026 —". Kept separate from `brand` because a site _about_ someone is not necessarily copyright them.                                                                                                                                                         |
| `demoNotice`  | **Delete this (set it to `null`).** While it is set, a banner sits on the entry page and a line runs in the footer saying the content is a demo, so an unmodified deploy cannot be mistaken for a real site. `components/DemoNotice.astro` renders nothing when it is `null`. |

### `brandLogo`

A path under `public/`, and one decision:

```ts
brandLogo: { src: '/assets/img/brand-mark.svg' },                          // beside the wordmark
brandLogo: { src: '/assets/img/brand-mark.svg', replacesWordmark: true },  // instead of it
brandLogo: null,                                                          // wordmark alone
```

There are deliberately **no dimensions** to declare. `Nav.astro` fixes the height
(`LOGO_HEIGHT`, 24px) and reads the file's own aspect ratio off disk for the
width, so a wide logo and a square one both fit, the `width`/`height` the audit
requires on every `<img>` are always present, and a path with no file behind it is
a build error naming the path rather than a silently broken image.

There is no `alt` either, for the same reason: beside the wordmark the mark is
decoration and takes `alt=""` rather than making a screen reader say the site's
name twice; in place of the wordmark it _is_ the name and takes `SITE.brand`.

`ProjectHero.astro` — the centred hero a project or group site opens with — reads
the same value, falling back to `/favicon.svg`, so a site with a logo does not
show it in the corner and a favicon in the middle of its own front page.

### `tagline`

A plain string, or three typed fields with one link between them:

```ts
tagline: {
  before: 'Researcher at the ',
  link: { label: 'Karlsruhe Institute of Technology', href: 'https://kit.edu/' },
  after: ', Germany.',
} as Tagline,
```

`Tagline.astro` joins the three with **no added whitespace**, so the punctuation
is exactly what you wrote — which is the case this shape exists for: that
trailing comma is impossible if the component inserts spaces. Not HTML, on
purpose: a tagline is one sentence with at most one link in it, and a string of
markup in a config file is a string nothing can check.

### `ogImage`

`public/assets/img/og.png`, 1200×630, which is what every platform crops from.
The shipped one says "replace this" in 76px type so you notice.

Set it to `null` and `BaseHead.astro` falls back to `twitter:card: summary` — the
small text-only card — because `summary_large_image` with no image is a blank
rectangle, which is worse than the card it replaced.

For a per-page image, take an optional `image` prop through `BaseHead` the way
`title` and `description` already do.

## `SELF`

```ts
export const SELF = { first: 'Marcus Tullius', last: 'Cicero', surnames: ['Cicero'] } as const;
```

`surnames` is how an author parsed out of `papers.bib` is recognised as you, so
your name renders bold in an author list. Matching folds accents and the German
sharp s, so `Fuchß`/`Fuchss` and `Muñoz`/`Munoz` both hit — see `isSelf()` in
`src/lib/authors.ts`. List every form you have published under, including a
previous name.

For a group site, list **every member's** surname here — or delete `SELF` along
with the bolding in `src/components/pub/PubEntry.astro`.

## `Section` and `NAV`

`Section` is the union of areas the site has. Whatever lands on
`<body data-section>` re-points the neutral `--sec-*` aliases at one accent
family in `src/styles/tokens.css`, so one set of components recolours itself per
area. Nav links carry the attribute too, which is how each one previews the
colour of the page it leads to.

**Adding a section is two edits**: this union, and a matching
`[data-section='…']` block in `tokens.css`. Forget the second and the build fails
— `scripts/audit-site.mjs` collects every value out of the built HTML and every
selector out of the built CSS and compares them.

`NAV` is the top bar: a `label`, an `href` (from `src/lib/paths.ts`, not a
literal) and the `section` whose accent the link carries. The demo ships every
area the template can render, which is more than any real site wants; deleting
most of these rows is usually the first edit. See
[Removing features](Removing-Features.md) for what goes with each.

## `FOOTER_LINKS` and `FOOTER`

`FOOTER_LINKS` is the thin link row — `Feed`, `PGP`, `Imprint` as shipped. Add
and drop freely.

`FOOTER` is the rest. Every part of the footer that differed between the two
sites this template came from is a field here; the layout is not.

```ts
export const FOOTER = {
  affiliation: [
    'Written at ',
    { label: 'Tusculum', href: '…' },
    ' and ',
    { label: 'Arpinum', href: '…' },
  ],
  email: true,
  credit: true,
};
```

- `affiliation` is the line after the copyright — "developed at the MCSE group,
  KASTEL, KIT" on ardoco.de — as plain strings and links **in order, joined
  without spaces**, so what you write is what renders. An empty array for none.
- `email` puts `SITE.email` in the footer through `components/Email.astro`, which
  is the only way an address is allowed into a page: the audit greps the built
  output for anything address-shaped and fails the build on a plain `mailto:`.
- `credit` is the "Built with Astro and Studia Theme" line. The licence is MIT and
  turning this off is expected, not a breach — a credit that cannot be switched
  off is one people delete from the component on day one.

Markup none of these can express goes in `Base.astro`'s `footer` slot, which
`Footer.astro` renders as its default slot.

## `AUTHOR_LIMIT`

How many author names a publication entry shows before "and N more authors".

```ts
export const AUTHOR_LIMIT: number | null = 4;
```

`null` lists everyone, which is what a group site wants: the people **are** the
point of its list, and eliding nine of sixteen would hide most of the group. At
exactly `limit + 1` names all are shown anyway — "and 1 more author" takes more
room than the name it stands in for and tells the reader less. See
`truncateAuthors()` in `src/lib/authors.ts`.

## `STAT_LABELS`

The words under the counted numbers in the hero. The numbers come from the
collections and cannot be edited; the words can.

```ts
export const STAT_LABELS = {
  publications: 'publications',
  citations: 'citations',
  hIndex: 'h-index',
  projects: 'projects',
  people: 'collaborators',
};
```

fuchss.org's fourth stat reads "replication packages", and that is not a rename a
component should have to be edited for. A key with no stat behind it — `people` on
the profile hero, which has no people stat — is simply unread.

## `PEOPLE_CHIPS`

The chips on a person's card at `/people/`.

```ts
export const PEOPLE_CHIPS = { homepage: 'Website', orcid: 'id', github: 'GitHub', email: 'Email' };
```

`homepage` is the label for a person's `url` — ardoco.de says "Website at KIT",
because everyone's is. `orcid` is `'label'` for the word or `'id'` for the
identifier itself, which is what a registry-minded reader wants to see and copy.

Fenced as `▼ FEATURE:people ▼`, so `npm run init` takes it with the roster.

## `ALLOWED_THIRD_PARTY`

Origins the audit will tolerate as _subresources_ in the built HTML, beyond your
own. It ships empty, which means first-party only: no script, style, image,
iframe or font may point anywhere else, and a new one cannot appear unnoticed.

```ts
export const ALLOWED_THIRD_PARTY: string[] = ['www.youtube.com'];
```

Links to other sites are the whole point of an academic page and are never
counted here — only the things a browser fetches without being asked, which are
also the things that see your readers' IP addresses. Add an origin when you
deliberately embed something, and nothing else. See
[Verification](Verification.md).

## `src/data/`

Nine files. Four are content collections with Zod schemas behind them
([Content](Content.md) has those); the rest are plain YAML or JSON read through
`src/lib/data.ts`.

| File                  | Is                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `papers.bib`          | Your bibliography. Standard BibTeX plus `abbr`, `pdf` and `page`, all three checked at build time. |
| `venues.yml`          | Badge name, URL and brand colour, keyed by the BibTeX `abbr`.                                      |
| `authors.yml`         | Everyone who appears anywhere: name and ORCID, nothing else.                                       |
| `people.yml`          | Who appears at `/people/`. **The key is the anchor**, so renaming one changes a published URL.     |
| `cv.yml`              | The whole of `/cv/`. Sections in file order; see below.                                            |
| `contact.yml`         | The rows under "Get in touch", on the entry page and in the `/cv/` lede.                           |
| `socials.yml`         | Profile ids for the chip row, and the ids the data scripts need. Every field optional.             |
| `repositories.yml`    | What `/repositories/` lists: GitHub users, GitHub repos, Zenodo DOIs.                              |
| `language_colors.yml` | GitHub's language colours, for the dot beside a repository's language.                             |

Plus two **generated and committed** files, which is what makes a fresh clone
build offline with no network and no token:

| File                   | Written by                            | Refreshed by                                   |
| ---------------------- | ------------------------------------- | ---------------------------------------------- |
| `citations.yml`        | `scripts/update_scholar_citations.py` | `.github/workflows/update-citations.yml`       |
| `github-metadata.json` | `scripts/fetch-github-metadata.mjs`   | `.github/workflows/update-github-metadata.yml` |

Both workflows are opt-in and on demand only, and both need a PAT. See
[Deploying](Deploying.md).

### `cv.yml`

Every section has the same shape — a title, a heading, a list of entries — so
adding "Service" or "Grants" is a new block here and no code at all. Order on the
page is order in the file.

A section renders as a **timeline** (a date rail) if any entry carries a date, or
**rows** (no rail) otherwise, unless `layout:` names one of the two other shapes:
`cards`, a grid for entries with a name, an optional since-date and highlight
chips; or `courses`, a semester-grouped grid where the current semester stays open
and earlier ones collapse.

`count:` puts a noun beside the heading — "Rhetorical instruction 24 courses".
Opt-in, and only worth it where the number is itself the point: a bare count on
every heading is noise the reader can see for themselves.

Every field of an entry except `title` is optional: `org`, `url`, `start`, `end`,
`location`, `note`, `details` (bullets, which may embed a markdown link),
`current: true`, which renders "– present" and a `now` badge and is what the
entry page's "where" row reads, and `minor: true`, which sends a long run of
repeated low-value entries into a collapsed "N more" disclosure instead of
burying the ones that matter. An entry with a `start` and no `end` is a single
date, not an open range: a degree or a prize is not "to the present".

The file's own header documents every field with an example. Read that before
this table.

### `contact.yml`

See [Content](Content.md) for the row shape. The one rule worth repeating here:
**an address goes in `email:`, never in `value:`.** `email:` renders through
`Email.astro`, which splits and rot13s the address so it is not in the served
bytes. A `value:` that looks like an address is rejected at build time with the
row's label, so you find out from the file that caused it rather than from the
audit afterwards.

Two rows are **derived** and appear after the listed ones: the PGP key id, from
`pgp_fingerprint` in `socials.yml`, and your current position, from `cv.yml`.
Neither is repeated here, because a second copy is a copy that can disagree.

### `socials.yml`

`orcid_id`, `scholar_userid`, `github_username`, `dblp_url`,
`linkedin_username`, `semanticscholar_id`, `pgp_fingerprint`, plus `extra[]` for
anything the fixed fields do not cover. Set a field to `null` (or delete the
line) and its chip does not render — that is how you remove a profile you do not
have, rather than by editing `SocialRow.astro`.

An `extra` entry's `icon` may name one of the marks in `SocialRow.astro` — `orcid`,
`scholar`, `dblp`, `github`, `codeberg`, `linkedin`, `semanticscholar` — and
without one it renders as a text chip, so an unfamiliar platform still looks
deliberate. The fixed list is a convenience, not a whitelist: where an academic
keeps a profile is not something a template gets to decide.

`scholar_userid` does two things: it renders the Scholar chip, and it tells
`scripts/update_scholar_citations.py` whose citations to fetch.
`pgp_fingerprint` is the only setting `/pgp-key/` has — the key id, the grouped
fingerprint, the download path and the inlined armored block all derive from it.

## The settings that are filenames

Five things are configured by putting a file somewhere, with no line in
`src/consts.ts` at all. That is deliberate in each case: a configured path string
is a string that can point at nothing.

| Put it at                                     | And                                                                                                                                                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/assets/portrait.{jpg,png,webp,avif,svg}` | `src/lib/portrait.ts` finds it by `import.meta.glob` at build time, so `<Image>` can optimise it and the audit gets its intrinsic dimensions. None, or two of them, is a build error naming the path.                                        |
| `public/assets/pgp-key/<FINGERPRINT>.asc`     | `/pgp-key/` inlines the armored block in a `<pre>` with a copy button, read at build time so it works without JS and is indexable. No file there is a **supported** state: the page keeps the fingerprint, the key id and the download link. |
| `public/assets/pdf/**.pdf`                    | `astro.config.ts` walks the directory recursively and feeds the result to the sitemap's `customPages`, because the integration lists pages Astro builds and a file in `public/` is not one. Adding a paper needs no upkeep.                  |
| `public/CNAME`                                | Copied into `dist/`, and `npm run verify` then fails if it ever stops being emitted — the deploy replaces the branch wholesale, so that would be a domain that stops resolving.                                                              |
| `public/.htaccess`                            | Copied verbatim. `ErrorDocument 404 /404.html` for a host that is not GitHub Pages. See [Deploying](Deploying.md).                                                                                                                           |

`public/.nojekyll` is already there and must stay: without it GitHub Pages runs
Jekyll, which ignores directories beginning with an underscore — which is where
Astro puts every hashed asset. `verify` checks for it.

## `astro.config.ts`

Three things you may want to change, all commented in place:

- **`base`** — for a project page at `https://<user>.github.io/<repo>/`. Set it to
  `'/<repo>'` and put the full address including that path in `SITE.url`. The
  `base-paths` integration handles every hand-written internal link and asset,
  including the ones in markdown and YAML no helper function could reach.
- **`redirects`** — for URLs you have published elsewhere and cannot move.
- **`markdown.shikiConfig`** — the code-block theme.

`trailingSlash` and `build.format` are **derived** from `URL_POLICY` in
`src/lib/paths.ts` and should not be set by hand; they are one decision, not two.
See [Deploying](Deploying.md).

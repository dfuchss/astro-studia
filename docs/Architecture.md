# Architecture

An Astro static site with no UI framework, no CSS framework and no theme layer.
There is no runtime: `npm run build` produces a directory of HTML, CSS and a
little inline JavaScript, and nothing on the host has to do anything but serve
files.

This page is the map. It says what each piece is for and, where the answer is not
obvious, what the alternative was and why it lost.

## The shape of a build

```
astro.config.ts
  ├─ SITE.url          ← src/consts.ts               the address, written once
  ├─ trailingSlash,    ← URL_POLICY in lib/paths.ts  derived, not configured
  │  build.format
  ├─ publicPdfs()      walks public/assets/pdf/ → the sitemap's customPages
  └─ integrations: [ sitemap, sitemapShape, basePaths ]

src/content.config.ts        seven collections
  ├─ file()      venues.yml, authors.yml, people.yml
  ├─ glob()      content/papers/, content/projects/, content/posts/
  └─ bibtexLoader()  data/papers.bib  → the `publications` collection

src/pages/**                 routes; each renders through layouts/Base.astro
src/lib/**                   every question a page asks, answered in one place
src/data/**                  the YAML and JSON, read through lib/data.ts

dist/
  ├─ @astrojs/sitemap writes sitemap-index.xml + sitemap-0.xml
  ├─ sitemapShape()   rewrites each <loc> to the file that was emitted
  └─ basePaths()      prefixes every hand-written URL with `base`, if set
```

The integration order in `astro.config.ts` is load-bearing: `sitemapShape` has to
run after the sitemap exists, and both run at `astro:build:done` in the order
listed.

## `URL_POLICY` — the one decision everything else follows

`URL_POLICY` in `src/lib/paths.ts` is `'directory'` or `'preserve'`, and it is the
single place the site's URL _shape_ is decided. Five things read it, and nothing
else needs to:

| Reader                              | Does                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `astro.config.ts`                   | derives `trailingSlash` and `build.format`                                                          |
| `paperPath()`                       | the one link helper whose shape differs between the two                                             |
| `routePath()`                       | turns `Astro.url.pathname` — the **file** path under `'preserve'` — back into the published address |
| `src/pages/feed.xml.ts`             | emits every item link absolute, so `@astrojs/rss` cannot re-shape it                                |
| `src/integrations/sitemap-shape.ts` | rewrites each sitemap entry to the file that exists                                                 |

And `scripts/audit-site.mjs` asserts the outcome: every internal link, canonical,
sitemap entry and feed link must name a file on disk **by its exact shape**, so a
page or helper that gets the policy wrong fails the build rather than shipping a 404. [Deploying](Deploying.md) has the policy itself; [Verification](Verification.md)
has the resolution rule.

`paths.ts` also holds every route prefix as a constant. Nothing else builds a path
by interpolating a slug into a string, and nothing else writes one of those
prefixes as a literal — not a back link, not a breadcrumb, not a `NAV` row, not
even the regex `src/content.config.ts` validates a `page = {…}` field with, which
is _assembled_ from `PAPERS` precisely so a route rename cannot leave a validator
behind insisting on the old prefix.

## The BibTeX loader

`src/loaders/bibtex.ts` is an Astro content loader: `src/data/papers.bib` in, a
typed `publications` collection out. It exists because the alternative — a YAML
copy of your bibliography — is a second copy of a file you already maintain, and
the two disagree within a month.

Three things about it are not obvious:

**It parses the file twice.** Once decoded to Unicode, for display; once raw, so
the BibTeX block a reader copies keeps its LaTeX escapes verbatim rather than a
normalised approximation. Brace protection survives: `{Acronym}` stays `Acronym`
rather than being sentence-cased.

**`links[]` declares the fields that are yours rather than the bibliography's.** A
`.bib` accumulates bookkeeping — a path to the PDF you host, a path to the paper's
own page on your site — and those are the fields most likely to rot, because
nothing about renaming a file tells you a `.bib` entry still points at the old
name. Declaring one does three things at once: validates the value against disk,
exposes the result on the collection entry under `as`, and keeps the field out of
the copyable citation. Declare the `as` key in the schema too, or Zod strips it
back out.

**Errors carry the entry key.** A `.bib` is one long list of near-identical
records, and the key is the only thing that says which one.

`abbr`, `google_scholar_id` and `selected` are stripped from the copyable block by
default, and every `links[].field` is added to that list automatically — an
internal path has no business in a citation someone pastes into their own `.bib`,
and making you remember that separately is a trap.

## Collections and cross-references

Seven collections, in `src/content.config.ts`. Three are YAML through `file()`,
three are markdown through `glob()`, one is the BibTeX loader.

Every cross-reference goes through Astro's `reference()`. That is the point of the
whole file: a bad slug, an unknown venue or a BibTeX key pointing at a page that
does not exist stops the build with the offending id in the message. The same
mistake in a template language is a silent lookup that renders blank.

It also makes the dependency graph real rather than advisory, which is why
[removing features](Removing-Features.md) has an order:

```
venues ← publications ← papers → authors ← people
                          ↓
                       projects
```

The `papers` schema carries the sharpest constraint in the codebase, as three Zod
refinements: a paper page has **exactly one** venue source — a `publication` (the
BibTeX entry) or a stated `venue` object — `conferenceName`/`conferenceUrl` belong
only to the first, and `year` only to the second. Refinements rather than prose,
because the failure they prevent is silent: a page with both renders whichever the
markup happens to check first, and a page with neither renders an empty venue line
and sorts to the end of every list. See [Content](Content.md).

## `src/lib/` — one answer per question

The rule is that a question two pages both ask gets answered once, here. A helper
in this directory usually exists because two consumers had drifted apart.

| Module            | Answers                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `paths.ts`        | every URL shape, and `URL_POLICY`                                                                                     |
| `data.ts`         | the YAML and JSON in `src/data/`, imported with `?raw` and parsed once                                                |
| `papers.ts`       | is this page a publication or a talk; its year, venue, short label, description, byline, and which pages are featured |
| `publications.ts` | the deterministic newest-first order, and year buckets                                                                |
| `authors.ts`      | name folding (`Fuchß`/`Fuchss`), "is this me", and author-list truncation                                             |
| `people.ts`       | the roster, and the surname → anchor map that links an author name to a person                                        |
| `citations.ts`    | Scholar cluster id → count, and the h- and i10-index                                                                  |
| `blog.ts`         | the permalink, derived from the **filename**, and the published-post list                                             |
| `cv.ts`           | the CV's sections, their layouts and the count labels                                                                 |
| `contact.ts`      | the contact rows, validated, with `email: true` resolved                                                              |
| `pgp.ts`          | key id, grouped fingerprint, download path and the armored block — all from one value                                 |
| `portrait.ts`     | your portrait, found by `import.meta.glob` over `src/assets/portrait.*`                                               |
| `images.ts`       | intrinsic dimensions of the configured brand mark under `public/`, read off disk                                      |
| `feed/`           | `FeedItem`, plus two interchangeable sources — `fromPosts` and `fromPapers`                                           |

Two patterns recur and are worth recognising:

**A single stored value, everything else derived.** `pgp.ts` stores a 40-character
fingerprint and nothing else; the key id, the formatted fingerprint, the `.asc`
path and the inlined block all come from it, so the five cannot disagree. Same
instinct behind `blog.ts` deriving the permalink from the filename: reading a
`Date` with local getters shifts the day backwards anywhere west of UTC, so the
same post would publish at two different URLs depending on where it was built.

**Read from the working directory, never from `import.meta.url`.** During
`astro build` these modules are bundled into `dist/`, so a path relative to the
module points into the output and every lookup fails — while `astro dev`, which
runs the source in place, works fine. That is the worst shape of bug, because it
only appears in CI. `images.ts` and `pgp.ts` both say so at the point it matters.

Everything in `src/data/` is likewise imported with Vite's `?raw` and parsed in
`data.ts`, rather than read with `fs` at render time, for the same reason — plus
hot reload on a data file for free. Each file's import, type and export is fenced
under the feature that owns it, so `npm run init` takes all three out at once: an
unused `?raw` import still inlines a file, and once the file is gone it is a build
error rather than dead weight.

## The two integrations

Both do the same kind of thing — rewrite the bytes that are actually published,
once, at the end of the build — because both answer a question that cannot be
answered from inside a component.

### `base-paths.ts`

Astro's `base` rewrites the URLs Astro generates itself, but not a `/cv/` you wrote
by hand, and deliberately: given `/something` it cannot know whether you meant it
relative to the base or to the server root. There is no option that changes this.

The usual workaround is a `withBase()` helper called at each of the ~20 places that
emit a path. That is worse than it sounds: you have to remember it every time,
forgetting is silent, and it **cannot reach the cases that break most often** — an
image path in `people.yml`, a slides link in a paper's front matter, a plain
`![](/assets/…)` in a post. Those are strings in content, not expressions in a
component, and no helper can be called from them.

So this rewrites the output instead. Only URL-bearing attributes — `href`, `src`,
`srcset`, and `content` on exactly the meta tags where it is a URL. `<script>` and
`<style>` bodies are masked out first and restored after, because a leading slash
means something else entirely in there. It is a no-op when no base is set, and
`npm run audit` proves it worked when one is.

Its `content` matcher is worth a second look if you change it: it matches against
the **whole tag**, not the attribute alone, because an earlier version tested the
attribute match — which of course never contains the sibling `property=` — and so
silently skipped `og:image`.

### `sitemap-shape.ts`

`@astrojs/sitemap` decides whether an entry ends in a slash by looking at
`build.format`. Under `URL_POLICY: 'preserve'` that is wrong for most of the site:
`/people/` is still `people/index.html` and its address still ends in a slash, but
the sitemap says `/people`. Only the flat paper pages are right by accident.

There is no option for this, and the integration's `serialize` hook cannot tell
`/people` (a directory) from `/papers/foo` (a file) by looking at the URL. **The
build output can**: after the pages are written, one of `<path>/index.html` or
`<path>.html` exists, and that is the shape the entry must have. So this runs once
over the sitemap as written and asks the disk. A path that is itself a file (a PDF
from `customPages`) or nothing on disk at all is left alone — the audit reports the
latter.

Under the default policy every entry already ends in a slash and resolves to an
`index.html`, so nothing changes and the output is byte-identical.

## Components and layout

`src/layouts/Base.astro` is the only layout: `<html>`, the fonts, `BaseHead`, the
skip link, `Nav`, the main slot, `Footer`, and two named slots — `head` and
`footer` — for the things a page or a site needs that no config field can express.

Components are grouped by what they belong to rather than by kind:
`components/paper/`, `components/project/`, `components/people/`,
`components/pub/`, `components/hero/`. That grouping is what makes a feature
deletion a directory removal.

There is no utility framework and no class soup. `src/styles/tokens.css` holds the
values, `src/styles/base.css` the element styles and a dozen documented primitives
(`.wrap`, `.section`, `.card`, `.chip`, `.kicker`, …), and everything else is a
scoped `<style>` block in the component that needs it. See [Theming](Theming.md).

`PersonHero.astro` and `ProjectHero.astro` are the two entry-page shapes. Neither is
selected by a flag: `src/pages/index.astro` carries both inside
`▼ PRESET:profile ▼` / `▼ PRESET:project ▼` fences, and once `npm run init` has
resolved those, the hero a site uses is simply the one still imported. A
`PRESET_HERO` table would be a second place the answer is written down.

## Feature and preset fences

Two families of marker, one scanner, both scanned across all of `src/` by
`scripts/init.mjs`:

```
▼ FEATURE:<id> ▼ … ▲ FEATURE:<id> ▲     code an optional AREA owns
▼ PRESET:<name> ▼ … ▲ PRESET:<name> ▲   sections one AUDIENCE wants
```

A **feature** fence is named after an entry in `scripts/features.mjs`. Everything a
matching pair encloses goes when you drop that feature, wherever it is — an import,
a const, a markup block. A feature you keep **keeps its markers**, because you can
still drop it later.

A **preset** fence is named after a preset. Only `src/pages/index.astro` uses them
today, and init keeps the chosen one, deletes the other, and then removes the
surviving markers as well — unlike a feature, the shape of the entry page is decided
once and there is no later choice to leave a label for.

There is no `PRESET:both`: an unfenced region is already unconditional, and
labelling everything would make the common case the noisy one. Fences nest, in
either order, but must never straddle each other, because each pair is removed as a
unit.

## `scripts/`

| Script                        | Run by                       | Is                                                                                           |
| ----------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| `features.mjs`                | —                            | the manifest: what each optional area is made of. Two consumers, no prose copy.              |
| `init.mjs`                    | `npm run init`               | prunes the template to a feature set, then checks, builds and audits                         |
| `gen-docs.mjs`                | `npm run docs`, `docs:check` | regenerates the feature table in [Removing features](Removing-Features.md) from the manifest |
| `audit-site.mjs`              | `npm run audit`              | the one gate: every check over `dist/`, including the host files                             |
| `generate-favicons.mjs`       | `npm run favicons`           | rasterizes `public/favicon.svg` into the PNGs beside it                                      |
| `fetch-github-metadata.mjs`   | `npm run data:github`        | writes the committed `src/data/github-metadata.json`                                         |
| `update_bib.py`               | `npm run bib:check`          | checks `papers.bib` against Crossref. Python stdlib only.                                    |
| `update_scholar_citations.py` | the citations workflow       | writes the committed `src/data/citations.yml`. The one piece of tooling that needs pip.      |

Three of these are **scaffolding** — `init.mjs`, `features.mjs`, `gen-docs.mjs` —
and init offers to delete them and their npm scripts when it finishes. They set the
template up; a site owner does not need them.

`init.mjs` follows two rules worth knowing before you edit it. **No silent no-ops:**
every edit names a landmark in a file — `export const NAV`, `export type Section =`,
a `▼ FEATURE:x ▼` fence — and a missing _landmark_ is a hard failure, because that
means the file has been restructured and the script no longer understands it; a
missing _item_ inside a present landmark is only a warning, because that is what a
second run looks like and a second run must be safe. **It reports rather than
repairs:** a prune that left something dangling is a thing to read and fix, and
`git diff` has the whole story.

`gen-docs.mjs` exists for a narrower reason. The manifest already knows which
routes, collections, sections and hand edits belong to each feature; a second,
hand-written copy of that list in the docs is a copy that drifts, and nothing tells
you. So the table is generated between two markers, everything else in that file is
left alone, and `npm run docs:check` is what keeps it honest.

## Data that is fetched, committed, and never fetched at build time

`src/data/citations.yml` and `src/data/github-metadata.json` are written by scripts
and **committed**. The build reads the files, never the network.

That is what makes a fresh clone build with no network, no token and nothing to
rate-limit — and makes a build from six months ago produce the same page. The cost
is that the numbers are as fresh as the last run, which for a citation count is the
right trade.

Two workflows refresh them and commit the result. Both are on demand only, both
need a PAT rather than the built-in `GITHUB_TOKEN` — a push made with that token
triggers no other workflow, so the data would land and the site would never rebuild
— and both **fail loudly** when the PAT is absent rather than falling back, because
the failure that matters here is a green job whose result silently never ships. See
[Deploying](Deploying.md).

## CI

| Workflow                     | On                                              | Does                                                                                                           |
| ---------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `deploy.yml`                 | push and PR to `main`                           | install, prettier, `astro check`, docs sync, build, audit, then publish `dist/` to `gh-pages` on a non-PR push |
| `docs.yml`                   | push to `main` touching `docs/**`, or manually  | copies `docs/` into this repository's wiki                                                                     |
| `update-github-metadata.yml` | manually, or a push touching `repositories.yml` | refreshes and commits `github-metadata.json`                                                                   |
| `update-citations.yml`       | manually                                        | refreshes and commits `citations.yml`                                                                          |

## `docs/` and the wiki

The pages you are reading are written **wiki-native**: flat, one file per page, and
the filename _is_ the page name and the title (`Removing-Features.md` →
"Removing Features"). No subdirectories, because a wiki has no directories.

Links between them are written the way the repository wants them —
`[Deploying](Deploying.md)` — because `docs/` on GitHub is where most people will
read them, and there a bare `](Deploying)` resolves to nothing. On the way into the
wiki, `.github/workflows/docs.yml` strips the `.md`, because _there_ a
`](Deploying.md)` resolves to a file view rather than a page. One `sed` reconciles
the two readers, and neither has to be broken for the other.

The workflow replaces the wiki wholesale on every push to `main` that touches
`docs/**`, which is why `_Footer.md` says so: an edit made in the wiki's web UI is
overwritten by the next push.

Two things about it that are easier to read here than to discover in CI:

- **The `.wiki` repository does not exist until someone creates the first page in
  the web UI.** Checking it out before that fails. The workflow probes for it first
  and fails with that sentence rather than a generic clone error.
- **The default `GITHUB_TOKEN` cannot push to a wiki**, and neither can a
  fine-grained personal access token — GitHub's fine-grained permission list has
  no wiki entry, so there is nothing to grant. It takes a **classic** token with
  the `repo` scope (`public_repo` for a public repository), stored as
  `PAT`. The workflow checks for it before `actions/checkout` runs, because
  a missing secret and an uninitialised wiki otherwise produce the same
  "repository not found" and want opposite fixes. Four steps, in
  [Deploying](Deploying.md).

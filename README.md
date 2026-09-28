<p align="center"><img src="public/favicon.svg" alt="" height="96"></p>

<h1 align="center">aca-theme</h1>

<p align="center">
An academic website template: publications from BibTeX, paper pages, projects,
a blog, a CV, people. Built with <a href="https://astro.build/">Astro</a>.
</p>

---

Eight content areas, one integration, **no UI framework, no CSS framework, no
theme layer**, dark only. Every line of it is source you can read and change —
there is no package boundary between you and the markup.

Extracted from two production sites, [fuchss.org](https://fuchss.org) and
[ardoco.de](https://ardoco.de), which are hand-written in the same style.

## Getting started in five minutes

```bash
npx degit dfuchss/aca-theme my-site   # or "Use this template" on GitHub
cd my-site && npm install && npm run dev
```

Then, in order:

| #   | Edit                    | For                                                                                      |
| --- | ----------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `src/consts.ts`         | Your name, URL and email. Delete the `NAV` rows you do not want. Set `demoNotice: null`. |
| 2   | `src/styles/tokens.css` | Five hex values. That is the whole palette — see [docs/theming.md](docs/theming.md).     |
| 3   | `src/data/`             | Your `papers.bib`, venues, CV and `contact.yml`. All of it is demo content.              |
| 4   | `src/content/`          | Your posts, projects and paper pages.                                                    |
| 5   | `src/assets/portrait.*` | Your photo. Any common extension; the filename is the whole setting.                     |
| 6   | `src/pages/index.astro` | Your home page copy, under the `DEMO COPY` banner.                                       |
| 7   | —                       | `npm run check && npm run build && npm run verify`                                       |

Removing an area you do not want is a short, uniform recipe — see
[docs/removing-features.md](docs/removing-features.md).

## Layout

```
src/
  consts.ts           the config file: SITE, SELF, Section, NAV, FOOTER_LINKS, FOOTER,
                      AUTHOR_LIMIT, STAT_LABELS, PEOPLE_CHIPS
  content.config.ts   the seven collections and their schemas
  loaders/bibtex.ts   papers.bib -> a typed `publications` collection
  lib/paths.ts        every URL shape, and URL_POLICY — see docs/deploying.md
  data/               papers.bib, venues, authors, people, cv, contact, socials, repositories
  content/            papers/, projects/, posts/
  components/ layouts/ lib/ pages/ styles/
  integrations/       base-paths: makes `base` work for hand-written links
                      sitemap-shape: makes every sitemap entry name the file emitted
public/               copied verbatim; everything here is a permanent URL
scripts/              the audit, the asset baseline, the data refreshers
verification/         committed SHA-256 baseline for the published assets
docs/                 theming, content, removing features, deploying
```

## Content model

Seven collections. Every cross-reference is an Astro `reference()`, so a bad
slug, an unknown venue, or a BibTeX key pointing at a page that does not exist
**stops the build** and names the offender. In a template language each of
those is a silent lookup that renders blank, and you find out when a reader
tells you.

| Collection     | Source                  | Notes                                       |
| -------------- | ----------------------- | ------------------------------------------- |
| `publications` | `src/data/papers.bib`   | parsed at build time                        |
| `venues`       | `src/data/venues.yml`   | badge colours, keyed by the BibTeX `abbr`   |
| `authors`      | `src/data/authors.yml`  | everyone who appears anywhere; name + ORCID |
| `people`       | `src/data/people.yml`   | the entry key **is** the `/people/#anchor`  |
| `papers`       | `src/content/papers/`   | one page per work; the filename is the URL  |
| `projects`     | `src/content/projects/` | `redirect` makes an entry a link-out        |
| `posts`        | `src/content/posts/`    | the filename sets the permalink             |

Three fields in `papers.bib` are this template's rather than BibTeX's, and all
three are checked at build time: `abbr` (the venue badge), `pdf` (a file you
host) and `page` (this work's own page). See [docs/content.md](docs/content.md).

## What `npm run verify` guards

Run by the deploy workflow **before** it publishes, so a regression fails the
build rather than reaching the site.

```
✓ css: 62 custom properties, all defined or defaulted
✓ css: dark-only, no theme toggle
✓ css: all 9 sections have an accent block
✓ a11y: 9 colour tokens all clear WCAG on --bg
✓ links: 549 internal links and 37 fragments resolve
✓ urls: 54 canonical, og:url, Scholar and JSON-LD URLs each name their own file
✓ html: 24 pages each have one h1, a title, a description and a canonical (or noindex)
✓ html: all 47 images have intrinsic dimensions
✓ html: no text runs into a link on 24 pages
✓ privacy: no third-party subresources
✓ privacy: no email address appears in the built output
✓ sitemap: robots.txt → sitemap-index.xml → 1 file(s), 24 URLs, every one names a file on disk
✓ feed.xml: 2 <item> entries, 3 links each name a file on disk
✓ assets: 14 published file(s) byte-identical to the baseline
```

Every link, canonical, sitemap entry and feed link is resolved to a file **by
its exact shape** — `/a/b/` must be `a/b/index.html`, `/a/b` must be
`a/b.html` — so a link whose shape does not match what the build emitted fails
here rather than 404ing on the host. See the URL policy in
[docs/deploying.md](docs/deploying.md).

The last one matters more than it looks. A PDF you have published is cited in
other people's papers and indexed by Scholar and DBLP; those URLs are permanent
whether you meant them to be or not, and they break through an image optimiser
or a tidy-up commit rather than a deliberate deletion. See
[docs/deploying.md](docs/deploying.md).

Each check is one independent block in `scripts/audit-site.mjs`. Delete the
ones you do not want; add your own.

## Scripts

| Command               | Does                                                       |
| --------------------- | ---------------------------------------------------------- |
| `npm run dev`         | dev server at http://localhost:4321                        |
| `npm run build`       | → `dist/`                                                  |
| `npm run check`       | `astro check` + `prettier --check`                         |
| `npm run format`      | `prettier --write`                                         |
| `npm run audit`       | the structural and accessibility audit of `dist/`          |
| `npm run verify`      | asset byte-identity, then the audit                        |
| `npm run baseline`    | rewrite the asset baseline after changing `public/assets/` |
| `npm run favicons`    | rasterize `public/favicon.svg` into PNGs                   |
| `npm run data:github` | refresh `src/data/github-metadata.json`                    |
| `npm run bib:check`   | check `papers.bib` against Crossref (stdlib Python only)   |

Node 22 or newer (`.nvmrc`). The build needs no network, no token and no
Python: `citations.yml` and `github-metadata.json` are committed, which is what
makes a fresh clone build offline.

## Deploying

`.github/workflows/deploy.yml` checks, builds and verifies on every push and
pull request to `main`, then publishes `dist/` to the `gh-pages` branch. Two
further workflows refresh the committed data files; both are opt-in, on-demand
only, and need a PAT. See [docs/deploying.md](docs/deploying.md).

## Licence

[MIT](LICENSE) — © 2026 Dominik Fuchß.

The demo content is MIT too, and is **meant to be deleted**. It is built around
the works of Marcus Tullius Cicero, cited as a classicist would: the entries
are modern editions, so `year` is the edition's. Its DOIs use the `10.5555`
prefix, which the DOI registry reserves for examples — they render, and
`npm run bib:check` correctly reports them as unregistered. One person in it,
the modern editor, is invented; her ORCID is ORCID's own fictional demo record
and the GitHub handle is `octocat`, so nothing here points at a real identity
or at a link that 404s. The PGP key under `public/assets/pgp-key/` is demo
content in the same sense: generated for the template and then thrown away, so
nobody holds the secret half and it can encrypt nothing. Its user id says so.

# Quickstart

Node 22 or newer (`.nvmrc` pins it). Nothing else: the build needs no network,
no token and no Python.

```bash
npx degit dfuchss/astro-studia my-site   # or "Use this template" on GitHub
cd my-site
npm install
npm run dev                              # http://localhost:4321
```

What you are looking at is demo content — the works of Cicero, cited as a
classicist would. It is **meant to be deleted**, and it ships turned on for a
reason: a feature that is commented out is not type-checked, not built and not
audited, so the demo is also the test suite.

Do the five steps below in order. Step 3 is much easier before you have edited
anything.

## 1. Look at both entry-page shapes

The template carries two front pages and shows you both:

- `/` is the **profile** shape — a portrait, a role line, counted stats,
  selected publications, recent posts.
- `/demo/project/` is the **project** shape — a centred logo, a pitch, sub-projects,
  a people roster.

They are the same file, `src/pages/index.astro`, with each shape's sections
inside `▼ PRESET:profile ▼` / `▼ PRESET:project ▼` fences. The switcher above
the hero links the two. Decide which one you want now, because step 3 keeps one
and deletes the other.

## 2. Set the eight things that are yours

Nothing here is a code change; all of it is one file each.

| #   | Edit                       | For                                                                 |
| --- | -------------------------- | ------------------------------------------------------------------- |
| 1   | `src/consts.ts`            | Name, URL, email, brand, tagline. Set `demoNotice: null` when done. |
| 2   | `src/styles/tokens.css`    | Five hex values — the whole palette. See [Theming](Theming.md).     |
| 3   | `src/data/`                | `papers.bib`, `venues.yml`, `cv.yml`, `contact.yml`, `socials.yml`. |
| 4   | `src/content/`             | Your paper pages, projects and posts.                               |
| 5   | `src/assets/portrait.*`    | Your photo. The filename is the whole setting.                      |
| 6   | `public/assets/img/og.png` | The link-preview card. The shipped one says "replace this".         |
| 7   | `public/favicon.svg`       | Then `npm run favicons` to rasterize the PNGs beside it.            |
| 8   | `src/pages/index.astro`    | Your front-page copy, under the `DEMO COPY` banners.                |

[Configuration](Configuration.md) walks the whole of `src/consts.ts` and every
file in `src/data/`. [Content](Content.md) is the collections and their front
matter.

## 3. Prune it down

```bash
npm run init
```

It reads the manifest in `scripts/features.mjs` — which knows each feature's
routes, collection blocks, `Section` member, accent block, nav and footer rows
and fenced code regions — and deletes what you did not keep. It offers two
starting selections and then lets you tick and untick freely:

```
Presets
  1) profile  12 features: publications, papers, projects, blog, feed, cv, repositories, …
  2) project  8 features: publications, papers, projects, feed, people, authors, …
  3) custom   start from everything and untick
```

A preset is a _starting selection, not a mode_. Nothing in the built site
branches on which one you chose, and afterwards there is no preset any longer —
only source files.

Non-interactively — note the `--`, which is how `npm run` passes arguments
through to the script rather than eating them itself:

```bash
npm run init -- --preset profile
npm run init -- --preset project --dry-run    # print the plan, write nothing
npm run init -- --features cv,imprint         # keep exactly these
npm run init -- --preset profile --yes        # skip the confirmation
```

Two things it does that are worth expecting:

- **It runs `check`, `build` and `audit` afterwards and stops if one fails.** A
  prune that left something dangling is a thing to read, not to paper over;
  `git diff` still has the whole story. Nothing needs re-pinning or regenerating
  after a prune — a pruned tree is just a smaller tree.
- **It offers to delete its own scaffolding** — `scripts/init.mjs`,
  `scripts/features.mjs`, `scripts/gen-docs.mjs` and their npm scripts. Say no if
  you want to prune again later.

What it will not do is guess at prose. Edits that are genuinely judgement — "a
group site usually calls these approaches", "repoint the feed at another source"
— are printed as a TODO list with the feature that owns each one.
[Removing features](Removing-Features.md) is the same recipe by hand, plus the
full table of what belongs to what.

## 4. Build it, then check it

```bash
npm run check      # astro check + prettier --check
npm run build      # → dist/
npm run audit      # every check over dist/
```

`audit` is the one to read. It resolves every internal link, canonical, sitemap
entry and feed link to a file on disk by its exact shape, and prints a line per
check:

```
✓ links: 549 internal links and 37 fragments resolve
✓ urls: 54 canonical, og:url, Scholar and JSON-LD URLs each name their own file
✓ sitemap: robots.txt → sitemap-index.xml → 1 file(s), 24 URLs, every one names a file on disk
```

[Verification](Verification.md) says what each of the fourteen lines asserts.

## 5. Deploy

`.github/workflows/deploy.yml` is already there. It installs, checks, builds and
**audits before it publishes**, then pushes `dist/` to the `gh-pages` branch on
a non-PR push to `main`.

1. Settings → Pages → deploy from the `gh-pages` branch.
2. Set `SITE.url` in `src/consts.ts`. `astro.config.ts` and
   `src/pages/robots.txt.ts` both read it, so that is the only place the address
   is written down.
3. For a custom domain, add `public/CNAME` containing the bare hostname.
4. Deploying to `https://<user>.github.io/<repo>/` instead? Set `base` in
   `astro.config.ts` and put the full address including that path in `SITE.url`.

[Deploying](Deploying.md) covers all of it, plus the URL policy, another host,
your own 404 page and the two opt-in data-refresh workflows.

One more workflow, `docs.yml`, publishes `docs/` to the repository's wiki. It is
**pinned to the upstream repository and does nothing in yours** until you change
one line — see
[Publishing the docs to the wiki](Deploying.md#publishing-the-docs-to-the-wiki).

## When something fails

Almost every failure in this template names the file that caused it. In rough
order of how often you will see them:

| It said                                             | It means                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `Invalid content reference: … references "X"`       | a slug, venue `abbr` or BibTeX key with no entry behind it                  |
| `page = {…} is not a /papers/<slug>/ path`          | a `page` field in `papers.bib` that does not match the route                |
| `pdf`/`page` points at a file that is not there     | the .bib entry outlived a rename                                            |
| `contact.yml row N (label): …`                      | a row with neither or both of `value` and `email`, or an address in `value` |
| `portrait: no src/assets/portrait.<ext> found`      | or two of them, which is equally an error                                   |
| `link /x/ does not resolve — expected x/index.html` | a link whose shape disagrees with the file the URL policy emitted           |
| `dist/.nojekyll is missing`                         | `public/.nojekyll` was deleted; without it Pages serves no CSS              |
| `section 'x' … has no [data-section='x'] block`     | a new `Section` member without its accent block in `tokens.css`             |

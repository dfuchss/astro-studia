# Removing a feature

Everything ships **on**. A commented-out feature is not type-checked, not
built, not audited, and rots within two Astro releases — so the demo doubles as
the test suite, and every code path this template contains is exercised by
`npm run build && npm run verify`.

The price is that your first half hour is deletion. So deletion is uniform, and
the build catches anything you miss.

## The recipe

1. Delete the route(s) under `src/pages/`.
2. Delete the collection block in `src/content.config.ts` **and** its name from
   the `collections` export at the bottom.
3. Delete its source: `src/content/<area>/` or `src/data/<file>.yml`.
4. In `src/consts.ts`: delete the `NAV` row and the `Section` union member.
5. In `src/styles/tokens.css`: delete the `[data-section='…']` block. On the
   home page, delete the fenced section and the consts in its frontmatter.

Then `npm run check && npm run build && npm run verify`.

Anything you missed fails loudly. `astro check` rejects the now-invalid
`Section` literal and the dangling `getCollection` import; `audit-site.mjs`
rejects any surviving link to the deleted route, and any `data-section` left in
the HTML with no block in the CSS.

## Two kinds of fence

`npm run init` deletes code by reading markers in the source, and there are two
families of them. Both use the same syntax and the same scanner.

```
▼ FEATURE:<id> ▼ … ▲ FEATURE:<id> ▲     code an optional AREA owns
▼ PRESET:<name> ▼ … ▲ PRESET:<name> ▲   sections one AUDIENCE wants
```

A **feature** fence is named after a row in the table below. Everything a
matching pair encloses goes when you drop that feature — an import, a const, a
markup block, anywhere under `src/`. A feature you keep keeps its markers,
because you can still drop it later.

A **preset** fence is named after a preset (`profile`, `project`). Only
`src/pages/index.astro` uses them today: it carries both entry-page shapes, and
init keeps the one you chose, deletes the other, and then removes the surviving
markers as well — unlike a feature, the shape of the entry page is decided once
and there is no later choice to leave a label for. Before init runs, the demo
switcher renders each shape at its own URL so you can compare them.

There is no `PRESET:both`. A region with no marker is already unconditional;
only the audience-specific parts carry one.

Fences nest, in either order, but must never straddle each other — each pair is
removed as a unit.

## What goes with what

<!-- BEGIN GENERATED: features -->
<!-- Generated from scripts/features.mjs by `npm run docs`. Do not edit by hand. -->

| Feature         | What you lose                                                                            | Presets              | Routes & files                                                                                                                                                                                                    | Collections              | Also by hand                                                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Publications    | A bibliography parsed from BibTeX, with venue badges and copyable citations.             | `profile`, `project` | `src/pages/publications`, `src/components/pub`, `src/lib/publications.ts`, `src/loaders/bibtex.ts`, `src/data/papers.bib`, `src/data/venues.yml`, `scripts/update_bib.py`                                         | `publications`, `venues` | —                                                                                                                                                                                                                                                      |
| Paper pages     | A page per work: the abstract, a figure, the links, the citation.                        | `profile`, `project` | `src/pages/papers`, `src/content/papers`, `src/components/paper`, `src/lib/papers.ts`, `public/assets/img/papers`                                                                                                 | `papers`                 | drop the `page = {…}` fields from src/data/papers.bib; drop the second links[] entry from the bibtexLoader options in src/content.config.ts; if the RSS feed is on src/lib/feed/fromPapers.ts, repoint it at another source — it lists the paper pages |
| Projects        | A grid of things you have made, grouped, each with a page of its own.                    | `profile`, `project` | `src/pages/projects`, `src/components/project`, `src/content/projects`, `src/assets/projects`, `public/assets/img/projects`                                                                                       | `projects`               | a group site usually calls these `approaches` — rename the collection in src/content.config.ts, the directory under src/pages/, and the NAV label                                                                                                      |
| Blog            | Dated posts with tags, per-tag pages, drafts, and an RSS feed.                           | `profile`            | `src/pages/blog`, `src/lib/blog.ts`, `src/lib/feed/fromPosts.ts`, `src/content/posts`, `public/assets/img/posts`                                                                                                  | `posts`                  | —                                                                                                                                                                                                                                                      |
| RSS feed        | An Atom/RSS feed at /feed.xml, so people can follow the site.                            | `profile`, `project` | `src/pages/feed.xml.ts`, `src/lib/feed`                                                                                                                                                                           | —                        | drop the feed &lt;link rel="alternate"&gt; from src/components/BaseHead.astro — without it you advertise a 404                                                                                                                                         |
| CV              | A curriculum vitae rendered from YAML, with a dated timeline rail.                       | `profile`            | `src/pages/cv.astro`, `src/lib/cv.ts`, `src/data/cv.yml`                                                                                                                                                          | —                        | —                                                                                                                                                                                                                                                      |
| Repositories    | Your code and archived datasets, from a committed metadata file.                         | `profile`            | `src/pages/repositories.astro`, `src/data/repositories.yml`, `src/data/github-metadata.json`, `src/data/language_colors.yml`, `scripts/fetch-github-metadata.mjs`, `.github/workflows/update-github-metadata.yml` | —                        | drop the `data:github` script from package.json                                                                                                                                                                                                        |
| People          | A team roster whose entry keys are the anchors author names link to.                     | `project`            | `src/pages/people`, `src/components/people`, `src/lib/people.ts`, `src/data/people.yml`, `public/assets/img/people`                                                                                               | `people`                 | —                                                                                                                                                                                                                                                      |
| Authors         | Named co-authors with ORCIDs, referenced by paper pages and the roster.                  | `profile`, `project` | `src/data/authors.yml`                                                                                                                                                                                            | `authors`                | drop the `authors` field from the papers schema in src/content.config.ts                                                                                                                                                                               |
| Citation counts | Google Scholar counts on each entry, plus h-index and i10 on the list.                   | `profile`, `project` | `src/lib/citations.ts`, `src/data/citations.yml`, `scripts/update_scholar_citations.py`, `requirements.txt`, `.github/workflows/update-citations.yml`                                                             | —                        | drop the citation chip from src/components/pub/PubEntry.astro and src/components/paper/PaperEntry.astro, and the metrics block from src/pages/publications/index.astro; replace formatCount() usages — it lives in lib/citations.ts                    |
| Profile links   | ORCID, Scholar, DBLP, GitHub and LinkedIn chips, driven by one YAML file.                | `profile`            | `src/components/SocialRow.astro`, `src/data/socials.yml`                                                                                                                                                          | —                        | —                                                                                                                                                                                                                                                      |
| PGP key         | A page for your public key: fingerprint, key id, download, and the armored block inline. | `profile`            | `src/pages/pgp-key.astro`, `src/lib/pgp.ts`, `public/assets/pgp-key`                                                                                                                                              | —                        | —                                                                                                                                                                                                                                                      |
| Demo switcher   | The two-button switcher and the second entry page that show both styles.                 | —                    | `src/pages/demo`, `src/components/DemoSwitch.astro`                                                                                                                                                               | —                        | —                                                                                                                                                                                                                                                      |
| Imprint         | A site notice. Several jurisdictions require one; Germany certainly does.                | `profile`, `project` | `src/pages/imprint.astro`                                                                                                                                                                                         | —                        | —                                                                                                                                                                                                                                                      |

<!-- END GENERATED: features -->

**Two orderings matter**, because `reference()` makes them real dependencies:

- `authors` is required by `people` and by `papers`
- `venues` is required by `publications`

Remove the thing that points before the thing pointed at, or the build tells
you — which is the system working, but it is quicker to know first.

## Worked example: removing the blog

**1. Routes.**

```bash
rm -r src/pages/blog src/pages/feed.xml.ts
```

**2. The collection.** In `src/content.config.ts`, delete the `toArray` helper
and the `posts` block, then remove `posts` from the export:

```diff
-export const collections = {
-  venues, authors, people, publications, papers, projects, posts,
-};
+export const collections = { venues, authors, people, publications, papers, projects };
```

**3. Its source.**

```bash
rm -r src/content/posts src/lib/blog.ts public/assets/img/posts
```

Images under `public/` are not referenced by anything the build understands, so
an orphaned one is invisible: it is simply published and never linked. That is
also why they are the one thing the removal recipe cannot catch for you.

**4. `src/consts.ts`.**

```diff
 export type Section =
   | 'home'
   | 'publications'
   | 'papers'
   | 'projects'
   | 'repositories'
-  | 'blog'
   | 'people'
   | 'cv';

 export const NAV: { label: string; href: string; section: Section }[] = [
   …
-  { label: 'blog', href: '/blog/', section: 'blog' },
   …
 ];

 export const FOOTER_LINKS: { label: string; href: string }[] = [
-  { label: 'Feed', href: '/feed.xml' },
   { label: 'PGP', href: '/pgp-key/' },
   { label: 'Imprint', href: '/imprint/' },
 ];
```

**5. `src/styles/tokens.css`.**

```diff
-[data-section='blog'] {
-  --sec: var(--rose);
-  --sec-strong: var(--rose-strong);
-  --sec-line: var(--rose-line);
-  --sec-dim: var(--rose-dim);
-  --sec-glow: var(--rose-glow);
-}
```

The `--rose` family is now unused. Leave it if you want it for a future
section; delete it if you do not — the contrast check simply has one fewer
token to check.

**6. The stragglers** the table names: the feed `<link rel="alternate">` in
`BaseHead.astro`, and the whole `writing` section plus its `posts` const in
`src/pages/index.astro` — both inside `▼ FEATURE:blog ▼` fences there.

**7. Check.**

```bash
npm run check && npm run build && npm run verify
```

If anything still refers to the blog, one of those three tells you where.

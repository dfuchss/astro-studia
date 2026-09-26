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

## What goes with what

<!-- BEGIN GENERATED: features -->
<!-- Generated from scripts/features.mjs by `npm run docs`. Do not edit by hand. -->

| Feature         | What you lose                                                                | Presets              | Routes & files                                                                                                                                                                                                    | Collections              | Also by hand                                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publications    | A bibliography parsed from BibTeX, with venue badges and copyable citations. | `profile`, `project` | `src/pages/publications`, `src/components/pub`, `src/lib/publications.ts`, `src/loaders/bibtex.ts`, `src/data/papers.bib`, `src/data/venues.yml`, `scripts/update_bib.py`                                         | `publications`, `venues` | —                                                                                                                                                                                        |
| Paper pages     | A page per work: the abstract, a figure, the links, the citation.            | `profile`, `project` | `src/pages/papers`, `src/content/papers`, `public/assets/img/papers`                                                                                                                                              | `papers`                 | drop the `page = {…}` fields from src/data/papers.bib; drop the second links[] entry from the bibtexLoader options in src/content.config.ts                                              |
| Projects        | A grid of things you have made, grouped, each with a page of its own.        | `profile`, `project` | `src/pages/projects`, `src/components/project`, `src/content/projects`, `src/assets/projects`                                                                                                                     | `projects`               | a group site usually calls these `approaches` — rename the collection in src/content.config.ts, the directory under src/pages/, and the NAV label                                        |
| Blog            | Dated posts with tags, per-tag pages, drafts, and an RSS feed.               | `profile`            | `src/pages/blog`, `src/lib/blog.ts`, `src/content/posts`, `public/assets/img/posts`                                                                                                                               | `posts`                  | if you keep the feed, point src/pages/feed.xml.ts at another collection — it defaults to posts                                                                                           |
| RSS feed        | An Atom/RSS feed at /feed.xml, so people can follow the site.                | `profile`, `project` | `src/pages/feed.xml.ts`                                                                                                                                                                                           | —                        | the feed reads `posts` by default; without a blog, point it at `papers` instead                                                                                                          |
| CV              | A curriculum vitae rendered from YAML, with a dated timeline rail.           | `profile`            | `src/pages/cv.astro`, `src/lib/cv.ts`, `src/data/cv.yml`                                                                                                                                                          | —                        | drop the `where` row from the contact list in src/pages/index.astro                                                                                                                      |
| Repositories    | Your code and archived datasets, from a committed metadata file.             | `profile`            | `src/pages/repositories.astro`, `src/data/repositories.yml`, `src/data/github-metadata.json`, `src/data/language_colors.yml`, `scripts/fetch-github-metadata.mjs`, `.github/workflows/update-github-metadata.yml` | —                        | drop the `data:github` script from package.json                                                                                                                                          |
| People          | A team roster whose entry keys are the anchors author names link to.         | `project`            | `src/pages/people`, `src/components/people`, `src/lib/people.ts`, `src/data/people.yml`, `public/assets/img/people`                                                                                               | `people`                 | drop the `links` prop passed to &lt;PubEntry&gt; in src/pages/publications/index.astro                                                                                                   |
| Authors         | Named co-authors with ORCIDs, referenced by paper pages and the roster.      | `profile`, `project` | `src/data/authors.yml`                                                                                                                                                                                            | `authors`                | drop the `authors` field from the papers schema in src/content.config.ts                                                                                                                 |
| Citation counts | Google Scholar counts on each entry, plus h-index and i10 on the list.       | `profile`, `project` | `src/lib/citations.ts`, `src/data/citations.yml`, `scripts/update_scholar_citations.py`, `requirements.txt`, `.github/workflows/update-citations.yml`                                                             | —                        | drop the citation chip from src/components/pub/PubEntry.astro and the metrics block from src/pages/publications/index.astro; replace formatCount() usages — it lives in lib/citations.ts |
| Profile links   | ORCID, Scholar, DBLP, GitHub and LinkedIn chips, driven by one YAML file.    | `profile`            | `src/components/SocialRow.astro`, `src/data/socials.yml`                                                                                                                                                          | —                        | remove &lt;SocialRow /&gt; from src/pages/index.astro and src/pages/cv.astro                                                                                                             |
| PGP key         | A page for your public key, derived from one fingerprint in socials.yml.     | `profile`            | `src/pages/pgp-key.astro`, `src/lib/pgp.ts`                                                                                                                                                                       | —                        | drop the `pgp` row from the contact list in src/pages/index.astro                                                                                                                        |
| Imprint         | A site notice. Several jurisdictions require one; Germany certainly does.    | `profile`, `project` | `src/pages/imprint.astro`                                                                                                                                                                                         | —                        | —                                                                                                                                                                                        |

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
`src/pages/index.astro`.

**7. Check.**

```bash
npm run check && npm run build && npm run verify
```

If anything still refers to the blog, one of those three tells you where.

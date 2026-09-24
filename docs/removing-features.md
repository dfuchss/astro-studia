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

| Feature      | Routes                     | `content.config.ts`      | Source                                                            | Also                                                                                                                                                                |
| ------------ | -------------------------- | ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publications | `pages/publications/`      | `publications`, `venues` | `papers.bib`, `venues.yml`                                        | `components/pub/`, `lib/publications.ts`, `loaders/bibtex.ts`                                                                                                       |
| Paper pages  | `pages/papers/`            | `papers`                 | `content/papers/`                                                 | drop `page = {…}` from the bib and the second `links[]` entry from the loader options                                                                               |
| Projects     | `pages/projects/`          | `projects`               | `content/projects/`                                               | `components/project/`, `src/assets/projects/`                                                                                                                       |
| Blog         | `pages/blog/`              | `posts`                  | `content/posts/`                                                  | `pages/feed.xml.ts`, `lib/blog.ts`, the Feed row in `FOOTER_LINKS`, the feed `<link>` in `BaseHead.astro`                                                           |
| CV           | `pages/cv.astro`           | —                        | `cv.yml`                                                          | `lib/cv.ts`, and the `where` row on the home page                                                                                                                   |
| Repositories | `pages/repositories.astro` | —                        | `repositories.yml`, `github-metadata.json`, `language_colors.yml` | `scripts/fetch-github-metadata.mjs`, its workflow, the `data:github` script                                                                                         |
| People       | `pages/people/`            | `people`                 | `people.yml`                                                      | `components/people/`, `lib/people.ts`, the `links` prop passed to `PubEntry`                                                                                        |
| Citations    | —                          | —                        | `citations.yml`                                                   | `lib/citations.ts`, `scripts/update_scholar_citations.py`, `requirements.txt`, its workflow, the citation chip in `PubEntry.astro`, the metrics on `/publications/` |
| Socials      | —                          | —                        | `socials.yml`                                                     | `components/SocialRow.astro`                                                                                                                                        |
| PGP          | `pages/pgp-key.astro`      | —                        | —                                                                 | `lib/pgp.ts`, the PGP row in `FOOTER_LINKS`                                                                                                                         |
| Imprint      | `pages/imprint.astro`      | —                        | —                                                                 | its row in `FOOTER_LINKS`                                                                                                                                           |

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

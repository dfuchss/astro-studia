# Deploying

`.github/workflows/deploy.yml` runs on every push and pull request to `main`:
install, `prettier --check`, `astro check`, `build`, `verify`, then publish
`dist/` to the `gh-pages` branch — the last step only on a non-PR push to
`main`.

Verify runs **before** the publish. That ordering is the entire point: a
broken link or a changed PDF fails the workflow instead of reaching the site.

## GitHub Pages

1. Settings → Pages → deploy from the `gh-pages` branch.
2. Set `SITE.url` in `src/consts.ts`. `astro.config.ts` and `robots.txt.ts`
   both read it, so that is the only place it is written down.
3. For a custom domain, add `public/CNAME` containing the bare hostname.

`public/.nojekyll` is already there and must stay. Without it Pages runs Jekyll
over the output, and Jekyll ignores directories beginning with an underscore —
which is where Astro puts every hashed asset. The failure mode is a live site
with no CSS, so `verify` checks for it.

`verify` also checks that `dist/CNAME` exists whenever `public/CNAME` does. The
deploy replaces the branch wholesale, so a CNAME that stops being emitted is a
domain that stops resolving, and nothing else would notice.

### A project page rather than a domain

Deploying to `https://<user>.github.io/<repo>/` needs a base path. In
`astro.config.ts`:

```js
base: '/my-repo',
```

and set `SITE.url` to the full origin including the path. Every internal href
in `src/` is root-relative, so that is the only change.

## Another host

Nothing here needs GitHub. The build is a directory of static files with no
server-side anything.

`trailingSlash: 'always'` with `build.format: 'directory'` means every route is
`<route>/index.html`, which every static host serves correctly without
configuration. Point the host at `dist/` — or, as fuchss.org does, have a web
server pull the `gh-pages` branch.

## The asset baseline

`verification/asset-sha256.txt` pins the SHA-256 of everything under
`public/assets/`, and `verify` checks the built copies against it.

This is worth more than it looks on an academic site. A PDF you have published
is cited in other people's papers and indexed by Google Scholar, DBLP and your
institutional repository. Those URLs are permanent whether or not you meant
them to be — and they do not break through deliberate deletion. They break
through an image optimiser, a "clean up assets" commit, or a tool that rewrites
a file in place. None of those announce themselves.

When you genuinely add or replace an asset:

```bash
npm run baseline     # rewrites the file
git add public/assets verification/asset-sha256.txt
```

Commit both together, so the change and its authorisation are one commit.

## Sitemap and robots

`@astrojs/sitemap` emits `/sitemap-index.xml`, which points at `/sitemap-0.xml`
and any further pages. `src/pages/robots.txt.ts` is generated from `SITE.url`
and points at the index, so the two cannot drift apart.

The integration lists pages Astro builds and nothing else. If you serve PDFs
out of `public/` and want them indexed, add them explicitly:

```js
import { readdirSync } from 'node:fs';

sitemap({
  customPages: readdirSync('public/assets/pdf').map((f) => `${SITE.url}/assets/pdf/${f}`),
});
```

## Adding an og:image

Nothing here ships one, which is why `BaseHead.astro` emits
`twitter:card: summary` rather than `summary_large_image` — the large card
renders as a blank rectangle without an image.

Put a 1200×630 PNG at `public/assets/img/og.png` and add:

```astro
<meta property="og:image" content={new URL('/assets/img/og.png', SITE.url)} />
```

switching the card type at the same time. For a per-page image, take an
optional `image` prop through `BaseHead` the way `title` and `description`
already work.

## The two opt-in workflows

`update-github-metadata.yml` and `update-citations.yml` refresh
`src/data/github-metadata.json` and `src/data/citations.yml` and commit the
result. Both ship **on demand only**; uncomment the `schedule:` block to
enable.

Both need `secrets.PAT`, a fine-grained token with `contents: write` on the
repository. The built-in `GITHUB_TOKEN` will not do: a push made with it
triggers no other workflow, so the data would land and the site would never
rebuild. Both workflows fail loudly rather than falling back, because the
failure that matters here is a green job whose result silently never ships.

The Scholar one additionally tolerates its own timeout. Scholar rate-limits
hard and has no API, so a run that cannot finish is routine — the counts stay
as they are until next time.

Neither is needed to build. Both output files are committed, which is what lets
a fresh clone build with no network, no token and nothing to rate-limit.

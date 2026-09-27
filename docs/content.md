# Content

Seven collections, defined in `src/content.config.ts`. Every cross-reference
goes through Astro's `reference()`, which is the point of the whole file: a bad
slug, an unknown venue or a BibTeX key pointing at a page that does not exist
**stops the build and names the offender**.

What a failure looks like:

```
[ERROR] [content] Invalid content reference: entry "cicero_de_officiis_1913"
in collection "publications" (field: abbr) references "NOPE" in collection
"venues", but that entry does not exist.
```

## Publications — `src/data/papers.bib`

Standard BibTeX, plus three fields that are this template's. All three are
stripped from the citation a reader copies, and all three are checked while the
site builds.

| Field  | Means                                                 | If it is wrong                           |
| ------ | ----------------------------------------------------- | ---------------------------------------- |
| `abbr` | the venue badge; a key in `venues.yml`                | build fails                              |
| `pdf`  | a file under `public/assets/pdf/`, or an absolute URL | build fails if the file is not there     |
| `page` | this work's own page, `/papers/<slug>/`               | build fails if the markdown is not there |

`abbr` is optional. An entry without one renders with no badge, which is what
you want for a preprint or a report — the alternative is inventing a "misc" row
in `venues.yml` for a required reference to point at.

```bibtex
@inproceedings{surname_keyword_2026,
  abbr         = {ICSE},
  title        = {A Title With a Brace-Protected {Acronym}},
  author       = {Surname, Given and Other, Someone},
  booktitle    = {Proceedings of Something},
  year         = {2026},
  month        = {5},
  location     = {Somewhere},
  doi          = {10.1145/1234567.1234568},
  pdf          = {2026/my-paper.pdf},
  page         = {/papers/my-paper/},
  keywords     = {one, two},
  google_scholar_id = {qXqzPbLUKZkC},
}
```

Braces protect casing: `{Acronym}` stays `Acronym` rather than being
sentence-cased. The loader parses the file twice — once decoded to Unicode for
display, once raw — so the block a reader copies keeps its LaTeX escapes
verbatim rather than a normalised approximation.

**Adding a link field of your own** is a `links[]` entry in
`src/content.config.ts`: the field to read, the key it lands under, and where
its value has to exist on disk. Declare the key in the schema too, or Zod drops
it.

## Venues — `src/data/venues.yml`

```yaml
ICSE:
  name: International Conference on Software Engineering
  url: https://conf.researchr.org/home/icse-2026
  color: '#a3107c'
```

Paste the venue's real brand colour. `VenueBadge.astro` mixes it toward white
for the label and toward the page for the fill, so a colour chosen for a white
conference site still reads here — you do not need to pre-lighten it.

## Authors and people

`authors.yml` is everyone who appears anywhere: in an author list, on a paper
page, or as a member of your group. Name and ORCID, nothing else.

`people.yml` is who appears on `/people/`, and it points at `authors.yml` for
the name rather than repeating it. **The key is the anchor** — `atticus` is
`/people/#atticus` — so renaming a key changes a published URL.

`surnames` is how a name parsed out of `papers.bib` is matched back to a
person, which is what turns an author name in the publication list into a link.
List every form someone publishes under, including a previous name. Matching
folds accents and `ß`, so `Fuchß`/`Fuchss` and `Muñoz`/`Munoz` both land.

## Paper pages — `src/content/papers/`

The filename is the URL. `de-officiis.md` is `/papers/de-officiis/`, and that
is what a `page = {/papers/de-officiis/}` field has to match.

```yaml
---
title: The title as it should appear on the page
description: One or two sentences. Used for the meta description too.
publication: surname_keyword_2026 # the BibTeX key
authors: [surname, other] # keys from authors.yml
order: 1
figure:
  src: /assets/img/papers/overview.svg
  alt: A description someone who cannot see it would want.
  plate: true # white plate behind dark-on-transparent line art
  frame: approach overview # window frame, with this as its titlebar label
links:
  paper: { acm: https://…, arxiv: https://… }
  replication: { zenodo: https://… }
  slides: { pdf: /assets/pdf/2026/talk.pdf }
---
```

Nothing bibliographic goes in the front matter. Venue, year, DOI and the
citation all come from the BibTeX entry, so they have one source of truth.

`links` has exactly three groups; any other key is silently dropped by the
schema. Add one in `content.config.ts` if you need it, and a label for it in
`LINK_LABELS` on the paper page.

## Projects — `src/content/projects/`

`category` is an enum, so a typo fails the build. An entry with `redirect` gets
no page of its own and links straight out — useful for work that lives on
someone else's site.

Logos go in `src/assets/projects/` and run through Astro's image pipeline
(hashed filename, dimensions known at build time). That is the difference
between `src/assets/` and `public/`: only `public/` has stable URLs.

## Posts — `src/content/posts/`

**The filename sets the permalink** and must be `YYYY-MM-DD-slug.md`. The date
in the front matter has to agree with it, and the build fails if it does not.

The date is taken from the filename rather than from the parsed date on
purpose: reading a `Date` with local getters shifts the day backwards anywhere
west of UTC, so the same post would publish at two different URLs depending on
where it was built.

`draft: true` keeps a post out of the list, the tag pages, the feed and the
sitemap — it is not built at all.

`tags` accepts both `tags: one` and `tags: [one, two]`.

### What else markdown can express

Because remark passes HTML through untouched, prose can reach for a handful of
affordances `.prose` styles. All of them are plain markup in the `.md` — there is
no component to import and no plugin involved.

**A before/after pair.** Two images side by side, each linking to its full-size
file, stacking on a narrow screen:

```html
<figure class="compare">
  <div class="compare-pair">
    <a href="/assets/img/papers/before.svg"><img src="…" width="640" height="400" alt="…" /></a>
    <a href="/assets/img/papers/after.svg"><img src="…" width="640" height="400" alt="…" /></a>
  </div>
  <figcaption>What changed.</figcaption>
</figure>
```

**An icon-led list**, for a set of tools or components — each row an inline icon,
a name, a description, and a row of links:

```html
<ul class="tool-landscape">
  <li>
    <svg
      class="ti"
      style="--ti: #5cc8e8"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="…" />
    </svg>
    <strong>Some tool</strong> — what it does.<br />
    <span class="tool-links">
      <svg class="ti" …><path d="…" /></svg> <a href="…">Service</a>
      &nbsp;&middot;&nbsp;
      <svg class="ti" …><path d="…" /></svg> <a href="…">GitHub</a>
    </span>
  </li>
</ul>
```

`.ti` is a 24×24 inline SVG at `1.05em`, drawn in `currentColor` unless you set
`--ti` to a colour. Inline the path yourself — there is no icon dependency here,
deliberately, and a colour you pick has to clear the contrast check like any
other.

**An embedded video**, 16:9 and framed:

```html
<div class="video"><iframe src="…" title="…" loading="lazy" allowfullscreen></iframe></div>
```

That one needs its host added to `ALLOWED_THIRD_PARTY` in `src/consts.ts`, or
`npm run verify` fails — on purpose. An iframe is the one thing in prose that
sees your readers' IP addresses, so it should take a deliberate edit.

### Images in a post

Markdown's `![](…)` cannot carry `width` and `height`, which the audit
requires, and cannot opt out of the white plate `.prose` puts behind an SVG.
Write the tag directly — remark passes HTML through untouched:

```html
<figure>
  <img
    class="no-plate"
    src="/assets/img/posts/thing.svg"
    alt="…"
    width="760"
    height="300"
    loading="lazy"
  />
  <figcaption>A caption.</figcaption>
</figure>
```

Drop `class="no-plate"` when the image _is_ dark-on-transparent line art.

## A group site rather than a personal one

Nothing here assumes one author. List every member's surname in `SELF.surnames`
so all of their names are emphasised in author lists, fill in `people.yml`, and
rename `projects` to `approaches` (or whatever your group calls them) if that
fits better — it is a collection name in one file and a route directory.

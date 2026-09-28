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
featured: true # also list it in the entry page's paper block
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

That includes the short venue label — the breadcrumb leaf on the page, the
tag on a `/papers/` row, the line under a title in a project's related-papers
list. It is the entry's `abbr`, the badge's own text. An entry **without** an
`abbr` shows what it says it appeared in instead — the proceedings, journal or
series title — which is long, but is the entry's own record and so cannot be
wrong; an entry that names no container shows nothing. The template never
invents a word here: an earlier version fell back to "preprint" for any entry
without a badge, and called two published workshop papers preprints. The way
to a short label is the way to a badge — an `abbr` on the entry and a row in
`venues.yml`. `src/content/papers/de-fato.md` is the no-`abbr` case.

The page's meta description — what a link preview and a feed reader show —
is `description`, or failing that the venue: the stated `venue.label`, the
`conferenceName`, or the entry's container. Never the site's own blurb.

`order` is the sequence on `/papers/`; `featured` is what the entry page's
"Paper pages" block selects on, newest first, so that block is a handful of
pages you curate here rather than everything in the directory. Both are read
from this file and not from the BibTeX entry: they are decisions about the site,
and `papers.bib` is a bibliography.

### A page for a talk that was never published

`publication` is optional, because not every page with something to say is a
publication: a working-group meeting, an invited lecture, a national workshop
prints no proceedings, so there is no BibTeX entry to point at and nothing to
cite. Such a page states the two things the entry would have told it — the year
and the venue — and is the one case where the front matter carries something
bibliographic, because there is nowhere else for it to be:

```yaml
---
title: 'De legibus naturae: praelectio Latine habita'
authors: [cicero, quintus, atticus]
# The only date the page has: /papers/, the feed and the project lists sort on it.
year: 2026
venue:
  mark: 🏛 # a flag or other mark before the label (ardoco.de uses 🇩🇪)
  label: Praelectio in Conventiculo Latino Arpinati habita
  short: Conventiculum Arpinas # for the breadcrumb and the list rows
  url: https://www.tulliana.eu/
  bylineConnector: oratores # the byline's "by", in the page's language
---
```

One object rather than four loose fields, because the four only mean anything
together: they are the parts of one sentence the page says for itself, in its
own language. That is also why `label` is the whole sentence and gets no
"Published at" in front of it, and why the byline drops the English `, and `
between the last two names in this case — a comma needs no translation.

The schema enforces the rest: `venue` and `publication` are mutually exclusive
(as are `venue` and `conferenceName`), and `year` is required with the former
and rejected with the latter. A page in this state keeps its **Cite** section,
with a sentence in place of the BibTeX saying that the venue publishes nothing —
the absence is a fact about the venue, not a hole in the site.

`src/content/papers/de-legibus-praelectio.md` is this case, with every field
annotated.

`links` has exactly three groups; any other key is silently dropped by the
schema. Add one in `content.config.ts` if you need it, and a label for it in
`LINK_LABELS` on the paper page. A key of the form `<venue>_<kind>`, where
`<kind>` is itself a labelled key, needs no row: `colloquium_pdf` renders as
"PDF (COLLOQUIUM)", so the decks from a work's several outings can sit side by
side under `slides` — see `linkLabel()` in `src/lib/papers.ts`.

## Projects — `src/content/projects/`

`category` is an enum, so a typo fails the build — and it is optional. Leave
it off every entry and `/projects/` is one flat list with no group headings,
which is what a site that does not sort its projects wants; set it on some
entries and not others and the rest gather under a final "Other" group rather
than dropping off the page. An entry with `redirect` gets no page of its own
and links straight out — useful for work that lives on someone else's site.

Logos go in `src/assets/projects/` and run through Astro's image pipeline
(hashed filename, dimensions known at build time). That is the difference
between `src/assets/` and `public/`: only `public/` has stable URLs.

An optional `figure` puts an overview diagram above the prose — the same field,
with the same four keys, that a paper page takes:

```yaml
figure:
  src: /assets/img/projects/translation-strategies.svg
  alt: Three strategies for moving a term between languages.
  plate: false # true (the default) for dark line art on transparency
  frame: translation strategies # omit for no window frame
```

It is the same sub-schema in `src/content.config.ts`, not a copy of it, so the
two can never mean different things. Leave it out and the page renders without
one. The path is under `public/`, like every figure — `Figure.astro` reads the
dimensions off disk — and `public/assets/img/projects/` belongs to the projects
feature, so a figure filed there cannot be deleted by pruning something else.

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

Nothing here assumes one author. List every member's surname in
`SELF.surnames` so all of their names are emphasised in author lists, fill in
`people.yml`, and give the entry page the project shape — `npm run init
--preset project`, or the `▼ PRESET:project ▼` regions of
`src/pages/index.astro` if you have already run init.

## Renaming a route

Say `/papers/` should be `/conferences/`, or `/projects/` should be
`/approaches/` because that is what your group calls them. It is **three
edits**, and only one of them is code:

1. **The constant in `src/lib/paths.ts`.** `PAPERS` and `PROJECTS` are the only
   places those two prefixes are written down. Every back link, breadcrumb,
   `NAV` row, hero action and slug helper reads one of them, and so does the
   regex in `src/content.config.ts` that validates a `page = {…}` field — it is
   assembled from the constant rather than typed out, precisely so a rename
   cannot leave a validator behind insisting on the old prefix.

2. **The route directory.** `git mv src/pages/papers src/pages/conferences`.
   Astro derives routes from the filesystem, so this one cannot come from a
   constant. It is also the only reason this is not a single edit.

3. **The data that names the route.** For `papers`, the `page = {/papers/…/}`
   fields in `src/data/papers.bib`. They are content, not code, and the build
   fails with the offending BibTeX key if you forget one.

Two things that look like they should be on that list and are not. The
**collection name** (`papers` in `src/content.config.ts`) and its **source
directory** (`src/content/papers/`) never appear in a URL, so a route rename
does not touch them — rename them too if you like the symmetry, but that is a
separate edit and `reference()` will tell you if you do half of it.

Then `npm run build && npm run verify`: the audit resolves every internal link
in the built output, so anything still pointing at the old prefix is a failure
naming the page it is on.

## The contact block — `src/data/contact.yml`

The rows under "Get in touch" on the entry page, and the same rows in the `/cv/`
lede. One list, rendered by `src/components/Contact.astro`, so a handle added
here shows up in both places with no markup to edit.

```yaml
- label: email
  email: true # true means SITE.email; write an address for a different one

- label: matrix
  value: '@cicero:example.org'
  href: https://matrix.to/#/@cicero:example.org
  mono: true
  note: for anything that should not sit in a mailbox
```

Every row has a `label` and then **exactly one** of `value` and `email`, plus
the optional `href`, `mono` and `note`. Getting that wrong is a build error
naming the row, not a label with nothing beside it.

**An address goes in `email:`, never in `value:`.** `email:` renders through
`src/components/Email.astro`, which splits and rot13s the address so it is not
in the served bytes; `npm run verify` greps the built output for anything
address-shaped and fails the deploy if one appears. A `value:` that looks like
an address is rejected at build time with the row's label, so you find out from
the file that caused it rather than from the audit afterwards.

Two rows are **derived** and appear after the listed ones: the PGP key id, from
`pgp_fingerprint` in `socials.yml`, and your current position, from `cv.yml`.
Neither is repeated here, because a second copy is a copy that can disagree
with `/pgp-key/` and `/cv/`.

It is its own file rather than a block in `cv.yml` because the contact block
outlives the CV: `npm run init --preset project` deletes `src/data/cv.yml`, and
the entry page it produces still has a contact section.

## Your portrait — `src/assets/portrait.*`

Drop in `portrait.jpg`, `portrait.png`, `portrait.webp`, `portrait.avif` or
`portrait.svg` and delete the one that shipped. There is no setting: both the
hero and the `/cv/` lede read `src/lib/portrait.ts`, which finds the file by
extension at build time.

A configured path string could not do this. Astro's `<Image>` optimises and
sizes an asset it can resolve statically, and the audit fails any `<img>`
without intrinsic width and height — so the filename is the configuration, and
`import.meta.glob` is what turns it back into a real static import.

No portrait, or two of them, is a build error naming the path it expected.

## The PGP key — `public/assets/pgp-key/`

`pgp_fingerprint` in `socials.yml` is the only setting, and `/pgp-key/` derives
the key id, the grouped fingerprint and the download path from it. Export your
public key to `public/assets/pgp-key/<FINGERPRINT>.asc` and the page also
inlines the armored block in a `<pre>` with a copy button — read at build time,
so it works without JavaScript and is indexable. No file there is a supported
state, not a broken one: the page keeps the fingerprint, the key id and the
download link.

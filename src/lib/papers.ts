import { getCollection, getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

type Paper = CollectionEntry<'papers'>;
type Pub = CollectionEntry<'publications'>;

/**
 * The three questions every page that renders a paper has to ask, answered in
 * one place.
 *
 * A paper page is one of two things — a publication with a BibTeX entry behind
 * it, or a talk at a venue that publishes nothing — and five consumers need to
 * tell them apart: the page itself, /papers/, a project's list of related
 * papers, the entry pages' paper block, and the feed. Five copies of "if there
 * is a publication, else" is five chances for one of them to render an empty
 * venue, sort an undated paper to the end, or emit `undefined`. See the `papers`
 * block in src/content.config.ts for the schema these read.
 */

/**
 * The publication a paper points at, if it points at one.
 *
 * ABSENCE AND DANGLING ARE DIFFERENT FAILURES, and this is the distinction the
 * whole function exists for. No `publication` at all is a legitimate page: a
 * non-archival talk. A `publication` that does not resolve is a typo in a
 * BibTeX key, and the page it produces looks almost right — a venue line with
 * a year missing, a Cite section with nothing in it — which is exactly how it
 * reaches the live site. So the second one still throws.
 */
export async function paperPublication(paper: Paper): Promise<Pub | undefined> {
  const ref = paper.data.publication;
  if (!ref) return undefined;
  const pub = await getEntry(ref);
  if (!pub) throw new Error(`${paper.id}: publication ${ref.id} not found`);
  return pub;
}

/**
 * The year to date, sort and group a paper by: the BibTeX entry's, or the
 * page's own when it has no entry.
 *
 * Undefined only if the schema's refinements were removed, so callers may
 * treat it as present — but they are written to survive it, because sorting on
 * `?? 0` is what silently parks a paper at the end of a list.
 */
export function paperYear(paper: Paper, pub: Pub | undefined): number | undefined {
  return pub?.data.year ?? paper.data.year;
}

/**
 * Where a paper appeared, as one shape whichever source it came from.
 *
 * Undefined when there is nothing to say: a paper with an entry but no
 * `conferenceName` has its venue in the badge and the imprint line already,
 * and a sentence repeating them would be the same fact three times.
 *
 * It takes no publication, which is worth stating rather than leaving as an
 * absence: the sentence comes entirely from the page's own front matter in both
 * cases. What the BibTeX entry contributes to that row of the header — the
 * badge, the year, the imprint — is contributed directly, and if the derived
 * label ever fell back to the entry's `booktitle` this would be the signature
 * that changed.
 */
export type PaperVenue = {
  /**
   * True when the page states this itself. Callers use it for the things that
   * are only true of a sentence the template did not write: no English
   * conjunction in the byline, no "Published at" in front of the label.
   */
  stated: boolean;
  /** A flag or other mark, before the label. Stated venues only. */
  mark?: string;
  /**
   * The words the template supplies in front of a DERIVED label. A stated
   * label is the whole sentence, so it has none.
   */
  prefix?: string;
  label: string;
  url?: string;
  /** The byline's "by", in the page's language. Stated venues only. */
  connector?: string;
};

export function paperVenue(paper: Paper): PaperVenue | undefined {
  const v = paper.data.venue;
  if (v) {
    return {
      stated: true,
      mark: v.mark,
      label: v.label,
      url: v.url,
      connector: v.bylineConnector,
    };
  }
  if (paper.data.conferenceName) {
    return {
      stated: false,
      prefix: paper.data.status === 'to-appear' ? 'To appear at' : 'Published at',
      label: paper.data.conferenceName,
      url: paper.data.conferenceUrl,
    };
  }
  return undefined;
}

/**
 * The byline's words, which are not the same in both cases.
 *
 * A DERIVED page keeps the serial byline the template has always rendered —
 * "A, B, and C" — with no connector in front of it. A page that STATES its own
 * venue states it in its own language, and then both English words in this line
 * are wrong: the connector comes from the front matter, and the names are joined
 * with plain commas, which nothing has to translate.
 *
 * Here rather than on the paper page alone, because the entry pages' paper block
 * renders the same byline — and a byline that says "oratores" on one page and
 * "by … and …" on the other for the same talk is the drift this module exists to
 * prevent.
 */
export function paperByline(venue: PaperVenue | undefined, count: number) {
  return {
    connector: venue?.stated ? venue.connector : undefined,
    separator: (i: number) => (venue?.stated ? ', ' : i === count - 1 ? ', and ' : ', '),
  };
}

/**
 * What a BibTeX entry says the work appeared IN: the proceedings, the journal,
 * the series, the awarding institution, or at last the publisher. Undefined
 * for an entry that names none of them — an @misc with only a `howpublished`.
 *
 * One chain, used by both fallbacks below, so the label a list row shows and
 * the description a paper page advertises cannot name two different things.
 */
export function paperContainer(pub: Pub | undefined): string | undefined {
  const d = pub?.data;
  return d?.booktitle ?? d?.journal ?? d?.series ?? d?.school ?? d?.institution ?? d?.publisher;
}

/**
 * The shortest TRUE name for where a paper appeared: a breadcrumb leaf, a cell
 * in a list, a line under a title in a project's related-papers block.
 *
 * For a publication that is the venue abbreviation — the badge's own text, and
 * the reason the papers schema carries no short label of its own for that
 * case. For a stated venue it is `venue.short`, falling back to the full
 * label, because there is nothing else: a page with no BibTeX entry has no
 * badge.
 *
 * A publication WITHOUT an `abbr` falls back to what its entry says it
 * appeared in — the proceedings or journal title, which is long but is the
 * entry's own record and cannot be wrong — and to nothing at all when the
 * entry names no container. Callers render nothing in that case: the
 * breadcrumb stops at "papers", a list row shows the year alone.
 *
 * This used to fall back to the word 'preprint', on the theory that a paper
 * with no badge must be one. It is not: a workshop paper whose venue simply
 * has no row in venues.yml is a published paper, and two real ones on
 * ardoco.de were being called preprints in three places. A label the template
 * invents can be false; a label read from the entry, or left out, cannot. The
 * word is still reachable — from an `abbr` that says so (an `arXiv` row in
 * venues.yml, which also gives the entry its badge) or a stated `venue.short`
 * — which is to say only when the site says the work is one. The way to get a
 * SHORT label for a paper that has none is the same: give the entry an `abbr`.
 */
export function paperVenueShort(paper: Paper, pub: Pub | undefined): string | undefined {
  return (
    paper.data.venue?.short ?? paper.data.venue?.label ?? pub?.data.abbr?.id ?? paperContainer(pub)
  );
}

/**
 * The one-line summary a paper page advertises to a link preview and a feed
 * reader: its own `description`, or failing that the venue — the paper's own,
 * whether stated on the page, given as `conferenceName`, or read off the
 * BibTeX entry. Never the site's blurb: a card for a paper that describes the
 * site is a card that says nothing about the paper. Undefined only for a page
 * with no description and an entry that names no container, and BaseHead then
 * falls back to SITE.description as it does for any page.
 */
export function paperDescription(paper: Paper, pub: Pub | undefined): string | undefined {
  return paper.data.description ?? paperVenue(paper)?.label ?? paperContainer(pub);
}

/**
 * The label for a key in a paper's `links` maps: the site's own table first,
 * then a RULE for keys that encode which talk a file belongs to, then the key
 * as typed.
 *
 * The rule: `<venue>_<kind>` where `<kind>` is itself a labelled key, so
 * `icsa23_pdf` is "PDF (ICSA23)" and `se26_pptx` is "PPTX (SE26)". ardoco.de
 * files its slide decks that way — one paper, presented three times, three
 * decks under `slides` — and the label had been derived by string surgery on
 * the key in the template language. A derivation rather than three more rows
 * in the table, because the venue part is open-ended and the point of the key
 * is that adding a deck needs no edit anywhere else.
 *
 * The table is the caller's — it lives on the paper page beside the keys it
 * names — and it wins outright: a key that is in it is never taken apart.
 */
export function linkLabel(key: string, labels: Record<string, string>): string {
  if (labels[key]) return labels[key];
  const m = /^(.+)_([a-z0-9]+)$/i.exec(key);
  if (m && labels[m[2]]) return `${labels[m[2]]} (${m[1].replace(/[-_]/g, ' ').toUpperCase()})`;
  return key;
}

/**
 * The paper pages an entry page's block lists: the ones marked `featured`,
 * newest first, each with its BibTeX entry already resolved.
 *
 * DERIVED FROM `papers`, NOT FROM `publications`, and that is the whole point.
 * Both entry pages used to build this list as `publications.filter(pageSlug)` —
 * the publications that name a page. A paper whose venue is STATED rather than
 * cited has no row in `publications` at all, so it could never appear there no
 * matter how its front matter was marked: the block was reading the wrong
 * collection to answer "which pages are there". The block lists PAGES, so it
 * comes from the collection of pages.
 *
 * SELECTED ON `featured`, SORTED BY YEAR THEN `order`. Both are fields of the
 * papers schema, which is where an author curates this block; the publications
 * side is generated from papers.bib and has no opinion about what belongs on a
 * front page. `order` rather than the month-and-venue tie-break /publications/
 * uses, so two works from the same year keep the sequence a reader already saw
 * on /papers/.
 */
export async function featuredPapers(): Promise<{ paper: Paper; pub: Pub | undefined }[]> {
  const papers = await getCollection('papers', (p) => p.data.featured);
  const rows = await Promise.all(
    papers.map(async (paper) => {
      const pub = await paperPublication(paper);
      return { paper, pub, year: paperYear(paper, pub) };
    }),
  );
  return rows
    .sort(
      (a, b) =>
        (b.year ?? 0) - (a.year ?? 0) ||
        a.paper.data.order - b.paper.data.order ||
        a.paper.data.title.localeCompare(b.paper.data.title),
    )
    .map(({ paper, pub }) => ({ paper, pub }));
}

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
 * The shortest true name for where a paper appeared: a breadcrumb leaf, a cell
 * in a list, a line under a title in a project's related-papers block.
 *
 * For a publication that is the venue abbreviation — the badge's own text, and
 * the reason the papers schema carries no short label of its own for that case.
 * For a stated venue it is `venue.short`, falling back to the full label,
 * because there is nothing else: the page with no BibTeX entry has no badge.
 * A publication with no venue at all is a preprint, which is what is left.
 */
export function paperVenueShort(paper: Paper, pub: Pub | undefined): string {
  return paper.data.venue?.short ?? paper.data.venue?.label ?? pub?.data.abbr?.id ?? 'preprint';
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

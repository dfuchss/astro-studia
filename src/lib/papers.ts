import { getCollection, getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

type Paper = CollectionEntry<'papers'>;
type Pub = CollectionEntry<'publications'>;

/**
 * What every consumer of a paper page — the page, /papers/, a project's
 * related papers, the entry pages' block, the feed — has to know, answered
 * once. A paper is either a publication with a BibTeX entry behind it or a
 * talk at a venue that publishes nothing; see the `papers` schema in
 * src/content.config.ts.
 */

/**
 * The publication a paper points at, if it points at one.
 *
 * Absent and dangling are different failures. No `publication` is a legitimate
 * page (a non-archival talk). A `publication` that does not resolve is a typo
 * in a BibTeX key, and the page it produces looks almost right — a venue line
 * with no year, an empty Cite section — so it throws.
 */
export async function paperPublication(paper: Paper): Promise<Pub | undefined> {
  const ref = paper.data.publication;
  if (!ref) return undefined;
  const pub = await getEntry(ref);
  if (!pub) throw new Error(`${paper.id}: publication ${ref.id} not found`);
  return pub;
}

/**
 * The year to date, sort and group a paper by: the entry's, or the page's own.
 * Undefined only if the schema's refinements were removed; callers still
 * survive it, because sorting on `?? 0` silently parks a paper last.
 */
export function paperYear(paper: Paper, pub: Pub | undefined): number | undefined {
  return pub?.data.year ?? paper.data.year;
}

/**
 * Where a paper appeared, as one shape whichever source it came from.
 * Undefined when there is nothing to say: an entry with no `conferenceName`
 * has its venue in the badge and the imprint already. The sentence comes from
 * the page's own front matter in both cases, which is why this takes no
 * publication.
 */
export type PaperVenue = {
  /** True when the page states this itself: no "Published at" in front of the
      label, no English conjunction in the byline. */
  stated: boolean;
  /** A flag or other mark, before the label. Stated venues only. */
  mark?: string;
  /** The words in front of a DERIVED label. A stated label is the whole sentence. */
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
 * The byline's words. A DERIVED page gets the serial "A, B, and C" with no
 * connector. A page that STATES its venue states it in its own language, so
 * the connector comes from the front matter and the names are joined with
 * plain commas, which nothing has to translate. Shared with the entry pages'
 * paper block so the two cannot disagree.
 */
export function paperByline(venue: PaperVenue | undefined, count: number) {
  return {
    connector: venue?.stated ? venue.connector : undefined,
    separator: (i: number) => (venue?.stated ? ', ' : i === count - 1 ? ', and ' : ', '),
  };
}

/**
 * What a BibTeX entry says the work appeared IN, or undefined for an entry
 * that names no container. One chain for both fallbacks below.
 */
export function paperContainer(pub: Pub | undefined): string | undefined {
  const d = pub?.data;
  return d?.booktitle ?? d?.journal ?? d?.series ?? d?.school ?? d?.institution ?? d?.publisher;
}

/**
 * The shortest TRUE name for where a paper appeared: `venue.short`, the badge
 * abbreviation, or what the entry says it appeared in. Undefined when the
 * entry names no container, and callers then render nothing. Never a word the
 * template invents: a "preprint" fallback here once mislabelled published
 * workshop papers. A short label for a paper that has none is an `abbr`.
 */
export function paperVenueShort(paper: Paper, pub: Pub | undefined): string | undefined {
  return (
    paper.data.venue?.short ?? paper.data.venue?.label ?? pub?.data.abbr?.id ?? paperContainer(pub)
  );
}

/**
 * The one-line summary for a link preview and a feed reader: `description`,
 * or failing that the paper's own venue. Never the site's blurb. Undefined
 * only when neither exists, and BaseHead then falls back to SITE.description.
 */
export function paperDescription(paper: Paper, pub: Pub | undefined): string | undefined {
  return paper.data.description ?? paperVenue(paper)?.label ?? paperContainer(pub);
}

/**
 * The label for a key in a paper's `links` maps: the caller's table first,
 * then `<venue>_<kind>` where `<kind>` is itself a labelled key (`icsa23_pdf`
 * is "PDF (ICSA23)"), then the key as typed. The venue part is open-ended so
 * that filing one more deck needs no edit anywhere.
 */
export function linkLabel(key: string, labels: Record<string, string>): string {
  if (labels[key]) return labels[key];
  const m = /^(.+)_([a-z0-9]+)$/i.exec(key);
  if (m && labels[m[2]]) return `${labels[m[2]]} (${m[1].replace(/[-_]/g, ' ').toUpperCase()})`;
  return key;
}

/**
 * The paper pages an entry page's block lists: `featured`, newest first, then
 * `order`, each with its entry resolved. From `papers`, not from
 * `publications.filter(pageSlug)`: a page whose venue is stated rather than
 * cited has no row in `publications` and would never appear.
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

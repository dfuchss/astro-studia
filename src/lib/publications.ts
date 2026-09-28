import type { CollectionEntry } from 'astro:content';

type Pub = CollectionEntry<'publications'>;

/**
 * Newest first, and fully deterministic.
 *
 * Year and month alone leave ties — several papers a year share a month — and
 * the order among tied entries otherwise falls out of however the loader
 * happened to emit them, which means it can change between builds for no
 * reason anyone can see. Venue and then title break the tie, so papers from
 * the same venue and month stay together and the page is stable.
 *
 * `abbr` is optional, so tie-break on its id only when both have one.
 */
export function byNewest(a: Pub, b: Pub) {
  return (
    b.data.year - a.data.year ||
    (b.data.month ?? 0) - (a.data.month ?? 0) ||
    (a.data.abbr?.id ?? '').localeCompare(b.data.abbr?.id ?? '') ||
    a.data.title.localeCompare(b.data.title)
  );
}

/** Group into year buckets, newest year first, each bucket already sorted. */
export function byYear(pubs: Pub[]): { year: number; items: Pub[] }[] {
  const buckets = new Map<number, Pub[]>();
  for (const p of [...pubs].sort(byNewest)) {
    const list = buckets.get(p.data.year);
    if (list) list.push(p);
    else buckets.set(p.data.year, [p]);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }));
}

/**
 * A Date for a publication, from its year and month.
 *
 * A paper has a month, not a day, so this lands on the FIRST of the month —
 * the conventional expansion of a month-precision date, and what truncating an
 * ISO timestamp to YYYY-MM already implies. Picking a mid-point would invent a
 * day the source does not have.
 *
 * TWO TRAPS, both of which this template shipped before they were noticed:
 *
 *   Date.UTC takes a ZERO-BASED month. The schema stores 1-12, so passing it
 *   straight through dates every September paper to October — and hardcoding 0
 *   "because the month is optional" dates the entire bibliography to January,
 *   which is what ardoco.de's feed did: every item 15 January of its year, so
 *   nothing within a year could be ordered at all.
 *
 *   UTC, not local. Constructing this in a local zone west of UTC shifts the
 *   day backwards, so the same commit produces different dates depending on
 *   where it was built.
 *
 * And a third, which only became reachable when a paper page was allowed to
 * state its own `year`: Date.UTC maps a year of 0-99 onto 1900-1999, so
 * `year: 44` silently becomes 1944. setUTCFullYear is the only way to say a
 * two-digit year and mean it.
 */
export function publicationDate(d: { year: number; month?: number }): Date {
  const date = new Date(Date.UTC(d.year, (d.month ?? 1) - 1, 1));
  if (d.year >= 0 && d.year <= 99) date.setUTCFullYear(d.year);
  return date;
}

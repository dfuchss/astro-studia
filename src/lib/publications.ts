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
 * A paper has a month, not a day, so this lands mid-month: that keeps an
 * ordering honest without implying a precision the source does not have.
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
 */
export function publicationDate(d: { year: number; month?: number }): Date {
  return new Date(Date.UTC(d.year, (d.month ?? 1) - 1, 15));
}

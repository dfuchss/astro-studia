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

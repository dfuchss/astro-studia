import { SITE } from '../consts.ts';
import { citations } from './data.ts';

/**
 * Google Scholar cluster id → citation count.
 *
 * Scholar's own keys look like `<profileId>:<clusterId>`, while a `.bib` entry
 * usually carries just the cluster id. Index on the part after the last colon
 * so either form works, whichever way you filled in citations.yml.
 */
const byCluster = new Map<string, number>(
  Object.entries(citations.papers).map(([key, value]) => [
    key.split(':').at(-1)!,
    value.citations ?? 0,
  ]),
);

export function citationsFor(googleScholarId?: string): number {
  if (!googleScholarId) return 0;
  return byCluster.get(googleScholarId.split(':').at(-1)!) ?? 0;
}

/**
 * Total citations, h-index and i10-index.
 *
 * Computed over the whole of citations.yml — the full Scholar profile, not only
 * the entries that also appear in papers.bib. That is deliberate: it makes the
 * numbers here match the ones on your Scholar page, which is the comparison
 * anyone reading them will actually make.
 */
export function scholarMetrics() {
  const counts = Object.values(citations.papers)
    .map((p) => p.citations ?? 0)
    .sort((a, b) => b - a);

  return {
    total: counts.reduce((sum, n) => sum + n, 0),
    hIndex: counts.reduce((h, n, i) => (n >= i + 1 ? i + 1 : h), 0),
    i10: counts.filter((n) => n >= 10).length,
    lastUpdated: citations.metadata.last_updated,
  };
}

/**
 * Format the `last_updated` date.
 *
 * Parsed and rendered as UTC on purpose. `new Date('2026-09-13')` is midnight
 * UTC, and reading it with local getters anywhere west of UTC gives the
 * previous day — so the same commit renders a different date depending on
 * where it was built.
 */
export function formatUpdated(iso: string): string {
  return new Intl.DateTimeFormat(SITE.locale, {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

export const formatCount = (n: number) => new Intl.NumberFormat(SITE.locale).format(n);

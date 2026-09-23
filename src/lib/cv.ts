import { parse } from 'yaml';
import cvRaw from '../data/cv.yml?raw';
import { SITE } from '../consts.ts';

export type CvEntry = {
  title: string;
  org?: string;
  url?: string;
  start?: string;
  end?: string;
  location?: string;
  note?: string;
  details?: string[];
};

export type CvSection = {
  id: string;
  heading: string;
  entries: CvEntry[];
};

export type Cv = {
  summary?: string;
  sections: CvSection[];
};

export const cv = parse(cvRaw) as Cv;

/**
 * Format one end of a date range.
 *
 * "2020-03" and "2020" are formatted for the site's locale; anything else is
 * passed through untouched. That is deliberately permissive — a CV carries
 * "Winter 2024/25", "ongoing" and "63 BC" as readily as it carries an ISO
 * date, and a schema strict enough to reject those would be wrong more often
 * than it was useful.
 *
 * Parsed as UTC, so a month does not shift backwards depending on where the
 * build ran.
 */
export function formatDate(value: string): string {
  const ym = /^(\d{4})-(\d{2})$/.exec(value);
  if (ym) {
    return new Intl.DateTimeFormat(SITE.locale, {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}-01T00:00:00Z`));
  }
  return value;
}

/** "Jan 2020 – present", "63 BC – 62 BC", "2020", or "" when undated. */
export function dateRange(entry: CvEntry): string {
  if (!entry.start) return entry.end ? formatDate(entry.end) : '';
  const from = formatDate(entry.start);
  if (!entry.end) return `${from} – present`;
  const to = formatDate(entry.end);
  return from === to ? from : `${from} – ${to}`;
}

/** An entry with a start and no end is the one you currently hold. */
export const isCurrent = (entry: CvEntry) => Boolean(entry.start && !entry.end);

/**
 * The first current entry anywhere in the CV. The home page uses it for the
 * "where to find me" line, so that it cannot disagree with this page.
 */
export function currentPosition(): CvEntry | undefined {
  for (const section of cv.sections) {
    const hit = section.entries.find(isCurrent);
    if (hit) return hit;
  }
  return undefined;
}

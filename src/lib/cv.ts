import { parse } from 'yaml';
import cvRaw from '../data/cv.yml?raw';
import { SITE } from '../consts.ts';

/**
 * How a section renders. `timeline` (a date rail) and `rows` (none) are
 * chosen by layoutOf() when a section names nothing; `cards` (a grid with
 * highlight chips) and `courses` (a semester-grouped grid) are always explicit.
 */
export type CvLayout = 'timeline' | 'rows' | 'cards' | 'courses';

export type CvEntry = {
  title: string;
  org?: string;
  url?: string;
  start?: string;
  end?: string;
  /** Still going. Renders "– present" and a `now` badge. */
  current?: boolean;
  location?: string;
  note?: string;
  details?: string[];
  /**
   * Sends this entry to the section's collapsed tail. A per-entry flag rather
   * than "keep the first N", because the line between main and tail is about
   * what kind of entry it is, not where it falls once sorted.
   */
  minor?: boolean;
  /** Chips under a `cards` entry, e.g. the areas a project touches. */
  highlights?: string[];
  /** A `courses` entry's term, e.g. "WS 26/27" or "SS 2026". */
  semester?: string;
  /** A `courses` entry's kind, e.g. "Lecture / Practice". */
  type?: string;
};

export type CvSection = {
  id: string;
  heading: string;
  layout?: CvLayout;
  /**
   * A noun for an entry count beside the heading: `courses` renders
   * "Teaching 24 courses". Opt-in, because a bare number on every heading is
   * noise; the noun is the switch. `singular|plural` for a section that may
   * hold one entry.
   */
  count?: string;
  entries: CvEntry[];
};

export type Cv = {
  summary?: string;
  /** Research-interest tag cloud rendered under the summary. */
  interests?: string[];
  sections: CvSection[];
};

export const cv = parse(cvRaw) as Cv;

/**
 * Format one end of a date range. "2020-03" is formatted for the site's
 * locale, in UTC so the month cannot shift with the build machine's zone;
 * anything else ("Winter 2024/25", "63 BC") passes through untouched.
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
  if (entry.current) return `${from} – present`;
  if (!entry.end) return from;
  const to = formatDate(entry.end);
  return from === to ? from : `${from} – ${to}`;
}

/**
 * Explicit, not inferred: "a start and no end" also describes a degree, a
 * prize and a certificate, and inferring would label every one of them "now".
 */
export const isCurrent = (entry: CvEntry) => entry.current === true;

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

/** The default layout for a section that names none: a rail only once there
    are dates to hang on it. */
export function layoutOf(section: CvSection): CvLayout {
  return section.layout ?? (section.entries.some((e) => e.start || e.end) ? 'timeline' : 'rows');
}

/**
 * "24 courses" for a section that named a `count` noun, or nothing for one
 * that did not. See `CvSection.count` for why this is opt-in.
 */
export function countLabel(section: CvSection): string | undefined {
  if (!section.count) return undefined;
  const n = section.entries.length;
  const [one, many = one] = section.count.split('|');
  return `${n} ${n === 1 ? one : many}`;
}

/** An entry's `minor` flag splits a section's main list from its collapsed tail. */
export function splitMinor(entries: CvEntry[]): { main: CvEntry[]; minor: CvEntry[] } {
  return { main: entries.filter((e) => !e.minor), minor: entries.filter((e) => e.minor) };
}

/**
 * A semester string → a sortable number, newest largest. `WS 26/27` has no
 * four-digit year, so both spellings are keyed on the two- or four-digit year
 * the semester starts in, which puts `WS 26/27` above `SS 2026`.
 */
export function semesterKey(semester: string): number {
  const m = /(\d{4}|\d{2})/.exec(semester);
  if (!m) return 0;
  const year = m[1].length === 2 ? 2000 + Number(m[1]) : Number(m[1]);
  return year * 10 + (semester.startsWith('WS') ? 1 : 0);
}

/** A `courses` section's entries, newest semester first, split into the
    current term and everything before it. */
export function groupCourses(entries: CvEntry[]): { current: CvEntry[]; past: CvEntry[] } {
  const sorted = [...entries].sort(
    (a, b) => semesterKey(b.semester ?? '') - semesterKey(a.semester ?? ''),
  );
  const currentSemester = sorted[0]?.semester;
  return {
    current: sorted.filter((c) => c.semester === currentSemester),
    past: sorted.filter((c) => c.semester !== currentSemester),
  };
}

/**
 * A `details` bullet is plain text unless it embeds a markdown link:
 * "Reviewer for [ACM TOSEM](https://…)". Only that construct is parsed, so a
 * bullet reads the same in cv.yml as in any markdown file and may carry more
 * than one link.
 */
export type DetailPart = { text: string; url?: string };
export function parseDetail(detail: string): DetailPart[] {
  const parts: DetailPart[] = [];
  const link = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = link.exec(detail))) {
    if (m.index > last) parts.push({ text: detail.slice(last, m.index) });
    parts.push({ text: m[1], url: m[2] });
    last = m.index + m[0].length;
  }
  if (last < detail.length) parts.push({ text: detail.slice(last) });
  return parts;
}

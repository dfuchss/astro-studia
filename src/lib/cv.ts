import { parse } from 'yaml';
import cvRaw from '../data/cv.yml?raw';
import { SITE } from '../consts.ts';

/**
 * A section can render as:
 *
 *   timeline  a date rail on the left, content on the right (the default
 *             when entries carry dates)
 *   rows      the same content with no rail (the default otherwise)
 *   cards     a grid — title, "since" date, summary, a row of highlight
 *             chips. For a Projects-shaped section, where a rail would carry
 *             no information and a grid gives each entry room to breathe.
 *   courses   a semester-grouped grid, current semester surfaced above a
 *             collapsed run of past ones. For teaching, where "when" is a
 *             term rather than a date range.
 *
 * `layout` is optional so an existing section — anything not explicitly
 * opting in — keeps rendering exactly as it did.
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
   * Sends this entry to the section's collapsed tail instead of its main
   * list — a long run of repeated low-value entries (teaching
   * assistantships, retired course editions) that would otherwise bury the
   * ones that matter, without deleting anything.
   *
   * A per-entry flag rather than a "keep the first N" count: in a real CV the
   * line between "main" and "tail" is almost always about what *kind* of
   * entry it is, not where it happens to fall once sorted — a teaching
   * assistantship from three years ago and one from last month belong in the
   * same tail.
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
  if (entry.current) return `${from} – present`;
  if (!entry.end) return from;
  const to = formatDate(entry.end);
  return from === to ? from : `${from} – ${to}`;
}

/**
 * Explicit, not inferred.
 *
 * "Has a start and no end" looks like it means ongoing, and does for a job —
 * but a degree, a prize and a certificate all carry one date and no end, and
 * inferring from the shape of the data labels every one of them "now".
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

/**
 * The default layout for a section that does not name one: a rail makes
 * sense once entries carry a date to hang it on, and reads as decoration
 * with nothing behind it otherwise.
 */
export function layoutOf(section: CvSection): CvLayout {
  return section.layout ?? (section.entries.some((e) => e.start || e.end) ? 'timeline' : 'rows');
}

/** An entry's `minor` flag splits a section's main list from its collapsed tail. */
export function splitMinor(entries: CvEntry[]): { main: CvEntry[]; minor: CvEntry[] } {
  return { main: entries.filter((e) => !e.minor), minor: entries.filter((e) => e.minor) };
}

/**
 * A semester string → a sortable number, newest largest.
 *
 * Winter semesters are written `WS 26/27`, summer ones `SS 2026`, so a plain
 * four-digit match finds no year in a winter one and sorts every `WS` entry
 * below every `SS` entry. Both spellings are keyed on the year the semester
 * *starts*, which puts `WS 26/27` (October 2026) above `SS 2026` (April 2026)
 * and interleaves the two halves of each academic year.
 */
export function semesterKey(semester: string): number {
  const m = /(\d{4}|\d{2})/.exec(semester);
  if (!m) return 0;
  const year = m[1].length === 2 ? 2000 + Number(m[1]) : Number(m[1]);
  return year * 10 + (semester.startsWith('WS') ? 1 : 0);
}

/**
 * A `courses` section's entries, newest semester first and split into the
 * current term versus everything before it — the grid that stays visible
 * versus the run that collapses behind a disclosure.
 */
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
 * `CvEntry.details` bullets are plain text unless one embeds a markdown link,
 * e.g. "Reviewer for [ACM TOSEM](https://…)". Parsing just that one construct
 * — rather than accepting an object form in the YAML — means a bullet with no
 * link stays the plain string it always was, and one with a link reads the
 * same in cv.yml as it would in any markdown file, instead of a `{text, url}`
 * shape that has to be learned. It also allows more than one link per bullet,
 * which a single `{text, url}` pair could not.
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

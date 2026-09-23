import { SELF } from '../consts.ts';

export type Person = { first: string; last: string };

/**
 * Fold a name down to something comparable: strip diacritics, and map ß to ss
 * the way German transliteration does.
 *
 * Bibliographies are inconsistent about both. The same person is "Fuchß" in
 * one entry and "Fuchss" in another, "Muñoz" in one and "Munoz" in the next,
 * and a plain === leaves half their papers not recognised as theirs.
 */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase();

const SELF_SURNAMES = SELF.surnames.map(fold);

/** Is this author the person (or one of the people) the site is about? */
export const isSelf = (p: Person) => SELF_SURNAMES.includes(fold(p.last));

/** "Edsger W. Dijkstra" */
export const fullName = (p: Person) => [p.first, p.last].filter(Boolean).join(' ');

/**
 * Author list with truncation.
 *
 * The limit is 4, with a grace clause: at exactly limit + 1 authors it shows
 * all of them, because "and 1 more author" takes more room than the name it is
 * standing in for and tells the reader less.
 */
export function truncateAuthors(people: Person[], limit = 4) {
  if (people.length <= limit + 1) return { shown: people, hidden: 0 };
  return { shown: people.slice(0, limit), hidden: people.length - limit };
}

import { AUTHOR_LIMIT, SELF } from '../consts.ts';

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

/**
 * The key a surname is looked up under — in the people map, and anywhere else
 * two spellings of one name have to meet. Exported so that whatever builds the
 * map and whatever reads it cannot fold differently.
 */
export const surnameKey = fold;

/** Is this author the person (or one of the people) the site is about? */
export const isSelf = (p: Person) => SELF_SURNAMES.includes(fold(p.last));

/** "Edsger W. Dijkstra" */
export const fullName = (p: Person) => [p.first, p.last].filter(Boolean).join(' ');

/**
 * Is the bearer of this DISPLAY NAME the person the site is about?
 *
 * authors.yml holds one display name per person, while isSelf() matches on a
 * surname — so the surname is the last whitespace-separated word. That is right
 * for everyone except a compound name ("van der Aalst" reduces to "Aalst"), and
 * the fix when it bites is to list that spelling in SELF.surnames, which is
 * exactly what that list is for.
 *
 * Here rather than on each page that renders an authors.yml byline, so a paper
 * page and a paper row on an entry page cannot disagree about whose name to
 * emphasise.
 */
export const isSelfName = (name: string) =>
  isSelf({ first: '', last: name.split(/\s+/).at(-1) ?? name });

/**
 * Author list with truncation.
 *
 * The limit is AUTHOR_LIMIT in src/consts.ts — 4 as shipped — with a grace
 * clause: at exactly limit + 1 authors it shows all of them, because "and 1
 * more author" takes more room than the name it is standing in for and tells
 * the reader less. `null` turns truncation off and lists everyone, which is
 * what a group site wants: the people ARE the point of its list.
 */
export function truncateAuthors(people: Person[], limit: number | null = AUTHOR_LIMIT) {
  if (limit === null || people.length <= limit + 1) return { shown: people, hidden: 0 };
  return { shown: people.slice(0, limit), hidden: people.length - limit };
}

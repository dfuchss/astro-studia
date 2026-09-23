import { getCollection, getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { personAnchor } from './paths.ts';

export type Member = {
  entry: CollectionEntry<'people'>;
  author: CollectionEntry<'authors'>;
};

/** Everyone on /people/, in the order they declare. */
export async function members(): Promise<Member[]> {
  const people = (await getCollection('people')).sort((a, b) => a.data.order - b.data.order);

  return Promise.all(
    people.map(async (entry) => {
      const author = await getEntry(entry.data.author);
      if (!author) {
        throw new Error(`people.yml: ${entry.id} references author ${entry.data.author.id}`);
      }
      return { entry, author };
    }),
  );
}

/**
 * Surname → the anchor of that person's entry on /people/.
 *
 * Lets an author name in the publication list become a link, without every
 * publication having to know who is on the team. Built once per page and
 * passed down, rather than looked up per author — a page listing forty papers
 * would otherwise hit the content store several hundred times.
 *
 * Matching is on the surname alone, folded the same way isSelf() folds, so
 * "Sjögren" and "Sjogren" both land. That is deliberately loose: two people
 * sharing a surname is rarer than one person's name being spelled two ways,
 * and the cost of a wrong hit here is a link to the wrong colleague rather
 * than anything worse.
 */
export async function peopleLinks(): Promise<Map<string, string>> {
  const fold = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ß/g, 'ss')
      .toLowerCase();

  const map = new Map<string, string>();
  for (const { entry } of await members()) {
    for (const surname of entry.data.surnames) {
      map.set(fold(surname), personAnchor(entry.id));
    }
  }
  return map;
}

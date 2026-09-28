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
 * Surname → the anchor of that person's entry on /people/, built once per
 * page and passed down rather than looked up per author. Matching is on the
 * folded surname alone (the same fold as surnameKey() in authors.ts, which
 * PubEntry reads the map with): deliberately loose, because one name spelled
 * two ways is commoner than two people sharing a surname.
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

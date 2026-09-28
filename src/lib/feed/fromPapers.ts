import { getCollection } from 'astro:content';
import { publicationDate } from '../publications.ts';
import { paperPublication, paperVenue, paperYear } from '../papers.ts';
import { paperPath } from '../paths.ts';
import type { FeedItem } from './types.ts';

/**
 * Feed items from the paper pages.
 *
 * The right shape for a project or group site, which has no blog but where a
 * new paper is the news. Swap the import in src/pages/feed.xml.ts to use it.
 *
 * The date comes from the BibTeX entry when there is one, because that is where
 * the month lives and a paper page carries no finer date than a year. A page
 * with NO entry — a talk at a venue that publishes nothing — has its own year,
 * and that is what dates it here: reading the entry alone would leave the item
 * with no pubDate, which a reader's client files at the bottom for ever. See
 * publicationDate() for the part that is easy to get wrong.
 */
export async function feedItems(): Promise<FeedItem[]> {
  const papers = await getCollection('papers');

  const items = await Promise.all(
    papers.map(async (paper) => {
      const pub = await paperPublication(paper);
      const year = paperYear(paper, pub);
      return {
        title: paper.data.title,
        // A talk usually has no description of its own; the venue it was given
        // at is the next most useful line in a reader's client, and it is the
        // one thing such a page always states.
        description: paper.data.description ?? paperVenue(paper)?.label,
        pubDate: year === undefined ? undefined : publicationDate({ year, month: pub?.data.month }),
        path: paperPath(paper.id),
        categories: pub?.data.keywords ?? [],
      };
    }),
  );

  return items;
}

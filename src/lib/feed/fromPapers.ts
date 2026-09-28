import { getCollection } from 'astro:content';
import { publicationDate } from '../publications.ts';
import { paperDescription, paperPublication, paperYear } from '../papers.ts';
import { paperPath } from '../paths.ts';
import type { FeedItem } from './types.ts';

/**
 * Feed items from the paper pages — for a site with no blog, where a new paper
 * is the news. Swap the import in src/pages/feed.xml.ts to use it. A page with
 * no BibTeX entry is dated by its own year rather than left undated, which a
 * reader's client would file at the bottom for ever.
 */
export async function feedItems(): Promise<FeedItem[]> {
  const papers = await getCollection('papers');

  const items = await Promise.all(
    papers.map(async (paper) => {
      const pub = await paperPublication(paper);
      const year = paperYear(paper, pub);
      return {
        title: paper.data.title,
        // The same fallback the page's meta description uses, so the feed and
        // the page cannot summarise one work two ways.
        description: paperDescription(paper, pub),
        pubDate: year === undefined ? undefined : publicationDate({ year, month: pub?.data.month }),
        path: paperPath(paper.id),
        categories: pub?.data.keywords ?? [],
      };
    }),
  );

  return items;
}

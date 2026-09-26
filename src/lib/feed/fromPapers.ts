import { getCollection, getEntry } from 'astro:content';
import { publicationDate } from '../publications.ts';
import { paperPath } from '../paths.ts';
import type { FeedItem } from './types.ts';

/**
 * Feed items from the paper pages.
 *
 * The right shape for a project or group site, which has no blog but where a
 * new paper is the news. Swap the import in src/pages/feed.xml.ts to use it.
 *
 * The date comes from the BibTeX entry rather than from the page, because a
 * paper page carries no date at all and the publication it points at carries
 * a year and a month. See publicationDate() for the part that is easy to get
 * wrong.
 */
export async function feedItems(): Promise<FeedItem[]> {
  const papers = await getCollection('papers');

  const items = await Promise.all(
    papers.map(async (paper) => {
      const pub = await getEntry(paper.data.publication);
      return {
        title: paper.data.title,
        description: paper.data.description,
        pubDate: pub ? publicationDate(pub.data) : undefined,
        path: paperPath(paper.id),
        categories: pub?.data.keywords ?? [],
      };
    }),
  );

  return items;
}

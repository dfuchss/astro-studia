import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../consts.ts';

// THE ONE LINE A PRESET SWAPS: `fromPosts` needs the blog, `fromPapers` does
// not. Both export the same feedItems().
import { feedItems } from '../lib/feed/fromPosts.ts';

/** The feed, at /feed.xml. Deliberately not tied to the blog. */
export const GET: APIRoute = async (context) => {
  const items = await feedItems();

  // Newest first, undated last; the source collection's order is not
  // necessarily chronological.
  items.sort((a, b) => (b.pubDate?.getTime() ?? -Infinity) - (a.pubDate?.getTime() ?? -Infinity));

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const site = context.site ?? new URL(SITE.url);

  return rss({
    title: SITE.title,
    description: SITE.description,
    site,
    items: items.map((item) => ({
      title: item.title,
      description: item.description,
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
      /*
       * ABSOLUTE, AND BUILT HERE. The base goes on here because an RSS <link>
       * is an element, out of the base-paths integration's reach. And it is a
       * full URL before @astrojs/rss sees it, because that re-shapes a relative
       * one: `trailingSlash` appends a slash to every link by default and
       * strips one from every link when false, and under 'preserve' a feed
       * carries both shapes. A feed that shipped with that bug 404ed every link,
       * and nobody reading a feed is looking at the site to notice.
       */
      link: new URL(`${base}${item.path}`, site).href,
      categories: item.categories,
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
};

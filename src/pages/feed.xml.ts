import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../consts.ts';

// THE ONE LINE A PRESET SWAPS: `fromPapers` is the blog-free twin of `fromPosts`.
import { feedItems } from '../lib/feed/fromPosts.ts';

/** The feed, at /feed.xml. Deliberately not tied to the blog. */
export const GET: APIRoute = async (context) => {
  const items = await feedItems();

  // Newest first, undated last: the source collection's order is not chronological.
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
       * Absolute, and built here: an RSS <link> is an element body, out of the
       * base-paths integration's reach, and @astrojs/rss re-shapes a relative
       * one to match `trailingSlash`. Either way the links 404.
       */
      link: new URL(`${base}${item.path}`, site).href,
      categories: item.categories,
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
};

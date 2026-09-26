import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../consts.ts';

// THE ONE LINE A PRESET SWAPS. `fromPosts` needs the blog; `fromPapers` does
// not and is what a project or group site wants, where a new paper is the news
// rather than a post. Both export the same feedItems(), so this is the only
// edit — see src/lib/feed/.
import { feedItems } from '../lib/feed/fromPosts.ts';

/**
 * The feed, at /feed.xml.
 *
 * Deliberately NOT tied to the blog. A site can have a feed without having a
 * blog, and the clearest evidence is ardoco.de: no blog at all, and a feed of
 * its paper pages — which is the thing that actually gets added over time.
 */
export const GET: APIRoute = async (context) => {
  const items = await feedItems();

  /*
   * Newest first, and undated entries last rather than first. Whatever order
   * the source collection is in is the order its pages want, which is not
   * necessarily chronological — and a reader whose client preserves document
   * order would see the list shuffled.
   */
  items.sort((a, b) => (b.pubDate?.getTime() ?? -Infinity) - (a.pubDate?.getTime() ?? -Infinity));

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: items.map((item) => ({
      title: item.title,
      description: item.description,
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
      // The base is applied here rather than by the base-paths integration: an
      // RSS <link> is an element, not an attribute, and @astrojs/rss resolves
      // it against `site`, where a root-absolute path would replace the base
      // rather than sit under it.
      link: `${base}${item.path}`,
      categories: item.categories,
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
};

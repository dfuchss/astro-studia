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
       * ABSOLUTE, AND BUILT HERE, for two reasons.
       *
       * The base is applied here rather than by the base-paths integration: an
       * RSS <link> is an element, not an attribute, and a root-absolute path
       * resolved against `site` would replace the base rather than sit under it.
       *
       * And it is resolved to a full URL before @astrojs/rss sees it, because a
       * relative link is one the integration re-shapes: its `trailingSlash`
       * option defaults to true and appends a slash to every item link, and
       * setting it false strips one from every item link instead. Neither is
       * right for a feed that can carry both shapes — blog posts are directory
       * routes under both URL policies, and under 'preserve' a paper page is a
       * flat file whose address MUST NOT end in a slash. ardoco.de shipped that
       * exact bug: every link in its published feed 404ed, and nobody reading a
       * feed is looking at the site to notice. A full URL is passed through
       * untouched, so the shape is whatever paperPath() or permalink() said it
       * was — the same helpers every other link on the site uses.
       */
      link: new URL(`${base}${item.path}`, site).href,
      categories: item.categories,
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
};

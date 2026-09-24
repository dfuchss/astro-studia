import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../consts.ts';
import { publishedPosts, permalink } from '../lib/blog.ts';

/**
 * The blog feed, at /feed.xml.
 *
 * Drafts are excluded because publishedPosts() excludes them — the feed does
 * not filter again. A feed is the one surface where publishing something by
 * accident cannot be taken back: subscribers already have it.
 *
 * Delete this file along with the blog, and the <link rel="alternate"> in
 * BaseHead.astro and the Feed row in FOOTER_LINKS with it.
 */
export const GET: APIRoute = async (context) => {
  const posts = await publishedPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      // The base is applied here rather than by the base-paths integration:
      // an RSS <link> is an element, not an attribute, and this one is
      // resolved against `site` by @astrojs/rss — a root-absolute path would
      // replace the base rather than sit under it.
      link: `${import.meta.env.BASE_URL.replace(/\/$/, '')}${permalink(post.id)}`,
      categories: post.data.tags,
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
};

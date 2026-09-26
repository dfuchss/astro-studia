import { publishedPosts, permalink } from '../blog.ts';
import type { FeedItem } from './types.ts';

/**
 * Feed items from the blog. The default, and the obvious one for a personal
 * site: a post has a real date, so nothing has to be inferred.
 *
 * Drafts are absent because publishedPosts() excludes them, and the feed does
 * not filter again. A feed is the one surface where publishing by accident
 * cannot be undone — subscribers already have it.
 */
export async function feedItems(): Promise<FeedItem[]> {
  const posts = await publishedPosts();
  return posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    pubDate: post.data.date,
    path: permalink(post.id),
    categories: post.data.tags,
  }));
}

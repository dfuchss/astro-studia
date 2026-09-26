/**
 * What a feed source hands back.
 *
 * `path` is site-absolute and WITHOUT the base — src/pages/feed.xml.ts adds
 * that, because an RSS <link> is an element rather than an attribute and so is
 * out of reach of the base-paths integration.
 *
 * `pubDate` may be undefined. Omitting a date is honest; defaulting to the
 * epoch is not, and a reader will file the entry under 1970 and believe it.
 */
export type FeedItem = {
  title: string;
  description?: string;
  pubDate?: Date;
  path: string;
  categories?: string[];
};

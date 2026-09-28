/**
 * What a feed source hands back. `path` is site-absolute WITHOUT the base;
 * feed.xml.ts adds it, because an RSS <link> is an element, not an attribute,
 * and the base-paths integration cannot reach it. `pubDate` may be undefined:
 * defaulting to the epoch files the entry under 1970 in every reader.
 */
export type FeedItem = {
  title: string;
  description?: string;
  pubDate?: Date;
  path: string;
  categories?: string[];
};

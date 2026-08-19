export interface RawMention {
  external_id: string;
  source: string;
  title: string | null;
  content: string;
  url: string | null;
  author: string | null;
  published_at: string | number | null;
  engagement: string | number | null;
}

export interface NormalizedMention {
  externalId: string;

  source: string;
  sourceNormalized: string;

  title: string | null;
  content: string;
  contentText: string;

  url: string | null;
  canonicalUrl: string | null;

  author: string | null;

  publishedAt: Date | null;

  engagement: number | null;

  articleKey: string | null;
  mentionKey: string;
}

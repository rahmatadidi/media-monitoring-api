import type { PoolClient } from "pg";
import { NormalizedMention } from "./mention.type.js";

export async function upsertMention(
  client: PoolClient,
  mention: NormalizedMention,
): Promise<void> {
  await client.query(
    `
      INSERT INTO mentions (
        external_id,
        source,
        source_normalized,
        title,
        content,
        content_text,
        url,
        canonical_url,
        author,
        published_at,
        engagement,
        article_key,
        mention_key
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      )
      ON CONFLICT (mention_key)
      DO UPDATE SET
        title = COALESCE(EXCLUDED.title, mentions.title),
        content = EXCLUDED.content,
        content_text = EXCLUDED.content_text,
        author = COALESCE(EXCLUDED.author, mentions.author),
        published_at = COALESCE(
          EXCLUDED.published_at,
          mentions.published_at
        ),
        engagement = CASE
          WHEN EXCLUDED.engagement IS NULL
            THEN mentions.engagement
          WHEN mentions.engagement IS NULL
            THEN EXCLUDED.engagement
          ELSE GREATEST(
            mentions.engagement,
            EXCLUDED.engagement
          )
        END,
        updated_at = NOW()
    `,
    [
      mention.externalId,
      mention.source,
      mention.sourceNormalized,
      mention.title,
      mention.content,
      mention.contentText,
      mention.url,
      mention.canonicalUrl,
      mention.author,
      mention.publishedAt,
      mention.engagement,
      mention.articleKey,
      mention.mentionKey,
    ],
  );
}

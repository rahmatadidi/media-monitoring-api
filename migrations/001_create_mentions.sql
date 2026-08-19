CREATE TABLE IF NOT EXISTS mentions (
    id BIGSERIAL PRIMARY KEY,

    external_id TEXT NOT NULL,

    source TEXT NOT NULL,
    source_normalized TEXT NOT NULL,

    title TEXT,
    content TEXT NOT NULL,
    content_text TEXT,

    url TEXT,
    canonical_url TEXT,

    author TEXT,

    published_at TIMESTAMPTZ,

    engagement INTEGER,

    article_key TEXT,

    mention_key TEXT NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT mentions_engagement_non_negative
        CHECK (engagement IS NULL OR engagement >= 0)
);

CREATE INDEX IF NOT EXISTS idx_mentions_source
    ON mentions (source_normalized);

CREATE INDEX IF NOT EXISTS idx_mentions_published_at
    ON mentions (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentions_source_published_at
    ON mentions (source_normalized, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentions_article_key
    ON mentions (article_key);

CREATE INDEX IF NOT EXISTS idx_mentions_canonical_url
    ON mentions (canonical_url);
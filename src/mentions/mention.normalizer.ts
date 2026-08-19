import { createHash } from "node:crypto";
import { NormalizedMention, RawMention } from "./mention.type.js";

const SOURCE_ALIASES: Record<string, string> = {
  "the star": "the star",
  thestar: "the star",
  twitter: "twitter",
  instagram: "instagram",
  facebook: "facebook",
  malaysiakini: "malaysiakini",
  "new straits times": "new straits times",
};

export function normalizeSource(source: string): string {
  const normalized = source.trim().toLowerCase().replace(/\s+/g, " ");
  return SOURCE_ALIASES[normalized] ?? normalized;
}

export function normalizeTitle(title: string | null): string | null {
  if (title === null) {
    return null;
  }
  const normalized = title.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized || null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseEngagement(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parsePublishedAt(value: string | number | null): Date | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "number") {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const slashDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (slashDate) {
    const [, day, month, year] = slashDate;
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const isoLike = normalized.includes("T")
    ? normalized
    : normalized.replace(" ", "T");
  const date = new Date(isoLike);
  return Number.isNaN(date.getTime()) ? null : date;
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
]);

export function canonicalizeUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url.trim());
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    let result = parsed.toString();
    if (result.endsWith("/")) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return null;
  }
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createArticleKey(
  canonicalUrl: string | null,
  sourceNormalized: string,
  title: string | null,
  publishedAt: Date | null,
): string | null {
  if (canonicalUrl) {
    return sha256(canonicalUrl);
  }
  if (!title || !publishedAt) {
    return null;
  }
  const fingerprint = [sourceNormalized, title, publishedAt.toISOString()].join(
    "|",
  );
  return sha256(fingerprint);
}

export function createMentionKey(
  sourceNormalized: string,
  externalId: string,
): string {
  return sha256(`${sourceNormalized}|${externalId.trim()}`);
}

export function normalizeMention(mention: RawMention): NormalizedMention {
  const externalId = mention.external_id.trim();
  const sourceNormalized = normalizeSource(mention.source);
  const title = mention.title?.trim() || null;
  const content = mention.content.trim();
  const publishedAt = parsePublishedAt(mention.published_at);
  const engagement = parseEngagement(mention.engagement);
  const canonicalUrl = canonicalizeUrl(mention.url);

  const articleKey = createArticleKey(
    canonicalUrl,
    sourceNormalized,
    normalizeTitle(title),
    publishedAt,
  );

  const mentionKey = createMentionKey(sourceNormalized, externalId);

  return {
    externalId,
    source: mention.source,
    sourceNormalized,
    title,
    content,
    contentText: stripHtml(content),
    url: mention.url,
    canonicalUrl,
    author: mention.author,
    publishedAt,
    engagement,
    articleKey,
    mentionKey,
  };
}

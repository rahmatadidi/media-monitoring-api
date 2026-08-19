import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  normalizeSource,
  parseEngagement,
  parsePublishedAt,
  stripHtml,
} from "../mentions/mention.normalizer.js";

describe("normalizeSource", () => {
  it("normalizes source aliases", () => {
    expect(normalizeSource("The Star")).toBe("the star");
    expect(normalizeSource("thestar")).toBe("the star");
    expect(normalizeSource("TWITTER")).toBe("twitter");
    expect(normalizeSource("malaysiakini ")).toBe("malaysiakini");
  });
});

describe("parseEngagement", () => {
  it("parses comma-separated numbers", () => {
    expect(parseEngagement("1,204")).toBe(1204);
    expect(parseEngagement("3,402")).toBe(3402);
  });
});

describe("stripHtml", () => {
  it("removes HTML and scripts", () => {
    expect(stripHtml("<p>Hello&nbsp;world</p><script>alert(1)</script>")).toBe(
      "Hello world",
    );
  });
});

describe("canonicalizeUrl", () => {
  it("removes tracking parameters", () => {
    expect(
      canonicalizeUrl("https://Example.com/article/123/?utm_source=twitter"),
    ).toBe("https://example.com/article/123");
  });
});

describe("parsePublishedAt", () => {
  it("parses unix timestamps", () => {
    expect(parsePublishedAt(1786435200)?.toISOString()).toBe(
      "2026-08-11T08:00:00.000Z",
    );
  });

  it("parses DD/MM/YYYY", () => {
    expect(parsePublishedAt("11/08/2026")?.toISOString()).toBe(
      "2026-08-11T00:00:00.000Z",
    );
  });
});

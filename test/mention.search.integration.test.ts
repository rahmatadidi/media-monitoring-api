import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../src/app.js";
import { pool } from "../src/db/pool.js";
import { clearMentions } from "./test-db.js";

const seedPath = path.resolve(process.cwd(), "data/seed_mentions.json");

const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

async function seedDatabase() {
  const response = await request(app)
    .post("/internal/mentions/bulk")
    .send(seedData);

  expect(response.status).toBe(200);
  expect(response.body.inserted).toBe(14);
}

describe("GET /mentions", () => {
  beforeEach(async () => {
    await clearMentions();
    await seedDatabase();
  });

  it("returns maximum 5 items on the first page", async () => {
    const response = await request(app).get("/mentions");

    expect(response.status).toBe(200);

    expect(response.body.pagination).toEqual({
      page: 1,
      page_size: 5,
      total: 14,
      total_pages: 3,
    });

    expect(response.body.data).toHaveLength(5);
  });

  it("returns the second page correctly", async () => {
    const response = await request(app).get("/mentions?page=2");

    expect(response.status).toBe(200);

    expect(response.body.pagination).toEqual({
      page: 2,
      page_size: 5,
      total: 14,
      total_pages: 3,
    });

    expect(response.body.data).toHaveLength(5);
  });

  it("returns 4 items on the last page", async () => {
    const response = await request(app).get("/mentions?page=3");

    expect(response.status).toBe(200);

    expect(response.body.pagination).toEqual({
      page: 3,
      page_size: 5,
      total: 14,
      total_pages: 3,
    });

    expect(response.body.data).toHaveLength(4);
  });

  it("searches title and content with q", async () => {
    const response = await request(app)
      .get("/mentions")
      .query({ q: "ringgit" });

    expect(response.status).toBe(200);

    expect(response.body.pagination.total).toBe(2);

    expect(response.body.data).toHaveLength(2);

    for (const mention of response.body.data) {
      const searchableText = [mention.title ?? "", mention.content_text ?? ""]
        .join(" ")
        .toLowerCase();

      expect(searchableText).toContain("ringgit");
    }
  });

  it("filters by normalized source", async () => {
    const response = await request(app)
      .get("/mentions")
      .query({ source: "the star" });

    expect(response.status).toBe(200);

    expect(response.body.pagination.total).toBe(4);

    for (const mention of response.body.data) {
      expect(mention.source_normalized).toBe("the star");
    }
  });

  it("filters by published date range", async () => {
    const response = await request(app).get("/mentions").query({
      from: "2026-08-13",
      to: "2026-08-16",
    });

    expect(response.status).toBe(200);

    expect(response.body.pagination.total).toBe(6);

    expect(response.body.data).toHaveLength(5);

    for (const mention of response.body.data) {
      const publishedAt = new Date(mention.published_at);

      expect(publishedAt >= new Date("2026-08-13T00:00:00Z")).toBe(true);

      expect(publishedAt < new Date("2026-08-16T00:00:00Z")).toBe(true);
    }
  });

  it("combines multiple filters", async () => {
    const response = await request(app).get("/mentions").query({
      q: "flood",
      source: "new straits times",
    });

    expect(response.status).toBe(200);

    expect(response.body.pagination.total).toBe(1);

    expect(response.body.data).toHaveLength(1);

    expect(response.body.data[0].external_id).toBe("nst-40130");
  });

  it("rejects invalid page numbers", async () => {
    const response = await request(app).get("/mentions").query({ page: 0 });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: "page must be a positive integer",
    });
  });

  it("returns mentions in stable published_at descending order", async () => {
    const response = await request(app).get("/mentions");

    expect(response.status).toBe(200);

    const data = response.body.data;

    for (let i = 1; i < data.length; i++) {
      const previous = data[i - 1].published_at;
      const current = data[i].published_at;

      if (previous === null) {
        expect(current).toBeNull();
        continue;
      }

      if (current === null) {
        continue;
      }

      expect(new Date(previous).getTime()).toBeGreaterThanOrEqual(
        new Date(current).getTime(),
      );
    }
  });

  it("returns an empty data array when page exceeds the last page", async () => {
    const response = await request(app).get("/mentions?page=4");

    expect(response.status).toBe(200);

    expect(response.body.pagination).toEqual({
      page: 4,
      page_size: 5,
      total: 14,
      total_pages: 3,
    });

    expect(response.body.data).toEqual([]);
  });
});

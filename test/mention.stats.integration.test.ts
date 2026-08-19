import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import app from "../src/app.js";
import { clearMentions } from "./test-db.js";

const seedPath = path.resolve(process.cwd(), "data/seed_mentions.json");
const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

describe("GET /mentions/stats", () => {
  beforeEach(async () => {
    await clearMentions();
  });

  async function seedDatabase() {
    const response = await request(app)
      .post("/internal/mentions/bulk")
      .send(seedData);

    expect(response.status).toBe(200);
    expect(response.body.inserted).toBe(14);
  }

  it("groups mentions by normalized source", async () => {
    await seedDatabase();

    const response = await request(app)
      .get("/mentions/stats")
      .query({ group_by: "source" });

    expect(response.status).toBe(200);
    expect(response.body.group_by).toBe("source");
    expect(response.body.data.length).toBeGreaterThan(0);

    for (const row of response.body.data) {
      expect(row).toEqual(
        expect.objectContaining({
          group: expect.any(String),
          count: expect.any(Number),
        }),
      );
    }
  });

  it("groups dated mentions by day", async () => {
    await seedDatabase();

    const response = await request(app)
      .get("/mentions/stats")
      .query({ group_by: "day" });

    expect(response.status).toBe(200);
    expect(response.body.group_by).toBe("day");
    expect(response.body.data.length).toBeGreaterThan(0);

    for (const row of response.body.data) {
      expect(row.group).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.count).toEqual(expect.any(Number));
    }
  });

  it("rejects an unsupported group_by value", async () => {
    const response = await request(app)
      .get("/mentions/stats")
      .query({ group_by: "invalid" });

    expect(response.status).toBe(400);
  });

  it("returns empty data when there are no mentions", async () => {
    const response = await request(app)
      .get("/mentions/stats")
      .query({ group_by: "source" });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      group_by: "source",
      data: [],
    });
  });
});

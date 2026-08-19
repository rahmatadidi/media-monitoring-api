import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { pool } from "../src/db/pool.js";

import { clearMentions, countMentions } from "./test-db.js";

const seedPath = path.resolve(process.cwd(), "data/seed_mentions.json");

const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

describe("POST /internal/mentions/bulk", () => {
  beforeEach(async () => {
    await clearMentions();
  });

  it("ingests all seed mentions", async () => {
    const response = await request(app)
      .post("/internal/mentions/bulk")
      .send(seedData);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      received: 15,
      inserted: 14,
      duplicates: 1,
    });

    const total = await countMentions();

    expect(total).toBe(14);
  });

  it("is idempotent when the same file is submitted twice", async () => {
    const firstResponse = await request(app)
      .post("/internal/mentions/bulk")
      .send(seedData);

    console.log("FIRST:", firstResponse.body);

    const countAfterFirstRequest = await countMentions();

    console.log("COUNT AFTER FIRST:", countAfterFirstRequest);

    const secondResponse = await request(app)
      .post("/internal/mentions/bulk")
      .send(seedData);

    console.log("SECOND:", secondResponse.body);

    const countAfterSecondRequest = await countMentions();

    console.log("COUNT AFTER SECOND:", countAfterSecondRequest);

    expect(firstResponse.body).toEqual({
      received: 15,
      inserted: 14,
      duplicates: 1,
    });

    expect(countAfterFirstRequest).toBe(14);

    expect(secondResponse.body).toEqual({
      received: 15,
      inserted: 0,
      duplicates: 15,
    });

    expect(countAfterSecondRequest).toBe(14);
  });

  it("deduplicates records with the same source and external_id", async () => {
    const response = await request(app)
      .post("/internal/mentions/bulk")
      .send([seedData[0], seedData[1]]);

    expect(response.status).toBe(200);

    const total = await countMentions();

    expect(total).toBe(1);
  });
  it("does not deduplicate different external mentions just because the URL is the same", async () => {
    const response = await request(app)
      .post("/internal/mentions/bulk")
      .send([seedData[0], seedData[2]]);

    expect(response.status).toBe(200);

    const total = await countMentions();

    expect(total).toBe(2);
  });
});

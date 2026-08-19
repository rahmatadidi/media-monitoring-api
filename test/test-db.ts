import { pool } from "../src/db/pool.js";

export async function clearMentions() {
  await pool.query("TRUNCATE TABLE mentions RESTART IDENTITY CASCADE");
}

export async function countMentions() {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM mentions",
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Count query returned no rows");
  }

  return Number(row.count);
}

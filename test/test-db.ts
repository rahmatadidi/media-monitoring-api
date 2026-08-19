import { pool } from "../src/db/pool.js";

export async function clearMentions(): Promise<void> {
  await pool.query("TRUNCATE TABLE mentions RESTART IDENTITY");
}

export async function countMentions(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM mentions",
  );

  return Number(result.rows[0].count);
}

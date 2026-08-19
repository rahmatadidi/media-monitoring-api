import { pool } from "../db/pool.js";

export type StatsGroupBy = "source" | "day";

export interface MentionStatsRow {
  group: string;
  count: number;
}

export async function getMentionStats(
  groupBy: StatsGroupBy,
): Promise<MentionStatsRow[]> {
  if (groupBy === "source") {
    const result = await pool.query<{
      group: string;
      count: string;
    }>(`
      SELECT
        source_normalized AS group,
        COUNT(*)::text AS count
      FROM mentions
      WHERE source_normalized IS NOT NULL
        AND source_normalized <> ''
      GROUP BY source_normalized
      ORDER BY COUNT(*) DESC, source_normalized ASC
    `);

    return result.rows.map((row) => ({
      group: row.group,
      count: Number(row.count),
    }));
  }

  const result = await pool.query<{
    group: string;
    count: string;
  }>(`
    SELECT
      published_at::date::text AS group,
      COUNT(*)::text AS count
    FROM mentions
    WHERE published_at IS NOT NULL
    GROUP BY published_at::date
    ORDER BY published_at::date ASC
  `);

  return result.rows.map((row) => ({
    group: row.group,
    count: Number(row.count),
  }));
}

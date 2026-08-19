import { pool } from "../db/pool.js";
export interface SearchMentionsFilters {
  q?: string;
  source?: string;
  from?: Date;
  to?: Date;
}

export interface SearchMentionsParams extends SearchMentionsFilters {
  limit: number;
  offset: number;
}

interface QueryParts {
  whereClause: string;
  values: unknown[];
}

function buildQueryParts(params: SearchMentionsParams): QueryParts {
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.q) {
    values.push(`%${params.q}%`);

    conditions.push(`
      (
        title ILIKE $${values.length}
        OR content_text ILIKE $${values.length}
      )
    `);
  }

  if (params.source) {
    values.push(params.source.trim().toLowerCase());

    conditions.push(`source_normalized = $${values.length}`);
  }

  if (params.from) {
    values.push(params.from);

    conditions.push(`published_at >= $${values.length}`);
  }

  if (params.to) {
    values.push(params.to);

    conditions.push(`published_at < $${values.length}`);
  }

  return {
    whereClause:
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

export async function searchMentions(params: SearchMentionsParams) {
  const { whereClause, values } = buildQueryParts(params);

  const limitParam = values.length + 1;
  values.push(params.limit);

  const offsetParam = values.length + 1;
  values.push(params.offset);

  const result = await pool.query(
    `
      SELECT
        id,
        external_id,
        source,
        source_normalized,
        title,
        content_text,
        url,
        author,
        published_at,
        engagement
      FROM mentions
      ${whereClause}
      ORDER BY
        published_at DESC NULLS LAST,
        id DESC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `,
    values,
  );

  return result.rows;
}

export async function countMentions(
  params: SearchMentionsFilters,
): Promise<number> {
  const { whereClause, values } = buildQueryParts({
    ...params,
    limit: 0,
    offset: 0,
  });

  const result = await pool.query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM mentions
    ${whereClause}
  `,
    values,
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Count query returned no rows");
  }

  return Number(row.count);
}

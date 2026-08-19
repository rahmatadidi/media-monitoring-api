import { pool } from "../db/pool.js";
import { normalizeMention } from "./mention.normalizer.js";
import { upsertMention } from "./mention.repository.js";
import { RawMention } from "./mention.type.js";

export interface IngestResult {
  received: number;
  inserted: number;
  duplicates: number;
}

export async function ingestMentions(
  records: RawMention[],
): Promise<IngestResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let inserted = 0;
    let duplicates = 0;

    for (const record of records) {
      const mention = normalizeMention(record);

      const wasInserted = await upsertMention(client, mention);

      if (wasInserted) {
        inserted++;
      } else {
        duplicates++;
      }
    }

    await client.query("COMMIT");

    return {
      received: records.length,
      inserted,
      duplicates,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

import { pool } from "../db/pool.js";
import { normalizeMention } from "./mention.normalizer.js";
import { upsertMention } from "./mention.repository.js";
import { RawMention } from "./mention.type.js";

export async function ingestMentions(records: RawMention[]): Promise<number> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const record of records) {
      const mention = normalizeMention(record);
      await upsertMention(client, mention);
    }
    await client.query("COMMIT");
    return records.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

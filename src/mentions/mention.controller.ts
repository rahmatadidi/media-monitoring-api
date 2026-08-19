import type { Request, Response } from "express";
import { ingestMentions } from "./mention.service.js";
import { RawMention } from "./mention.type.js";

export async function bulkIngest(req: Request, res: Response): Promise<void> {
  const records = req.body;

  if (!Array.isArray(records)) {
    res.status(400).json({
      error: "Request body must be an array",
    });
    return;
  }

  if (records.length === 0) {
    res.status(400).json({
      error: "Request body must not be empty",
    });
    return;
  }

  try {
    const processed = await ingestMentions(records as RawMention[]);

    res.status(200).json({
      received: records.length,
      processed,
    });
  } catch (error) {
    console.error("Bulk ingestion failed:", error);

    res.status(500).json({
      error: "Failed to ingest mentions",
    });
  }
}

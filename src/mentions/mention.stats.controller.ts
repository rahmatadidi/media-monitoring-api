import type { Request, Response } from "express";
import { getMentionStats, StatsGroupBy } from "./mention.stats.repository.js";

export async function mentionStatsController(
  req: Request,
  res: Response,
): Promise<void> {
  const groupBy = req.query.group_by;

  if (groupBy !== "source" && groupBy !== "day") {
    res.status(400).json({
      error: "group_by must be either source or day",
    });
    return;
  }

  try {
    const data = await getMentionStats(groupBy as StatsGroupBy);

    res.status(200).json({
      group_by: groupBy,
      data,
    });
  } catch (error) {
    console.error("Failed to get mention stats:", error);

    res.status(500).json({
      error: "Failed to get mention stats",
    });
  }
}

import type { Request, Response } from "express";

import { getMentions } from "./mention.search.service.js";

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export async function searchMentionsController(
  req: Request,
  res: Response,
): Promise<void> {
  const pageParam = Number(req.query.page ?? 1);

  if (!Number.isInteger(pageParam) || pageParam < 1) {
    res.status(400).json({
      error: "page must be a positive integer",
    });
    return;
  }

  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);

  if (req.query.from !== undefined && from === undefined) {
    res.status(400).json({
      error: "Invalid from date",
    });
    return;
  }

  if (req.query.to !== undefined && to === undefined) {
    res.status(400).json({
      error: "Invalid to date",
    });
    return;
  }

  if (from && to && from >= to) {
    res.status(400).json({
      error: "from must be earlier than to",
    });
    return;
  }

  try {
    const result = await getMentions({
      q: typeof req.query.q === "string" ? req.query.q.trim() : undefined,

      source:
        typeof req.query.source === "string"
          ? req.query.source.trim().toLowerCase()
          : undefined,

      from,
      to,
      page: pageParam,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to search mentions:", error);

    res.status(500).json({
      error: "Failed to search mentions",
    });
  }
}

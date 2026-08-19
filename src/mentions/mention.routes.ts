import { Router } from "express";
import { bulkIngest } from "./mention.controller.js";
import { searchMentionsController } from "./mention.search.controller.js";
import { mentionStatsController } from "./mention.stats.controller.js";

const router = Router();

router.post("/internal/mentions/bulk", bulkIngest);
router.get("/mentions", searchMentionsController);
router.get("/mentions/stats", mentionStatsController);

export default router;

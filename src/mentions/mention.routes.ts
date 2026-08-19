import { Router } from "express";
import { bulkIngest } from "./mention.controller.js";
import { searchMentionsController } from "./mention.search.controller.js";

const router = Router();

router.post("/internal/mentions/bulk", bulkIngest);
router.get("/mentions", searchMentionsController);

export default router;

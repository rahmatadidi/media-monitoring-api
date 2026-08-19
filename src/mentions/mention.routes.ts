import { Router } from "express";
import { bulkIngest } from "./mention.controller.js";

const router = Router();

router.post("/internal/mentions/bulk", bulkIngest);

export default router;

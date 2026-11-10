import { Router } from "express";
import {
  cancelAction,
  chat,
  confirmAction,
  history,
} from "../controllers/ai.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { chatSchema } from "../schemas/ai.schema.js";

const router = Router();

router.use(requireAuth, requireRole("CUSTOMER"));

router.post("/chat", validate(chatSchema), chat);
router.get("/history", history);
router.post("/actions/:id/confirm", confirmAction);
router.post("/actions/:id/cancel", cancelAction);

export default router;

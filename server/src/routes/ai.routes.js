import { Router } from "express";
import {
  cancelAction,
  chat,
  confirmAction,
  history,
  transcribe,
} from "../controllers/ai.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audioUpload } from "../middleware/audio-upload.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { chatSchema } from "../schemas/ai.schema.js";

const router = Router();

router.use(requireAuth, requireRole("CUSTOMER"));

const aiRateLimit = rateLimit({ max: 30, windowMs: 60 * 1000 });

router.post("/transcribe", aiRateLimit, audioUpload, transcribe);
router.post("/chat", aiRateLimit, validate(chatSchema), chat);
router.get("/history", history);
router.post("/actions/:id/confirm", confirmAction);
router.post("/actions/:id/cancel", cancelAction);

export default router;

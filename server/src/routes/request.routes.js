import { Router } from "express";
import {
  accept,
  cancel,
  confirm,
  create,
  decline,
  getMine,
  listMine,
} from "../controllers/request.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { requestCreateSchema } from "../schemas/request.schema.js";

const router = Router();

router.use(requireAuth, requireRole("CUSTOMER"));

router.post("/", validate(requestCreateSchema), create);
router.get("/", listMine);
router.get("/:id", getMine);
router.post("/:id/accept-proposal", accept);
router.post("/:id/decline-proposal", decline);
router.post("/:id/cancel", cancel);
router.post("/:id/confirm-receipt", confirm);

export default router;

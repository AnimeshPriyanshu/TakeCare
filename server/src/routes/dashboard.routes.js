import { Router } from "express";
import {
  customerDashboard,
  pharmacistDashboard,
} from "../controllers/dashboard.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get(
  "/customer",
  requireAuth,
  requireRole("CUSTOMER"),
  customerDashboard,
);
router.get(
  "/pharmacist",
  requireAuth,
  requireRole("PHARMACIST"),
  pharmacistDashboard,
);

export default router;

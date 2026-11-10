import { Router } from "express";
import {
  getDirectoryPharmacy,
  listDirectory,
} from "../controllers/pharmacy.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listDirectory);
router.get("/:id", getDirectoryPharmacy);

export default router;

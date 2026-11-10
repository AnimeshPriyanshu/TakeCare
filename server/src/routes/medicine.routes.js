import { Router } from "express";
import {
  addTransaction,
  createMedicine,
  deactivateMedicine,
  getHistory,
  getMedicine,
  listMedicines,
  reactivateMedicine,
  updateMedicine,
} from "../controllers/medicine.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  medicineCreateSchema,
  medicineUpdateSchema,
  transactionSchema,
} from "../schemas/medicine.schema.js";

const router = Router();

router.use(requireAuth, requireRole("CUSTOMER"));

router.get("/", listMedicines);
router.post("/", validate(medicineCreateSchema), createMedicine);
router.get("/:id", getMedicine);
router.patch("/:id", validate(medicineUpdateSchema), updateMedicine);
router.post("/:id/deactivate", deactivateMedicine);
router.post("/:id/reactivate", reactivateMedicine);
router.post("/:id/transactions", validate(transactionSchema), addTransaction);
router.get("/:id/history", getHistory);

export default router;

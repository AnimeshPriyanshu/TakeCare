import { Router } from "express";
import {
  createFamilyMember,
  deleteFamilyMember,
  listFamilyMembers,
} from "../controllers/family.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { familyMemberSchema } from "../schemas/medicine.schema.js";

const router = Router();

router.use(requireAuth, requireRole("CUSTOMER"));

router.get("/", listFamilyMembers);
router.post("/", validate(familyMemberSchema), createFamilyMember);
router.delete("/:id", deleteFamilyMember);

export default router;

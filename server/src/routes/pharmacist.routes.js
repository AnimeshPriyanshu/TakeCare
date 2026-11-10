import { Router } from "express";
import {
  createCatalogItem,
  deleteCatalogItem,
  getMyPharmacy,
  listCatalog,
  updateCatalogItem,
  upsertMyPharmacy,
} from "../controllers/pharmacy.controller.js";
import {
  fulfill,
  listForPharmacy,
  respond,
} from "../controllers/request.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { pharmacyUpdateSchema } from "../schemas/auth.schema.js";
import {
  catalogItemCreateSchema,
  catalogItemUpdateSchema,
} from "../schemas/pharmacy.schema.js";
import { requestRespondSchema } from "../schemas/request.schema.js";

const router = Router();

router.use(requireAuth, requireRole("PHARMACIST"));

router.get("/me", getMyPharmacy);
router.put("/me", validate(pharmacyUpdateSchema), upsertMyPharmacy);

router.get("/catalog", listCatalog);
router.post("/catalog", validate(catalogItemCreateSchema), createCatalogItem);
router.patch("/catalog/:id", validate(catalogItemUpdateSchema), updateCatalogItem);
router.delete("/catalog/:id", deleteCatalogItem);

router.get("/requests", listForPharmacy);
router.post("/requests/:id/respond", validate(requestRespondSchema), respond);
router.post("/requests/:id/fulfill", fulfill);

export default router;

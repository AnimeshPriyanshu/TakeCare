import { Router } from "express";
import authRoutes from "./auth.routes.js";
import medicineRoutes from "./medicine.routes.js";
import familyRoutes from "./family.routes.js";
import pharmacyRoutes from "./pharmacy.routes.js";
import pharmacistRoutes from "./pharmacist.routes.js";
import requestRoutes from "./request.routes.js";
import notificationRoutes from "./notification.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import aiRoutes from "./ai.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/medicines", medicineRoutes);
router.use("/family-members", familyRoutes);
router.use("/pharmacies", pharmacyRoutes);
router.use("/pharmacist", pharmacistRoutes);
router.use("/pharmacy", pharmacistRoutes);
router.use("/requests", requestRoutes);
router.use("/notifications", notificationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/ai", aiRoutes);

export default router;

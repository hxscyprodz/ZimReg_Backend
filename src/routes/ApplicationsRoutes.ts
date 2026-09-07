import ApplicationsControllers from "../controllers/ApplicationsControllers";
import { Router } from "express";

const router = Router();

router.get("/tracking/:trackingId", ApplicationsControllers.trackApplication);
router.get("/id/:id", ApplicationsControllers.getNationalIdApplication);
router.get(
  "/birth/:id",
  ApplicationsControllers.getBirthCertificateApplication,
);
router.post("/id", ApplicationsControllers.nationalIdApplication);
router.post("/birth", ApplicationsControllers.birthCertificateApplication);

export default router;

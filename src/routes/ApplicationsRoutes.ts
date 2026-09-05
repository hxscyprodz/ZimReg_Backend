import ApplicationsControllers from "../controllers/ApplicationsControllers";
import { Router } from "express";

const router = Router();

router.get("/tracking/:trackingId", ApplicationsControllers.trackApplication);
router.get("/id/:id", ApplicationsControllers.getNationalIdApplication);
router.post("/id", ApplicationsControllers.nationalIdApplication);

export default router;

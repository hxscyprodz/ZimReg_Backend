import ApplicationsControllers from "../controllers/ApplicationsControllers";
import { Router } from "express";

const router = Router();

router.get("/tracking/:trackingId", ApplicationsControllers.trackApplication);
router.post("/id", ApplicationsControllers.nationalIdApplication);

export default router;

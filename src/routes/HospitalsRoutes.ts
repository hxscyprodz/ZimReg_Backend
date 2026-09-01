import { Router } from "express";
import HospitalsControllers from "../controllers/HospitalsControllers";

const router = Router();

router.post("/", HospitalsControllers.createHospital);
router.get("/:id", HospitalsControllers.getHospital);
router.get("/", HospitalsControllers.getHospitals);
router.put("/:id", HospitalsControllers.updateHospital);
router.delete("/:id", HospitalsControllers.deleteHospital);

export default router;

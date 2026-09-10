import { Router } from "express";
import HospitalsControllers from "../controllers/HospitalsControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.post(
  "/",
  Authorize("hospital:create"),
  HospitalsControllers.createHospital,
);
router.get(
  "/:id",
  Authorize("hospital:read"),
  HospitalsControllers.getHospital,
);
router.get("/", Authorize("hospital:read"), HospitalsControllers.getHospitals);
router.put(
  "/:id",
  Authorize("hospital:update"),
  HospitalsControllers.updateHospital,
);
router.delete(
  "/:id",
  Authorize("hospital:delete"),
  HospitalsControllers.deleteHospital,
);

export default router;

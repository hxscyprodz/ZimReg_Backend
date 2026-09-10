import ApplicationsControllers from "../controllers/ApplicationsControllers";
import { Router } from "express";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.get(
  "/tracking/:trackingId",
  Authorize("application:tracking"),
  ApplicationsControllers.trackApplication,
);
router.get(
  "/id/:id",
  Authorize("application:read"),
  ApplicationsControllers.getNationalIdApplication,
);
router.get(
  "/birth/:id",
  Authorize("application:read"),
  ApplicationsControllers.getBirthCertificateApplication,
);
router.post(
  "/id",
  Authorize("application:create"),
  ApplicationsControllers.nationalIdApplication,
);
router.post(
  "/birth",
  Authorize("application:create"),
  ApplicationsControllers.birthCertificateApplication,
);

export default router;

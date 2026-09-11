import { Router } from "express";
import StationApplicationsControllers from "../controllers/StationAppsControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.get(
  "/",
  Authorize("application:read"),
  StationApplicationsControllers.getStationApplications,
);
router.post(
  "/reject/:id",
  Authorize("application:reject"),
  StationApplicationsControllers.rejectApplication,
);
router.post(
  "/approve/:id",
  Authorize("application:approve"),
  StationApplicationsControllers.approveApplication,
);

export default router;

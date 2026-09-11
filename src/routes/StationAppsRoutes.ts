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
  "/:id",
  Authorize("application:reject"),
  StationApplicationsControllers.rejectApplication,
);

export default router;

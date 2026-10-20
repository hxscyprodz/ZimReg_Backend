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
router.get(
  "/approved",
  Authorize("application:read"),
  StationApplicationsControllers.getApprovedApplications,
);
router.get(
  "/appointments",
  Authorize("appointment:read"),
  StationApplicationsControllers.getStationAppointments,
);
router.get(
  "/:id",
  Authorize("application:read"),
  StationApplicationsControllers.getApplicationDetails,
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
router.get(
  "/print/:id",
  Authorize("application:read"),
  StationApplicationsControllers.getPrintingApplication,
);

export default router;

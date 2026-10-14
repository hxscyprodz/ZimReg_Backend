import { Router } from "express";
import StationStatisticsControllers from "../controllers/StationStatisticsControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.get(
  "/statistics",
  Authorize("station:read"),
  StationStatisticsControllers.getStationStatistics,
);

export default router;

import { Router } from "express";
import StationsControllers from "../controllers/StationsControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.post(
  "/",
  Authorize("station:create"),
  StationsControllers.createStation,
);
router.get("/:id", Authorize("station:read"), StationsControllers.getStation);
router.get("/", StationsControllers.getStations);
router.put(
  "/:id",
  Authorize("station:update"),
  StationsControllers.updateStation,
);
router.delete(
  "/:id",
  Authorize("station:delete"),
  StationsControllers.deleteStation,
);

export default router;

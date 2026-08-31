import { Router } from "express";
import StationsControllers from "../controllers/StationsControllers";

const router = Router();

router.post("/", StationsControllers.createStation);
router.get("/:id", StationsControllers.getStation);
router.get("/", StationsControllers.getStations);
router.put("/:id", StationsControllers.updateStation);
router.delete("/:id", StationsControllers.deleteStation);

export default router;

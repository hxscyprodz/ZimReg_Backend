import { Router } from "express";
import DistrictsControllers from "../controllers/Districts.controllers";

const router = Router();

router.post("/", DistrictsControllers.createDistrict);
router.get("/:id", DistrictsControllers.getDistrict);
router.get("/", DistrictsControllers.getDistricts);
router.put("/:id", DistrictsControllers.updateDistrict);
router.delete("/:id", DistrictsControllers.deleteDistrict);

export default router;

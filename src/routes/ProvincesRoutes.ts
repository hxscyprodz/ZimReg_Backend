import { Router } from "express";
import ProvincesControllers from "../controllers/ProvincesControllers";

const router = Router();

router.post("/", ProvincesControllers.createProvince);
router.get("/:id", ProvincesControllers.getProvince);
router.get("/", ProvincesControllers.getProvinces);
router.put("/:id", ProvincesControllers.updateProvince);
router.delete("/:id", ProvincesControllers.deleteProvince);

export default router;

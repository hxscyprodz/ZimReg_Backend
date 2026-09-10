import { Router } from "express";
import DistrictsControllers from "../controllers/DistrictsControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.post(
  "/",
  Authorize("district:create"),
  DistrictsControllers.createDistrict,
);
router.get(
  "/:id",
  Authorize("district:read"),
  DistrictsControllers.getDistrict,
);
router.get("/", Authorize("district:read"), DistrictsControllers.getDistricts);
router.put(
  "/:id",
  Authorize("district:update"),
  DistrictsControllers.updateDistrict,
);
router.delete(
  "/:id",
  Authorize("district:delete"),
  DistrictsControllers.deleteDistrict,
);

export default router;

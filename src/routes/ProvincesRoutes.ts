import { Router } from "express";
import ProvincesControllers from "../controllers/ProvincesControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.post(
  "/",
  Authorize("province:create"),
  ProvincesControllers.createProvince,
);
router.get(
  "/:id",
  Authorize("province:read"),
  ProvincesControllers.getProvince,
);
router.get("/", Authorize("province:read"), ProvincesControllers.getProvinces);
router.put(
  "/:id",
  Authorize("province:update"),
  ProvincesControllers.updateProvince,
);
router.delete(
  "/:id",
  Authorize("province:delete"),
  ProvincesControllers.deleteProvince,
);

export default router;

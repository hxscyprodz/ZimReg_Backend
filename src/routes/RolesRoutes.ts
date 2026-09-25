import { Router } from "express";
import RolesControllers from "../controllers/RolesControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.get("/", Authorize("role:read"), RolesControllers.getRoles);

export default router;

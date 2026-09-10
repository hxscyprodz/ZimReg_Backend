import { Router } from "express";
import StaffControllers from "../controllers/StaffControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.post("/", Authorize("staff:create"), StaffControllers.createStaffMember);

export default router;

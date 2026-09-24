import { Router } from "express";
import StaffControllers from "../controllers/StaffControllers";
import Authenticate from "../middlewares/Auth";
import Authorize from "../middlewares/Authorization";

const router = Router();
router.use(Authenticate);

router.post("/", Authorize("staff:create"), StaffControllers.createStaffMember);
router.get("/", Authorize("staff:read"), StaffControllers.getStaffMembers);
router.get("/:id", Authorize("staff:read"), StaffControllers.getStaffMember);
router.put(
  "/:id",
  Authorize("staff:update"),
  StaffControllers.updateStaffMember,
);

export default router;

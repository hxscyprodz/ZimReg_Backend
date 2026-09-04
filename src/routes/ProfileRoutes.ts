import ProfileControllers from "../controllers/ProfileControllers";
import { Router } from "express";

const router = Router();

router.get("/", ProfileControllers.getProfile);
router.put("/", ProfileControllers.updateProfile);

export default router;

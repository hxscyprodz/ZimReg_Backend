import ApplicationsControllers from "../controllers/ApplicationsControllers";
import { Router } from "express";

const router = Router();

router.post("/id", ApplicationsControllers.nationalIdApplication);

export default router;

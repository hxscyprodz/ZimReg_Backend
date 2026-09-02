import { Router } from "express";
import AuthControllers from "../controllers/AuthControllers";

const router = Router();

router.post("/register", AuthControllers.registerUser);
router.post("/login", AuthControllers.loginUser);

export default router;

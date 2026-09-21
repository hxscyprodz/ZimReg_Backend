import { Router } from "express";
import AuthControllers from "../controllers/AuthControllers";
import Authenticate from "../middlewares/Auth";

const router = Router();

router.post("/register", AuthControllers.registerUser);
router.post("/login", AuthControllers.loginUser);
router.post("/logout", Authenticate, AuthControllers.logoutUser);

export default router;

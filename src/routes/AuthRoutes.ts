import { Router } from "express";
import AuthControllers from "../controllers/AuthControllers";
import Authenticate from "../middlewares/RefreshTokenAuth";

const router = Router();

router.post("/register", AuthControllers.registerUser);
router.post("/login", AuthControllers.loginUser);
router.post("/logout", Authenticate, AuthControllers.logoutUser);
router.post("/refresh", Authenticate, AuthControllers.refreshToken);

export default router;

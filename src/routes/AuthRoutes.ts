import { Router } from "express";
import AuthControllers from "../controllers/AuthControllers";
import Authenticate from "../middlewares/RefreshTokenAuth";

const router = Router();

router.post("/register", AuthControllers.registerUser);
router.post("/login", AuthControllers.loginUser);
router.post(
  "/request-phone-number-verification",
  Authenticate,
  AuthControllers.requestPhoneNumberVerification,
);
router.post(
  "/verify-phone-number",
  Authenticate,
  AuthControllers.verifyPhoneNumber,
);
router.post("/logout", Authenticate, AuthControllers.logoutUser);
router.post("/refresh", Authenticate, AuthControllers.refreshToken);

export default router;

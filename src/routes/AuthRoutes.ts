import { Router } from "express";
import AuthControllers from "../controllers/AuthControllers";

const router = Router();

router.post("/register", AuthControllers.registerUser);

export default router;

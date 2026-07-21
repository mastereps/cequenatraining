import express from "express";
import {
  getAuthSessionController,
  loginUserController,
  logoutUserController,
  registerUserController,
} from "../controllers/authController.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.get("/me", getAuthSessionController);
router.post("/register", registerLimiter, registerUserController);
router.post("/login", loginLimiter, loginUserController);
router.post("/logout", logoutUserController);

export default router;

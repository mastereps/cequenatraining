import express from "express";
import {
  getAuthSessionController,
  loginUserController,
  logoutUserController,
  registerUserController,
} from "../controllers/authController.js";

const router = express.Router();

router.get("/me", getAuthSessionController);
router.post("/register", registerUserController);
router.post("/login", loginUserController);
router.post("/logout", logoutUserController);

export default router;

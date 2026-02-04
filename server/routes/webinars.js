import express from "express";
import {
  getWebinarBySlugController,
  listWebinarsController,
  registerForWebinarController,
  resendConfirmationController,
  verifyRegistrationController,
} from "../controllers/webinarController.js";

const router = express.Router();

router.get("/webinars", listWebinarsController);
router.get("/webinars/:slug", getWebinarBySlugController);
router.post("/webinars/:slug/register", registerForWebinarController);
router.get("/verify", verifyRegistrationController);
router.post("/webinars/:slug/resend-confirmation", resendConfirmationController);

export default router;

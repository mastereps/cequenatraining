import express from "express";
import {
  approvePaymentProofController,
  createWebinarPaymentSessionController,
  getRegistrationStatusController,
  getWebinarBySlugController,
  listPaymentProofsController,
  listWebinarsController,
  rejectPaymentProofController,
  registerForWebinarController,
  resendConfirmationController,
  sendZoomLinksController,
  submitPaymentProofController,
  verifyRegistrationController,
} from "../controllers/webinarController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/webinars", listWebinarsController);
router.get("/webinars/:slug", getWebinarBySlugController);
router.get("/webinars/:slug/registration-status", getRegistrationStatusController);
router.post("/webinars/:slug/register", registerForWebinarController);
router.post("/webinars/:slug/payment-session", createWebinarPaymentSessionController);
router.post("/webinars/:slug/payment-proof", submitPaymentProofController);
router.get("/webinars/:slug/payment-proofs", requireAdmin, listPaymentProofsController);
router.post("/webinars/:slug/payment-approve", requireAdmin, approvePaymentProofController);
router.post("/webinars/:slug/payment-reject", requireAdmin, rejectPaymentProofController);
router.post("/webinars/:slug/send-zoom-links", requireAdmin, sendZoomLinksController);
router.get("/verify", verifyRegistrationController);
router.post("/webinars/:slug/resend-confirmation", resendConfirmationController);

export default router;

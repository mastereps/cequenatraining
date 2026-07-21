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
import {
  archiveWebinarController,
  createWebinarController,
  listAdminWebinarsController,
  rescheduleWebinarController,
  restoreWebinarController,
  updateWebinarController,
  uploadWebinarImageController,
} from "../controllers/webinarAdminController.js";
import { requireAdmin } from "../middleware/auth.js";
import { singleImageUpload } from "../utils/uploads.js";

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

// Webinar management. Keyed by id, not slug, so renaming a slug stays a plain edit.
router.get("/admin/webinars", requireAdmin, listAdminWebinarsController);
router.post("/admin/webinars", requireAdmin, createWebinarController);
router.patch("/admin/webinars/:id", requireAdmin, updateWebinarController);
router.post("/admin/webinars/:id/reschedule", requireAdmin, rescheduleWebinarController);
// Archive, not delete - see setWebinarArchived in webinarAdminService.js.
router.delete("/admin/webinars/:id", requireAdmin, archiveWebinarController);
router.post("/admin/webinars/:id/restore", requireAdmin, restoreWebinarController);
router.post(
  "/admin/webinars/uploads",
  requireAdmin,
  singleImageUpload,
  uploadWebinarImageController,
);

export default router;

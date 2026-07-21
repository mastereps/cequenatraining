import express from "express";
import {
  getAdminPageContentController,
  getPublicPageContentController,
  updatePageOrderController,
  updatePageSectionController,
  uploadContentImageController,
} from "../controllers/contentController.js";
import { requireSuperAdmin } from "../middleware/auth.js";
import { singleImageUpload } from "../utils/uploads.js";

const router = express.Router();

// Public read used to render the marketing pages.
router.get("/content/:page", getPublicPageContentController);

// Admin content management.
router.get("/admin/content/:page", requireSuperAdmin, getAdminPageContentController);
router.put("/admin/content/:page/order", requireSuperAdmin, updatePageOrderController);
router.patch("/admin/content/:page/:sectionKey", requireSuperAdmin, updatePageSectionController);

// Image upload for content fields.
router.post("/admin/uploads", requireSuperAdmin, singleImageUpload, uploadContentImageController);

export default router;

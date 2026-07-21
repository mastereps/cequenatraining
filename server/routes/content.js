import express from "express";
import multer from "multer";
import {
  getAdminPageContentController,
  getPublicPageContentController,
  updatePageOrderController,
  updatePageSectionController,
  uploadContentImageController,
} from "../controllers/contentController.js";
import { requireSuperAdmin } from "../middleware/auth.js";
import { imageUpload } from "../utils/uploads.js";
import { isAppError } from "../utils/errors.js";

const router = express.Router();

// Public read used to render the marketing pages.
router.get("/content/:page", getPublicPageContentController);

// Admin content management.
router.get("/admin/content/:page", requireSuperAdmin, getAdminPageContentController);
router.put("/admin/content/:page/order", requireSuperAdmin, updatePageOrderController);
router.patch("/admin/content/:page/:sectionKey", requireSuperAdmin, updatePageSectionController);

// Image upload for content fields. Multer errors are translated to JSON here
// since the app has no global error middleware.
router.post(
  "/admin/uploads",
  requireSuperAdmin,
  (req, res, next) => {
    imageUpload.single("image")(req, res, (error) => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE" ? "Image is too large (max 5 MB)." : error.message;
        return res.status(400).json({ error: message });
      }
      if (isAppError(error)) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({ error: "Upload failed." });
    });
  },
  uploadContentImageController,
);

export default router;

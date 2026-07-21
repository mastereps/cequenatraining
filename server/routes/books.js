import express from "express";
import {
  archiveBookController,
  createBookController,
  listAdminBooksController,
  restoreBookController,
  updateBookController,
  uploadBookImageController,
} from "../controllers/bookController.js";
import { requireAdmin } from "../middleware/auth.js";
import { singleImageUpload } from "../utils/uploads.js";

const router = express.Router();

// The public book reads still live inline in server.js.
router.get("/admin/books", requireAdmin, listAdminBooksController);
router.post("/admin/books", requireAdmin, createBookController);
router.patch("/admin/books/:id", requireAdmin, updateBookController);
// Archive, not delete - see setBookActive in bookService.js.
router.delete("/admin/books/:id", requireAdmin, archiveBookController);
router.post("/admin/books/:id/restore", requireAdmin, restoreBookController);

// Cover uploads. Separate from /admin/uploads, which is super-admin only.
router.post("/admin/books/uploads", requireAdmin, singleImageUpload, uploadBookImageController);

export default router;

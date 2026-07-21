import express from "express";
import { getDashboardController } from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/admin/dashboard", requireAdmin, getDashboardController);

export default router;

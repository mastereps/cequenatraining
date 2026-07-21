import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import multer from "multer";
import { AppError } from "./errors.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Uploaded images live outside the frontend build output so they survive
// `git pull` + rebuild deploys. Served statically at /api/uploads.
export const UPLOADS_DIR = path.resolve(currentDir, "..", "uploads");

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

// SVG is deliberately excluded: it can carry <script>, and these files are served
// same-origin from /api/uploads, which would make an upload a stored XSS.
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadsDir();
      cb(null, UPLOADS_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".png";
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    cb(null, `${unique}${safeExt}`);
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    // Both the declared type and the extension must be on the allowlist. Checking
    // only the `image/` prefix would admit image/svg+xml.
    if (!file.mimetype || !ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(new AppError(400, "Only JPEG, PNG, WebP, GIF, or AVIF images can be uploaded."));
      return;
    }
    if (!ALLOWED_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())) {
      cb(new AppError(400, "Unsupported image file extension."));
      return;
    }
    cb(null, true);
  },
});

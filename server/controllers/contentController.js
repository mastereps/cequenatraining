import {
  listAllPageSections,
  listVisiblePageSections,
  updatePageSection,
  updatePageSectionOrder,
} from "../services/contentService.js";
import { isAppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const handleError = (res, error, context) => {
  if (isAppError(error)) {
    logger.warn("content_request_rejected", {
      context,
      status: error.status,
      message: error.message,
      details: error.details,
    });
    return res.status(error.status).json({
      error: error.message,
      details: error.details,
    });
  }

  logger.error("content_request_failed", { context, error });
  return res.status(500).json({ error: "Internal server error." });
};

export const getPublicPageContentController = async (req, res) => {
  try {
    const sections = await listVisiblePageSections(req.params.page);
    return res.json({ page: req.params.page, sections });
  } catch (error) {
    return handleError(res, error, "get_public_page_content");
  }
};

export const getAdminPageContentController = async (req, res) => {
  try {
    const sections = await listAllPageSections(req.params.page);
    return res.json({ page: req.params.page, sections });
  } catch (error) {
    return handleError(res, error, "get_admin_page_content");
  }
};

export const updatePageOrderController = async (req, res) => {
  try {
    const order = Array.isArray(req.body) ? req.body : req.body?.order;
    const sections = await updatePageSectionOrder(req.params.page, order);
    return res.json({ ok: true, page: req.params.page, sections });
  } catch (error) {
    return handleError(res, error, "update_page_order");
  }
};

export const updatePageSectionController = async (req, res) => {
  try {
    const section = await updatePageSection(req.params.page, req.params.sectionKey, {
      content: req.body?.content,
      isVisible: req.body?.is_visible,
    });
    return res.json({ ok: true, section });
  } catch (error) {
    return handleError(res, error, "update_page_section");
  }
};

export const uploadContentImageController = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "An image file is required." });
  }

  logger.info("content_image_uploaded", {
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });

  return res.status(201).json({ url: `/api/uploads/${req.file.filename}` });
};

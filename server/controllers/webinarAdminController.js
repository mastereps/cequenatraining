import {
  createWebinar,
  listWebinarsForAdmin,
  rescheduleWebinar,
  setWebinarArchived,
  updateWebinar,
} from "../services/webinarAdminService.js";
import { isAppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const handleError = (res, error, context) => {
  if (isAppError(error)) {
    logger.warn("webinar_admin_request_rejected", {
      context,
      status: error.status,
      message: error.message,
    });
    return res.status(error.status).json({ error: error.message });
  }

  logger.error("webinar_admin_request_failed", { context, error });
  return res.status(500).json({ error: "Internal server error." });
};

export const listAdminWebinarsController = async (_req, res) => {
  try {
    const webinars = await listWebinarsForAdmin();
    return res.json({ webinars });
  } catch (error) {
    return handleError(res, error, "list_admin_webinars");
  }
};

export const createWebinarController = async (req, res) => {
  try {
    const webinar = await createWebinar(req.body);
    logger.info("webinar_created", { id: webinar.id, slug: webinar.slug });
    return res.status(201).json({ webinar });
  } catch (error) {
    return handleError(res, error, "create_webinar");
  }
};

export const updateWebinarController = async (req, res) => {
  try {
    const webinar = await updateWebinar(req.params.id, req.body);
    logger.info("webinar_updated", { id: webinar.id, slug: webinar.slug });
    return res.json({ webinar });
  } catch (error) {
    return handleError(res, error, "update_webinar");
  }
};

export const rescheduleWebinarController = async (req, res) => {
  try {
    const result = await rescheduleWebinar(req.params.id, {
      start_at: req.body?.start_at,
      end_at: req.body?.end_at,
      timezone: req.body?.timezone,
      notify_registrants: Boolean(req.body?.notify_registrants),
    });

    logger.info("webinar_rescheduled", {
      id: result.webinar.id,
      slug: result.webinar.slug,
      start_at: result.webinar.start_at,
      notified_count: result.notified_count,
    });

    return res.json(result);
  } catch (error) {
    return handleError(res, error, "reschedule_webinar");
  }
};

export const archiveWebinarController = async (req, res) => {
  try {
    const webinar = await setWebinarArchived(req.params.id, true);
    logger.info("webinar_archived", { id: webinar.id, slug: webinar.slug });
    return res.json({ webinar });
  } catch (error) {
    return handleError(res, error, "archive_webinar");
  }
};

export const restoreWebinarController = async (req, res) => {
  try {
    const webinar = await setWebinarArchived(req.params.id, false);
    logger.info("webinar_restored", { id: webinar.id, slug: webinar.slug });
    return res.json({ webinar });
  } catch (error) {
    return handleError(res, error, "restore_webinar");
  }
};

export const uploadWebinarImageController = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "An image file is required." });
  }

  logger.info("webinar_image_uploaded", {
    filename: req.file.filename,
    size: req.file.size,
  });

  return res.status(201).json({ url: `/api/uploads/${req.file.filename}` });
};

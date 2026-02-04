import {
  getRegistrationStatusForWebinar,
  getWebinarBySlug,
  listWebinars,
  registerForWebinar,
  resendConfirmation,
  verifyRegistration,
} from "../services/webinarService.js";
import { isAppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const handleError = (res, error, context) => {
  if (isAppError(error)) {
    logger.warn("webinar_request_rejected", {
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

  logger.error("webinar_request_failed", {
    context,
    error,
  });

  return res.status(500).json({ error: "Internal server error." });
};

const parseRequestedUserId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const listWebinarsController = async (req, res) => {
  try {
    const webinars = await listWebinars({
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
      topic: req.query.topic,
      availability: req.query.availability,
      limit: req.query.limit,
    });

    return res.json({
      data: webinars,
      count: webinars.length,
    });
  } catch (error) {
    return handleError(res, error, "list_webinars");
  }
};

export const getWebinarBySlugController = async (req, res) => {
  try {
    const webinar = await getWebinarBySlug(req.params.slug);
    return res.json({ data: webinar });
  } catch (error) {
    return handleError(res, error, "get_webinar");
  }
};

export const getRegistrationStatusController = async (req, res) => {
  try {
    const requestedUserId = parseRequestedUserId(req.query.user_id);
    if (requestedUserId && (!req.authUser || req.authUser.id !== requestedUserId)) {
      return res.status(403).json({
        error: "You are not allowed to query another user's registration status.",
      });
    }

    const effectiveUserId = req.authUser?.id || requestedUserId;
    const result = await getRegistrationStatusForWebinar({
      slug: req.params.slug,
      email: req.query.email,
      userId: effectiveUserId,
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error, "get_registration_status");
  }
};

export const registerForWebinarController = async (req, res) => {
  try {
    const requestedUserId = parseRequestedUserId(req.body?.user_id);
    if (requestedUserId && (!req.authUser || req.authUser.id !== requestedUserId)) {
      return res.status(403).json({
        error: "You are not allowed to submit registrations for another user.",
      });
    }

    const effectiveUserId = req.authUser?.id || requestedUserId;
    const result = await registerForWebinar({
      slug: req.params.slug,
      fullName: req.body?.full_name,
      email: req.body?.email,
      userId: effectiveUserId,
      optionalFields: req.body?.optional_fields,
    });

    return res.status(202).json(result);
  } catch (error) {
    return handleError(res, error, "register_webinar");
  }
};

export const verifyRegistrationController = async (req, res) => {
  try {
    const result = await verifyRegistration(req.query.token);
    return res.json({
      ok: true,
      ...result,
      message: "Your email has been verified.",
    });
  } catch (error) {
    return handleError(res, error, "verify_registration");
  }
};

export const resendConfirmationController = async (req, res) => {
  const idempotencyKey = req.get("Idempotency-Key") || null;

  try {
    const result = await resendConfirmation({
      slug: req.params.slug,
      email: req.body?.email,
      idempotencyKey,
    });

    if (result.replayed) {
      res.setHeader("Idempotency-Replayed", "true");
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    return handleError(res, error, "resend_confirmation");
  }
};

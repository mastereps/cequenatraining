import { getDashboardSummary } from "../services/adminDashboardService.js";
import { isAppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const handleError = (res, error, context) => {
  if (isAppError(error)) {
    logger.warn("admin_request_rejected", {
      context,
      status: error.status,
      message: error.message,
    });
    return res.status(error.status).json({ error: error.message });
  }

  logger.error("admin_request_failed", { context, error });
  return res.status(500).json({ error: "Internal server error." });
};

export const getDashboardController = async (_req, res) => {
  try {
    const summary = await getDashboardSummary();
    return res.json(summary);
  } catch (error) {
    return handleError(res, error, "get_admin_dashboard");
  }
};

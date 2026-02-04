import { loginUser, registerUser } from "../services/authService.js";
import { isAppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const handleAuthError = (res, error, context) => {
  if (isAppError(error)) {
    logger.warn("auth_request_rejected", {
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

  logger.error("auth_request_failed", { context, error });
  return res.status(500).json({ error: "Internal server error." });
};

export const registerUserController = async (req, res) => {
  try {
    const user = await registerUser({
      name: req.body?.name,
      email: req.body?.email,
      password: req.body?.password,
    });
    return res.status(201).json({ ok: true, user });
  } catch (error) {
    return handleAuthError(res, error, "auth_register");
  }
};

export const loginUserController = async (req, res) => {
  try {
    const user = await loginUser({
      email: req.body?.email,
      password: req.body?.password,
    });
    return res.json({ ok: true, user });
  } catch (error) {
    return handleAuthError(res, error, "auth_login");
  }
};

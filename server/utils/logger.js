const LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

const normalizeError = (error) => {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
};

const writeLog = (level, message, metadata = {}) => {
  const safeLevel = LOG_LEVELS.has(level) ? level : "info";
  const payload = {
    timestamp: new Date().toISOString(),
    level: safeLevel,
    message,
    ...metadata,
  };

  const output = JSON.stringify(payload);
  if (safeLevel === "error") {
    console.error(output);
    return;
  }

  if (safeLevel === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
};

export const logger = {
  debug: (message, metadata) => writeLog("debug", message, metadata),
  info: (message, metadata) => writeLog("info", message, metadata),
  warn: (message, metadata) => writeLog("warn", message, metadata),
  error: (message, metadata = {}) =>
    writeLog("error", message, {
      ...metadata,
      error: normalizeError(metadata.error),
    }),
};

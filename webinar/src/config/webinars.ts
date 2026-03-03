const webinarOrderingFlag = String(import.meta.env.VITE_WEBINAR_ORDERING_ENABLED || "false")
  .trim()
  .toLowerCase();

export const WEBINAR_ORDERING_ENABLED = !["0", "false", "no", "off"].includes(
  webinarOrderingFlag,
);

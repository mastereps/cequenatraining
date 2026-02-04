const toWindowStartIso = (windowSeconds) => {
  const seconds = Math.floor(Date.now() / 1000);
  const bucket = seconds - (seconds % windowSeconds);
  return new Date(bucket * 1000).toISOString();
};

export const assertWithinRateLimit = async (
  dbClient,
  { actionKey, webinarId, email, maxRequests, windowSeconds },
) => {
  const windowStart = toWindowStartIso(windowSeconds);

  const result = await dbClient.query(
    `
      INSERT INTO webinar_rate_limits (
        action_key,
        webinar_id,
        email,
        window_start,
        request_count
      )
      VALUES ($1, $2, $3, $4::timestamptz, 1)
      ON CONFLICT (action_key, webinar_id, email, window_start)
      DO UPDATE
      SET request_count = webinar_rate_limits.request_count + 1
      RETURNING request_count
    `,
    [actionKey, webinarId, email, windowStart],
  );

  const count = Number(result.rows[0]?.request_count || 0);
  if (count > maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: windowSeconds,
      count,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    count,
  };
};

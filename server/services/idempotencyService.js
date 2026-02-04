import { hashIdempotencyKey } from "../utils/tokens.js";

const ENDPOINT_KEY = "webinars.resend_confirmation";

export const findIdempotentResponse = async (dbClient, { idempotencyKey }) => {
  if (!idempotencyKey) return null;

  const idempotencyKeyHash = hashIdempotencyKey(idempotencyKey);
  const result = await dbClient.query(
    `
      SELECT response_status, response_body_json
      FROM api_idempotency_keys
      WHERE endpoint_key = $1
        AND idempotency_key_hash = $2
        AND expires_at > NOW()
      LIMIT 1
    `,
    [ENDPOINT_KEY, idempotencyKeyHash],
  );

  if (result.rows.length === 0) return null;

  return {
    status: result.rows[0].response_status,
    body: result.rows[0].response_body_json,
  };
};

export const persistIdempotentResponse = async (
  dbClient,
  { idempotencyKey, webinarId, email, status, body, ttlHours = 24 },
) => {
  if (!idempotencyKey) return;

  const idempotencyKeyHash = hashIdempotencyKey(idempotencyKey);
  await dbClient.query(
    `
      INSERT INTO api_idempotency_keys (
        endpoint_key,
        idempotency_key_hash,
        webinar_id,
        email,
        response_status,
        response_body_json,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW() + make_interval(hours => $7::int))
      ON CONFLICT (endpoint_key, idempotency_key_hash)
      DO UPDATE SET
        response_status = EXCLUDED.response_status,
        response_body_json = EXCLUDED.response_body_json,
        expires_at = EXCLUDED.expires_at
    `,
    [
      ENDPOINT_KEY,
      idempotencyKeyHash,
      webinarId,
      email,
      status,
      JSON.stringify(body),
      ttlHours,
    ],
  );
};

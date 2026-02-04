export const enqueueEmail = async (dbClient, { toEmail, templateKey, payload }) => {
  const result = await dbClient.query(
    `
      INSERT INTO email_outbox (to_email, template_key, payload_json, status)
      VALUES ($1, $2, $3::jsonb, 'pending')
      RETURNING id, to_email, template_key, created_at
    `,
    [toEmail, templateKey, JSON.stringify(payload)],
  );

  return result.rows[0];
};

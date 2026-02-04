import { pool } from "../db.js";
import { AppError } from "../utils/errors.js";
import {
  isValidEmail,
  normalizeEmail,
  parseDateInput,
  parseOptionalFields,
  sanitizeText,
} from "../utils/validation.js";
import { generateVerificationToken, hashToken } from "../utils/tokens.js";
import { enqueueEmail } from "./emailOutboxService.js";
import { assertWithinRateLimit } from "./rateLimitService.js";
import {
  findIdempotentResponse,
  persistIdempotentResponse,
} from "./idempotencyService.js";

const verifyTokenTtlMinutes = Number(process.env.VERIFY_TOKEN_TTL_MINUTES || 1440);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:5173";

const mapWebinar = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  topic: row.topic,
  description: row.description,
  start_at: row.start_at,
  end_at: row.end_at,
  timezone: row.timezone,
  capacity: row.capacity,
  verified_count: Number(row.verified_count || 0),
  available_seats:
    row.available_seats === null || row.available_seats === undefined
      ? null
      : Number(row.available_seats),
  is_full: Boolean(row.is_full),
  is_published: row.is_published,
  registration_open: row.registration_open,
});

const webinarSelectSql = `
  SELECT
    w.id,
    w.slug,
    w.title,
    w.topic,
    w.description,
    w.start_at,
    w.end_at,
    w.timezone,
    w.capacity,
    w.is_published,
    w.registration_open,
    w.zoom_join_url,
    COALESCE(stats.verified_count, 0) AS verified_count,
    CASE
      WHEN w.capacity IS NULL THEN NULL
      ELSE GREATEST(w.capacity - COALESCE(stats.verified_count, 0), 0)
    END AS available_seats,
    CASE
      WHEN w.capacity IS NULL THEN false
      ELSE COALESCE(stats.verified_count, 0) >= w.capacity
    END AS is_full
  FROM webinars w
  LEFT JOIN (
    SELECT webinar_id, COUNT(*)::int AS verified_count
    FROM webinar_registrations
    WHERE status = 'verified'
    GROUP BY webinar_id
  ) stats ON stats.webinar_id = w.id
`;

export const listWebinars = async (filters) => {
  const clauses = ["w.is_published = true", "w.start_at >= NOW()"];
  const values = [];

  if (filters.search) {
    values.push(`%${sanitizeText(filters.search, 120)}%`);
    clauses.push(`(w.title ILIKE $${values.length} OR w.description ILIKE $${values.length})`);
  }

  const fromDate = parseDateInput(filters.from);
  if (fromDate) {
    values.push(fromDate.toISOString());
    clauses.push(`w.start_at >= $${values.length}::timestamptz`);
  }

  const toDate = parseDateInput(filters.to);
  if (toDate) {
    values.push(toDate.toISOString());
    clauses.push(`w.start_at <= $${values.length}::timestamptz`);
  }

  if (filters.topic) {
    values.push(sanitizeText(filters.topic, 80));
    clauses.push(`w.topic ILIKE $${values.length}`);
  }

  const availability = sanitizeText(filters.availability, 20).toLowerCase();
  if (availability === "open") {
    clauses.push(
      "w.registration_open = true AND (w.capacity IS NULL OR COALESCE(stats.verified_count, 0) < w.capacity)",
    );
  } else if (availability === "full") {
    clauses.push("w.capacity IS NOT NULL AND COALESCE(stats.verified_count, 0) >= w.capacity");
  }

  const limit = Math.min(Number(filters.limit || 50) || 50, 100);
  values.push(limit);

  const sql = `
    ${webinarSelectSql}
    WHERE ${clauses.join(" AND ")}
    ORDER BY w.start_at ASC
    LIMIT $${values.length}
  `;

  const result = await pool.query(sql, values);
  return result.rows.map(mapWebinar);
};

export const getWebinarBySlug = async (slug) => {
  const result = await pool.query(
    `
      ${webinarSelectSql}
      WHERE w.slug = $1
        AND w.is_published = true
      LIMIT 1
    `,
    [sanitizeText(slug, 150)],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Webinar not found.");
  }

  return mapWebinar(result.rows[0]);
};

export const getRegistrationStatusForWebinar = async ({ slug, email, userId }) => {
  const cleanSlug = sanitizeText(slug, 150);
  const rawUserId = Number(userId);
  const cleanUserId = Number.isInteger(rawUserId) && rawUserId > 0 ? rawUserId : null;
  const cleanEmail = email ? normalizeEmail(email) : "";

  if (!cleanUserId && !cleanEmail) {
    throw new AppError(400, "Either user_id or email is required.");
  }
  if (cleanEmail && !isValidEmail(cleanEmail)) {
    throw new AppError(400, "A valid email is required.");
  }

  let result;
  if (cleanUserId) {
    result = await pool.query(
      `
        SELECT wr.status
        FROM webinar_registrations wr
        JOIN webinars w ON w.id = wr.webinar_id
        WHERE w.slug = $1
          AND w.is_published = true
          AND wr.user_id = $2
        LIMIT 1
      `,
      [cleanSlug, cleanUserId],
    );
  } else {
    result = await pool.query(
      `
        SELECT wr.status
        FROM webinar_registrations wr
        JOIN webinars w ON w.id = wr.webinar_id
        WHERE w.slug = $1
          AND w.is_published = true
          AND wr.email = $2
        LIMIT 1
      `,
      [cleanSlug, cleanEmail],
    );
  }

  const status = result.rows[0]?.status || null;
  return {
    webinar_slug: cleanSlug,
    email: cleanEmail || null,
    user_id: cleanUserId,
    registered: status === "pending" || status === "verified",
    status,
  };
};

export const registerForWebinar = async ({ slug, fullName, email, userId, optionalFields }) => {
  let cleanName = sanitizeText(fullName, 180);
  let cleanEmail = normalizeEmail(email);
  const rawUserId = Number(userId);
  const cleanUserId = Number.isInteger(rawUserId) && rawUserId > 0 ? rawUserId : null;
  const safeOptionalFields = parseOptionalFields(optionalFields);

  if (!isValidEmail(cleanEmail)) {
    throw new AppError(400, "A valid email is required.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (cleanUserId) {
      const userResult = await client.query(
        `
          SELECT id, name, email
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [cleanUserId],
      );

      if (userResult.rows.length === 0) {
        throw new AppError(400, "Invalid user id.");
      }

      const user = userResult.rows[0];
      const accountEmail = normalizeEmail(user.email);
      if (!accountEmail || !isValidEmail(accountEmail)) {
        throw new AppError(409, "Your account must have a valid email before registering.");
      }
      if (accountEmail !== cleanEmail) {
        throw new AppError(409, "Please use your account email for webinar registration.");
      }
      cleanEmail = accountEmail;
      if (cleanName.length < 2) {
        cleanName = sanitizeText(user.name, 180);
      }
    }

    if (cleanName.length < 2) {
      throw new AppError(400, "Full name is required.");
    }

    const webinarResult = await client.query(
      `
        ${webinarSelectSql}
        WHERE w.slug = $1
          AND w.is_published = true
        FOR UPDATE OF w
      `,
      [sanitizeText(slug, 150)],
    );

    if (webinarResult.rows.length === 0) {
      throw new AppError(404, "Webinar not found.");
    }

    const webinar = webinarResult.rows[0];
    const nowIso = new Date().toISOString();

    if (!webinar.registration_open) {
      throw new AppError(409, "Registration is closed for this webinar.");
    }

    if (new Date(webinar.start_at).getTime() <= Date.now()) {
      throw new AppError(409, "This webinar is no longer accepting registrations.");
    }

    if (webinar.capacity !== null && Number(webinar.verified_count) >= Number(webinar.capacity)) {
      throw new AppError(409, "This webinar is already full.");
    }

    const registerRateLimit = await assertWithinRateLimit(client, {
      actionKey: "register",
      webinarId: webinar.id,
      email: cleanEmail,
      maxRequests: 5,
      windowSeconds: 60 * 60,
    });

    if (!registerRateLimit.allowed) {
      throw new AppError(429, "Too many registration attempts. Please retry later.");
    }

    const existingRegistration = cleanUserId
      ? await client.query(
          `
            SELECT id, status
            FROM webinar_registrations
            WHERE webinar_id = $1
              AND (email = $2 OR user_id = $3)
            LIMIT 1
            FOR UPDATE
          `,
          [webinar.id, cleanEmail, cleanUserId],
        )
      : await client.query(
          `
            SELECT id, status
            FROM webinar_registrations
            WHERE webinar_id = $1
              AND email = $2
            LIMIT 1
            FOR UPDATE
          `,
          [webinar.id, cleanEmail],
        );

    if (existingRegistration.rows[0]?.status === "verified") {
      throw new AppError(409, "This email is already verified for this webinar.");
    }

    const rawToken = generateVerificationToken();
    const tokenHash = hashToken(rawToken);
    const tokenExpiry = new Date(Date.now() + verifyTokenTtlMinutes * 60_000).toISOString();

    let registrationId = existingRegistration.rows[0]?.id;
    if (registrationId) {
      await client.query(
        `
          UPDATE webinar_registrations
          SET
            full_name = $2,
            status = 'pending',
            verify_token_hash = $3,
            verify_token_expires_at = $4::timestamptz,
            verified_at = NULL,
            optional_fields_json = $5::jsonb,
            user_id = COALESCE($6, user_id),
            last_verification_email_sent_at = NOW()
          WHERE id = $1
        `,
        [
          registrationId,
          cleanName,
          tokenHash,
          tokenExpiry,
          JSON.stringify(safeOptionalFields),
          cleanUserId,
        ],
      );
    } else {
      const inserted = await client.query(
        `
          INSERT INTO webinar_registrations (
            webinar_id,
            email,
            full_name,
            user_id,
            status,
            verify_token_hash,
            verify_token_expires_at,
            optional_fields_json,
            last_verification_email_sent_at
          )
          VALUES ($1, $2, $3, $4, 'pending', $5, $6::timestamptz, $7::jsonb, NOW())
          RETURNING id
        `,
        [
          webinar.id,
          cleanEmail,
          cleanName,
          cleanUserId,
          tokenHash,
          tokenExpiry,
          JSON.stringify(safeOptionalFields),
        ],
      );

      registrationId = inserted.rows[0].id;
    }

    const verifyUrl = `${publicBaseUrl}/verify?token=${encodeURIComponent(rawToken)}`;
    await enqueueEmail(client, {
      toEmail: cleanEmail,
      templateKey: "webinar.verify",
      payload: {
        full_name: cleanName,
        webinar_title: webinar.title,
        webinar_slug: webinar.slug,
        webinar_start_at: webinar.start_at,
        webinar_timezone: webinar.timezone,
        verify_url: verifyUrl,
        token_expires_at: tokenExpiry,
        queued_at: nowIso,
      },
    });

    await client.query("COMMIT");

    return {
      registration_id: registrationId,
      webinar_slug: webinar.slug,
      email: cleanEmail,
      status: "pending",
      message: "Check your email to verify your registration.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const verifyRegistration = async (token) => {
  const cleanToken = sanitizeText(token, 500);
  if (!cleanToken) {
    throw new AppError(400, "Verification token is required.");
  }

  const tokenHash = hashToken(cleanToken);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const registrationResult = await client.query(
      `
        SELECT
          wr.id,
          wr.email,
          wr.full_name,
          wr.status,
          wr.zoom_registrant_join_url,
          wr.verify_token_expires_at,
          w.id AS webinar_id,
          w.slug,
          w.title,
          w.start_at,
          w.timezone,
          w.zoom_join_url
        FROM webinar_registrations wr
        JOIN webinars w ON w.id = wr.webinar_id
        WHERE wr.verify_token_hash = $1
        LIMIT 1
        FOR UPDATE OF wr
      `,
      [tokenHash],
    );

    if (registrationResult.rows.length === 0) {
      throw new AppError(400, "Invalid or expired verification token.");
    }

    const registration = registrationResult.rows[0];

    const joinUrl = registration.zoom_registrant_join_url || registration.zoom_join_url || null;

    if (registration.status === "cancelled") {
      throw new AppError(400, "Invalid or expired verification token.");
    }

    if (registration.status === "pending") {
      if (
        !registration.verify_token_expires_at ||
        new Date(registration.verify_token_expires_at).getTime() <= Date.now()
      ) {
        throw new AppError(400, "Invalid or expired verification token.");
      }

      await client.query(
        `
          UPDATE webinar_registrations
          SET
            status = 'verified',
            verified_at = COALESCE(verified_at, NOW()),
            last_confirmation_email_sent_at = NOW()
          WHERE id = $1
        `,
        [registration.id],
      );

      await enqueueEmail(client, {
        toEmail: registration.email,
        templateKey: "webinar.confirmed",
        payload: {
          full_name: registration.full_name,
          webinar_title: registration.title,
          webinar_slug: registration.slug,
          webinar_start_at: registration.start_at,
          webinar_timezone: registration.timezone,
          join_url: joinUrl,
        },
      });
    } else if (registration.status !== "verified") {
      throw new AppError(400, "Invalid or expired verification token.");
    }

    await client.query("COMMIT");

    return {
      webinar_slug: registration.slug,
      webinar_title: registration.title,
      email: registration.email,
      full_name: registration.full_name,
      join_url_included: Boolean(joinUrl),
      already_verified: registration.status === "verified",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const resendConfirmation = async ({ slug, email, idempotencyKey }) => {
  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) {
    throw new AppError(400, "A valid email is required.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (idempotencyKey) {
      const replayed = await findIdempotentResponse(client, { idempotencyKey });
      if (replayed) {
        await client.query("COMMIT");
        return {
          status: replayed.status,
          body: replayed.body,
          replayed: true,
        };
      }
    }

    const webinarResult = await client.query(
      `
        SELECT
          id,
          slug,
          title,
          start_at,
          timezone,
          zoom_join_url
        FROM webinars
        WHERE slug = $1
          AND is_published = true
        LIMIT 1
        FOR UPDATE
      `,
      [sanitizeText(slug, 150)],
    );

    if (webinarResult.rows.length === 0) {
      throw new AppError(404, "Webinar not found.");
    }

    const webinar = webinarResult.rows[0];

    const resendRateLimit = await assertWithinRateLimit(client, {
      actionKey: "resend_confirmation",
      webinarId: webinar.id,
      email: cleanEmail,
      maxRequests: 3,
      windowSeconds: 60 * 60,
    });

    if (!resendRateLimit.allowed) {
      throw new AppError(429, "Too many resend attempts. Please retry later.");
    }

    const registrationResult = await client.query(
      `
        SELECT
          id,
          full_name,
          status,
          zoom_registrant_join_url
        FROM webinar_registrations
        WHERE webinar_id = $1
          AND email = $2
        LIMIT 1
        FOR UPDATE
      `,
      [webinar.id, cleanEmail],
    );

    if (registrationResult.rows.length === 0) {
      throw new AppError(404, "Registration not found for this webinar and email.");
    }

    const registration = registrationResult.rows[0];
    if (registration.status !== "verified") {
      throw new AppError(409, "Registration is not verified yet.");
    }

    const joinUrl = registration.zoom_registrant_join_url || webinar.zoom_join_url || null;
    await enqueueEmail(client, {
      toEmail: cleanEmail,
      templateKey: "webinar.confirmed",
      payload: {
        full_name: registration.full_name,
        webinar_title: webinar.title,
        webinar_slug: webinar.slug,
        webinar_start_at: webinar.start_at,
        webinar_timezone: webinar.timezone,
        join_url: joinUrl,
      },
    });

    await client.query(
      `
        UPDATE webinar_registrations
        SET last_confirmation_email_sent_at = NOW()
        WHERE id = $1
      `,
      [registration.id],
    );

    const responseBody = {
      ok: true,
      webinar_slug: webinar.slug,
      email: cleanEmail,
      message: "Confirmation email queued.",
    };

    await persistIdempotentResponse(client, {
      idempotencyKey,
      webinarId: webinar.id,
      email: cleanEmail,
      status: 200,
      body: responseBody,
    });

    await client.query("COMMIT");

    return {
      status: 200,
      body: responseBody,
      replayed: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

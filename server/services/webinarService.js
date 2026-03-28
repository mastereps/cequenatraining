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
const defaultWebinarPriceCents = Number(process.env.WEBINAR_DEFAULT_PRICE_CENTS || 0);
const webinarCurrency = String(process.env.WEBINAR_CURRENCY || "PHP")
  .trim()
  .toUpperCase();

const toNonNegativeInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  return rounded >= 0 ? rounded : null;
};

const resendCooldownSeconds =
  toNonNegativeInteger(process.env.WEBINAR_RESEND_COOLDOWN_SECONDS) ?? 300;

const resolveWebinarPriceCents = (webinarRow) => {
  const fromDb = toNonNegativeInteger(webinarRow?.price_cents);
  if (fromDb !== null && fromDb > 0) return fromDb;

  const fromEnv = toNonNegativeInteger(defaultWebinarPriceCents);
  if (fromEnv !== null && fromEnv > 0) return fromEnv;

  return 0;
};

const resolvePublicBaseUrl = () => {
  const fallback = "http://localhost:5173";
  const raw = String(process.env.PUBLIC_BASE_URL || fallback).trim();

  try {
    // Use origin so verification URLs are always `https://host/verify?...`.
    return new URL(raw).origin;
  } catch {
    return fallback;
  }
};

const publicBaseUrl = resolvePublicBaseUrl();

const normalizeJoinLinkDeliveryMode = (value) =>
  String(value || "auto").trim().toLowerCase() === "manual" ? "manual" : "auto";

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const mapPaymentProof = (row) => {
  if (!row?.payment_proof_id) return null;

  return {
    id: row.payment_proof_id,
    reference_number: row.payment_reference_number,
    payer_name: row.payment_payer_name,
    payer_gcash_number: row.payment_payer_gcash_number,
    amount_cents:
      row.payment_amount_cents === null || row.payment_amount_cents === undefined
        ? null
        : Number(row.payment_amount_cents),
    status: row.payment_proof_status,
    review_notes: row.payment_review_notes,
    submitted_at: row.payment_submitted_at,
    reviewed_at: row.payment_reviewed_at,
    reviewed_by: row.payment_reviewed_by === null || row.payment_reviewed_by === undefined
      ? null
      : Number(row.payment_reviewed_by),
  };
};

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
  price_cents: row.price_cents === null || row.price_cents === undefined ? null : Number(row.price_cents),
  currency: webinarCurrency,
  verified_count: Number(row.verified_count || 0),
  available_seats:
    row.available_seats === null || row.available_seats === undefined
      ? null
      : Number(row.available_seats),
  is_full: Boolean(row.is_full),
  is_published: row.is_published,
  registration_open: row.registration_open,
  poster_image_url: row.poster_image_url || null,
  payment_qr_image_url: row.payment_qr_image_url || null,
  payment_instructions: row.payment_instructions || null,
  join_link_delivery_mode: normalizeJoinLinkDeliveryMode(row.join_link_delivery_mode),
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
    w.price_cents,
    w.is_published,
    w.registration_open,
    w.poster_image_url,
    w.payment_qr_image_url,
    w.payment_instructions,
    w.join_link_delivery_mode,
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
  if (cleanUserId && cleanEmail) {
    result = await pool.query(
      `
        SELECT
          wr.status,
          wr.email,
          wr.user_id,
          wr.payment_required,
          wr.payment_status,
          wr.paid_at,
          wr.zoom_link_sent_at,
          wpp.id AS payment_proof_id,
          wpp.reference_number AS payment_reference_number,
          wpp.payer_name AS payment_payer_name,
          wpp.payer_gcash_number AS payment_payer_gcash_number,
          wpp.amount_cents AS payment_amount_cents,
          wpp.status AS payment_proof_status,
          wpp.review_notes AS payment_review_notes,
          wpp.submitted_at AS payment_submitted_at,
          wpp.reviewed_at AS payment_reviewed_at,
          wpp.reviewed_by AS payment_reviewed_by
        FROM webinar_registrations wr
        JOIN webinars w ON w.id = wr.webinar_id
        LEFT JOIN webinar_payment_proofs wpp ON wpp.registration_id = wr.id
        WHERE w.slug = $1
          AND w.is_published = true
          AND (wr.user_id = $2 OR wr.email = $3)
        ORDER BY
          CASE WHEN wr.user_id = $2 THEN 0 ELSE 1 END,
          CASE wr.status WHEN 'verified' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END
        LIMIT 1
      `,
      [cleanSlug, cleanUserId, cleanEmail],
    );
  } else if (cleanUserId) {
    result = await pool.query(
      `
        SELECT
          wr.status,
          wr.email,
          wr.user_id,
          wr.payment_required,
          wr.payment_status,
          wr.paid_at,
          wr.zoom_link_sent_at,
          wpp.id AS payment_proof_id,
          wpp.reference_number AS payment_reference_number,
          wpp.payer_name AS payment_payer_name,
          wpp.payer_gcash_number AS payment_payer_gcash_number,
          wpp.amount_cents AS payment_amount_cents,
          wpp.status AS payment_proof_status,
          wpp.review_notes AS payment_review_notes,
          wpp.submitted_at AS payment_submitted_at,
          wpp.reviewed_at AS payment_reviewed_at,
          wpp.reviewed_by AS payment_reviewed_by
        FROM webinar_registrations wr
        JOIN webinars w ON w.id = wr.webinar_id
        LEFT JOIN webinar_payment_proofs wpp ON wpp.registration_id = wr.id
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
        SELECT
          wr.status,
          wr.email,
          wr.user_id,
          wr.payment_required,
          wr.payment_status,
          wr.paid_at,
          wr.zoom_link_sent_at,
          wpp.id AS payment_proof_id,
          wpp.reference_number AS payment_reference_number,
          wpp.payer_name AS payment_payer_name,
          wpp.payer_gcash_number AS payment_payer_gcash_number,
          wpp.amount_cents AS payment_amount_cents,
          wpp.status AS payment_proof_status,
          wpp.review_notes AS payment_review_notes,
          wpp.submitted_at AS payment_submitted_at,
          wpp.reviewed_at AS payment_reviewed_at,
          wpp.reviewed_by AS payment_reviewed_by
        FROM webinar_registrations wr
        JOIN webinars w ON w.id = wr.webinar_id
        LEFT JOIN webinar_payment_proofs wpp ON wpp.registration_id = wr.id
        WHERE w.slug = $1
          AND w.is_published = true
          AND wr.email = $2
        LIMIT 1
      `,
      [cleanSlug, cleanEmail],
    );
  }

  const matchedRegistration = result.rows[0] || null;
  const status = matchedRegistration?.status || null;
  const paymentRequired = matchedRegistration ? Boolean(matchedRegistration.payment_required) : null;
  const paymentStatus = matchedRegistration?.payment_status || null;
  const confirmationReady = Boolean(
    status === "verified" &&
      (paymentRequired === false || paymentStatus === "paid"),
  );

  return {
    webinar_slug: cleanSlug,
    email: matchedRegistration?.email || cleanEmail || null,
    user_id: matchedRegistration?.user_id || cleanUserId,
    registered: status === "pending" || status === "verified",
    status,
    payment_required: paymentRequired,
    payment_status: paymentStatus,
    paid_at: matchedRegistration?.paid_at || null,
    payment_proof: mapPaymentProof(matchedRegistration),
    zoom_link_sent_at: matchedRegistration?.zoom_link_sent_at || null,
    confirmation_ready: confirmationReady,
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

    const webinarPriceCents = resolveWebinarPriceCents(webinar);
    const paymentRequired = webinarPriceCents > 0;
    const initialPaymentStatus = paymentRequired ? "unpaid" : "paid";

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
            SELECT id, status, payment_status, payment_required
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
            SELECT id, status, payment_status, payment_required
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
            payment_required = $7,
            payment_status = $8,
            paid_at = CASE WHEN $7 THEN NULL ELSE COALESCE(paid_at, NOW()) END,
            zoom_link_sent_at = NULL,
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
          paymentRequired,
          initialPaymentStatus,
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
            payment_required,
            payment_status,
            paid_at,
            last_verification_email_sent_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'pending',
            $5,
            $6::timestamptz,
            $7::jsonb,
            $8,
            $9,
            CASE WHEN $8 THEN NULL ELSE NOW() END,
            NOW()
          )
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
          paymentRequired,
          initialPaymentStatus,
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
      payment_required: paymentRequired,
      payment_status: initialPaymentStatus,
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
          wr.payment_required,
          wr.payment_status,
          wr.paid_at,
          wr.last_confirmation_email_sent_at,
          wr.zoom_registrant_join_url,
          wr.zoom_link_sent_at,
          wr.verify_token_expires_at,
          w.id AS webinar_id,
          w.slug,
          w.title,
          w.start_at,
          w.timezone,
          w.zoom_join_url,
          w.join_link_delivery_mode
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
    const paymentRequired = Boolean(registration.payment_required);
    const paymentStatus = registration.payment_status || (paymentRequired ? "unpaid" : "paid");
    const joinLinkDeliveryMode = normalizeJoinLinkDeliveryMode(registration.join_link_delivery_mode);
    const shouldSendConfirmation =
      joinLinkDeliveryMode === "auto" && (!paymentRequired || paymentStatus === "paid");

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
            last_confirmation_email_sent_at = CASE
              WHEN $2 THEN COALESCE(last_confirmation_email_sent_at, NOW())
              ELSE last_confirmation_email_sent_at
            END
          WHERE id = $1
        `,
        [registration.id, shouldSendConfirmation],
      );

      if (shouldSendConfirmation) {
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
      }
    } else if (registration.status !== "verified") {
      throw new AppError(400, "Invalid or expired verification token.");
    }

    await client.query("COMMIT");
    const confirmationReady = !paymentRequired || paymentStatus === "paid";

    return {
      webinar_slug: registration.slug,
      webinar_title: registration.title,
      email: registration.email,
      full_name: registration.full_name,
      join_url_included: Boolean(joinUrl) && joinLinkDeliveryMode === "auto",
      already_verified: registration.status === "verified",
      payment_required: paymentRequired,
      payment_status: paymentStatus,
      paid_at: registration.paid_at || null,
      zoom_link_sent_at: registration.zoom_link_sent_at || null,
      confirmation_ready: confirmationReady,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const createWebinarPaymentSession = async ({ slug, email, userId }) => {
  const cleanSlug = sanitizeText(slug, 150);
  const cleanEmail = email ? normalizeEmail(email) : "";
  const rawUserId = Number(userId);
  const cleanUserId = Number.isInteger(rawUserId) && rawUserId > 0 ? rawUserId : null;

  if (!cleanEmail && !cleanUserId) {
    throw new AppError(400, "Either user_id or email is required.");
  }

  if (cleanEmail && !isValidEmail(cleanEmail)) {
    throw new AppError(400, "A valid email is required.");
  }

  const client = await pool.connect();

  try {
    const webinarResult = await client.query(
      `
        SELECT id, slug, title, price_cents
        FROM webinars
        WHERE slug = $1
          AND is_published = true
        LIMIT 1
      `,
      [cleanSlug],
    );

    if (webinarResult.rows.length === 0) {
      throw new AppError(404, "Webinar not found.");
    }

    const webinar = webinarResult.rows[0];
    const registrationResult = cleanUserId
      ? await client.query(
          `
            SELECT email, status, payment_required, payment_status
            FROM webinar_registrations
            WHERE webinar_id = $1
              AND (user_id = $2 OR email = $3)
            ORDER BY CASE WHEN user_id = $2 THEN 0 ELSE 1 END
            LIMIT 1
          `,
          [webinar.id, cleanUserId, cleanEmail],
        )
      : await client.query(
          `
            SELECT email, status, payment_required, payment_status
            FROM webinar_registrations
            WHERE webinar_id = $1
              AND email = $2
            LIMIT 1
          `,
          [webinar.id, cleanEmail],
        );

    if (registrationResult.rows.length === 0) {
      throw new AppError(404, "Registration not found for this webinar.");
    }

    const registration = registrationResult.rows[0];
    const amountCents = resolveWebinarPriceCents(webinar);

    if (!registration.payment_required) {
      return {
        ok: true,
        webinar_slug: webinar.slug,
        webinar_title: webinar.title,
        email: registration.email,
        payment_required: false,
        payment_status: "paid",
        already_paid: true,
        amount_cents: amountCents || null,
        currency: webinarCurrency,
        checkout_url: null,
        checkout_id: null,
        message: "Payment is not required for this webinar.",
      };
    }

    if (registration.payment_status === "paid") {
      return {
        ok: true,
        webinar_slug: webinar.slug,
        webinar_title: webinar.title,
        email: registration.email,
        payment_required: true,
        payment_status: "paid",
        already_paid: true,
        amount_cents: amountCents || null,
        currency: webinarCurrency,
        checkout_url: null,
        checkout_id: null,
        message: "Registration is already paid.",
      };
    }

    throw new AppError(
      409,
      "Automatic checkout is disabled for webinars. Submit your GCash payment proof for review instead.",
    );
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const submitPaymentProof = async ({
  slug,
  email,
  userId,
  referenceNumber,
  payerName,
  payerGcashNumber,
}) => {
  const cleanSlug = sanitizeText(slug, 150);
  const cleanEmail = email ? normalizeEmail(email) : "";
  const rawUserId = Number(userId);
  const cleanUserId = Number.isInteger(rawUserId) && rawUserId > 0 ? rawUserId : null;
  const cleanReferenceNumber = digitsOnly(referenceNumber).slice(0, 13);
  const cleanPayerName = sanitizeText(payerName, 180);
  const cleanPayerGcashNumber = digitsOnly(payerGcashNumber).slice(0, 11);

  if (!cleanUserId && !cleanEmail) {
    throw new AppError(400, "Either user_id or email is required.");
  }
  if (cleanEmail && !isValidEmail(cleanEmail)) {
    throw new AppError(400, "A valid email is required.");
  }
  if (cleanReferenceNumber.length !== 13) {
    throw new AppError(400, "GCash reference number must be exactly 13 digits.");
  }
  if (cleanPayerName.length < 2) {
    throw new AppError(400, "Payer name is required.");
  }
  if (cleanPayerGcashNumber.length !== 11) {
    throw new AppError(400, "GCash number must be exactly 11 digits.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const webinarResult = await client.query(
      `
        SELECT id, slug, title, start_at, timezone, price_cents
        FROM webinars
        WHERE slug = $1
          AND is_published = true
        LIMIT 1
        FOR UPDATE
      `,
      [cleanSlug],
    );

    if (webinarResult.rows.length === 0) {
      throw new AppError(404, "Webinar not found.");
    }

    const webinar = webinarResult.rows[0];
    if (new Date(webinar.start_at).getTime() <= Date.now()) {
      throw new AppError(409, "This webinar can no longer accept payment submissions.");
    }

    const registrationResult = cleanUserId
      ? await client.query(
          `
            SELECT id, email, full_name, status, payment_required, payment_status
            FROM webinar_registrations
            WHERE webinar_id = $1
              AND (user_id = $2 OR email = $3)
            ORDER BY CASE WHEN user_id = $2 THEN 0 ELSE 1 END
            LIMIT 1
            FOR UPDATE
          `,
          [webinar.id, cleanUserId, cleanEmail],
        )
      : await client.query(
          `
            SELECT id, email, full_name, status, payment_required, payment_status
            FROM webinar_registrations
            WHERE webinar_id = $1
              AND email = $2
            LIMIT 1
            FOR UPDATE
          `,
          [webinar.id, cleanEmail],
        );

    if (registrationResult.rows.length === 0) {
      throw new AppError(404, "Registration not found for this webinar.");
    }

    const registration = registrationResult.rows[0];
    if (registration.status !== "verified") {
      throw new AppError(409, "Please verify your registration email before submitting payment.");
    }
    if (!registration.payment_required) {
      throw new AppError(409, "Payment proof is not required for this webinar.");
    }
    if (registration.payment_status === "paid") {
      throw new AppError(409, "This registration is already marked as paid.");
    }

    const amountCents = resolveWebinarPriceCents(webinar);
    if (amountCents <= 0) {
      throw new AppError(409, "Webinar pricing is not configured.");
    }

    const proofResult = await client.query(
      `
        INSERT INTO webinar_payment_proofs (
          registration_id,
          reference_number,
          payer_name,
          payer_gcash_number,
          amount_cents,
          status,
          review_notes,
          submitted_at,
          reviewed_at,
          reviewed_by
        )
        VALUES ($1, $2, $3, $4, $5, 'submitted', NULL, NOW(), NULL, NULL)
        ON CONFLICT (registration_id) DO UPDATE
        SET
          reference_number = EXCLUDED.reference_number,
          payer_name = EXCLUDED.payer_name,
          payer_gcash_number = EXCLUDED.payer_gcash_number,
          amount_cents = EXCLUDED.amount_cents,
          status = 'submitted',
          review_notes = NULL,
          submitted_at = NOW(),
          reviewed_at = NULL,
          reviewed_by = NULL
        RETURNING
          id,
          reference_number,
          payer_name,
          payer_gcash_number,
          amount_cents,
          status,
          review_notes,
          submitted_at,
          reviewed_at,
          reviewed_by
      `,
      [
        registration.id,
        cleanReferenceNumber,
        cleanPayerName,
        cleanPayerGcashNumber,
        amountCents,
      ],
    );

    await client.query(
      `
        UPDATE webinar_registrations
        SET
          payment_status = 'proof_submitted',
          paid_at = NULL
        WHERE id = $1
      `,
      [registration.id],
    );

    await enqueueEmail(client, {
      toEmail: registration.email,
      templateKey: "webinar.payment_received",
      payload: {
        full_name: registration.full_name,
        webinar_title: webinar.title,
        webinar_slug: webinar.slug,
        webinar_start_at: webinar.start_at,
        webinar_timezone: webinar.timezone,
        amount_cents: amountCents,
        currency: webinarCurrency,
        reference_number: cleanReferenceNumber,
      },
    });

    await client.query("COMMIT");

    return {
      ok: true,
      webinar_slug: webinar.slug,
      email: registration.email,
      payment_status: "proof_submitted",
      proof: {
        ...proofResult.rows[0],
        amount_cents: Number(proofResult.rows[0].amount_cents),
      },
      message: "Payment proof submitted. Our team will review it manually.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listPaymentProofsForWebinar = async ({ slug, status }) => {
  const cleanSlug = sanitizeText(slug, 150);
  const cleanStatus = sanitizeText(status, 40).toLowerCase();
  const values = [cleanSlug];
  let statusClause = "";

  if (cleanStatus && ["submitted", "approved", "rejected"].includes(cleanStatus)) {
    values.push(cleanStatus);
    statusClause = `AND wpp.status = $${values.length}`;
  }

  const result = await pool.query(
    `
      SELECT
        wr.id AS registration_id,
        wr.email,
        wr.full_name,
        wr.status AS registration_status,
        wr.payment_status,
        wr.paid_at,
        wr.zoom_link_sent_at,
        wpp.id AS payment_proof_id,
        wpp.reference_number AS payment_reference_number,
        wpp.payer_name AS payment_payer_name,
        wpp.payer_gcash_number AS payment_payer_gcash_number,
        wpp.amount_cents AS payment_amount_cents,
        wpp.status AS payment_proof_status,
        wpp.review_notes AS payment_review_notes,
        wpp.submitted_at AS payment_submitted_at,
        wpp.reviewed_at AS payment_reviewed_at,
        wpp.reviewed_by AS payment_reviewed_by,
        reviewer.name AS reviewed_by_name
      FROM webinar_registrations wr
      JOIN webinars w ON w.id = wr.webinar_id
      LEFT JOIN webinar_payment_proofs wpp ON wpp.registration_id = wr.id
      LEFT JOIN users reviewer ON reviewer.id = wpp.reviewed_by
      WHERE w.slug = $1
        AND w.is_published = true
        ${statusClause}
      ORDER BY
        CASE wpp.status
          WHEN 'submitted' THEN 0
          WHEN 'rejected' THEN 1
          WHEN 'approved' THEN 2
          ELSE 3
        END,
        COALESCE(wpp.submitted_at, wr.created_at) DESC
    `,
    values,
  );

  return result.rows
    .filter((row) => row.payment_proof_id)
    .map((row) => ({
      registration_id: row.registration_id,
      email: row.email,
      full_name: row.full_name,
      registration_status: row.registration_status,
      payment_status: row.payment_status,
      paid_at: row.paid_at,
      zoom_link_sent_at: row.zoom_link_sent_at,
      payment_proof: {
        id: row.payment_proof_id,
        reference_number: row.payment_reference_number,
        payer_name: row.payment_payer_name,
        payer_gcash_number: row.payment_payer_gcash_number,
        amount_cents: Number(row.payment_amount_cents),
        status: row.payment_proof_status,
        review_notes: row.payment_review_notes,
        submitted_at: row.payment_submitted_at,
        reviewed_at: row.payment_reviewed_at,
        reviewed_by: row.payment_reviewed_by,
        reviewed_by_name: row.reviewed_by_name || null,
      },
    }));
};

export const reviewPaymentProof = async ({
  slug,
  registrationId,
  decision,
  reviewNotes,
  reviewedBy,
}) => {
  const cleanSlug = sanitizeText(slug, 150);
  const cleanRegistrationId = sanitizeText(registrationId, 120);
  const cleanDecision = sanitizeText(decision, 20).toLowerCase();
  const cleanReviewNotes = sanitizeText(reviewNotes, 1000);
  const cleanReviewedBy = Number.isInteger(Number(reviewedBy)) && Number(reviewedBy) > 0
    ? Number(reviewedBy)
    : null;

  if (!["approved", "rejected"].includes(cleanDecision)) {
    throw new AppError(400, "Decision must be either approved or rejected.");
  }
  if (!cleanReviewedBy) {
    throw new AppError(400, "A valid reviewer is required.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT
          wr.id AS registration_id,
          wr.email,
          wr.full_name,
          wr.status,
          wr.payment_required,
          wr.payment_status,
          wr.zoom_registrant_join_url,
          w.slug,
          w.title,
          w.start_at,
          w.timezone,
          w.zoom_join_url,
          w.join_link_delivery_mode,
          wpp.id AS payment_proof_id,
          wpp.reference_number
        FROM webinar_registrations wr
        JOIN webinars w ON w.id = wr.webinar_id
        LEFT JOIN webinar_payment_proofs wpp ON wpp.registration_id = wr.id
        WHERE w.slug = $1
          AND wr.id = $2::uuid
          AND w.is_published = true
        LIMIT 1
        FOR UPDATE OF wr
      `,
      [cleanSlug, cleanRegistrationId],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Payment proof not found for this registration.");
    }

    const registration = result.rows[0];
    if (!registration.payment_proof_id) {
      throw new AppError(404, "No payment proof has been submitted for this registration.");
    }
    if (registration.status !== "verified") {
      throw new AppError(409, "Only verified registrations can be reviewed.");
    }

    await client.query(
      `
        UPDATE webinar_payment_proofs
        SET
          status = $2,
          review_notes = NULLIF($3, ''),
          reviewed_at = NOW(),
          reviewed_by = $4
        WHERE registration_id = $1
      `,
      [registration.registration_id, cleanDecision, cleanReviewNotes, cleanReviewedBy],
    );

    if (cleanDecision === "approved") {
      const joinLinkDeliveryMode = normalizeJoinLinkDeliveryMode(registration.join_link_delivery_mode);
      const joinUrl = registration.zoom_registrant_join_url || registration.zoom_join_url || null;

      await client.query(
        `
          UPDATE webinar_registrations
          SET
            payment_status = 'paid',
            paid_at = COALESCE(paid_at, NOW())
          WHERE id = $1
        `,
        [registration.registration_id],
      );

      if (joinLinkDeliveryMode === "auto" && joinUrl) {
        await enqueueEmail(client, {
          toEmail: registration.email,
          templateKey: "webinar.zoom_link",
          payload: {
            full_name: registration.full_name,
            webinar_title: registration.title,
            webinar_slug: registration.slug,
            webinar_start_at: registration.start_at,
            webinar_timezone: registration.timezone,
            join_url: joinUrl,
          },
        });

        await client.query(
          `
            UPDATE webinar_registrations
            SET
              zoom_link_sent_at = NOW(),
              last_confirmation_email_sent_at = NOW()
            WHERE id = $1
          `,
          [registration.registration_id],
        );
      } else {
        await enqueueEmail(client, {
          toEmail: registration.email,
          templateKey: "webinar.payment_approved",
          payload: {
            full_name: registration.full_name,
            webinar_title: registration.title,
            webinar_slug: registration.slug,
            webinar_start_at: registration.start_at,
            webinar_timezone: registration.timezone,
          },
        });
      }
    } else {
      await client.query(
        `
          UPDATE webinar_registrations
          SET
            payment_status = 'rejected',
            paid_at = NULL
          WHERE id = $1
        `,
        [registration.registration_id],
      );
    }

    await client.query("COMMIT");

    return {
      ok: true,
      webinar_slug: registration.slug,
      registration_id: registration.registration_id,
      payment_status: cleanDecision === "approved" ? "paid" : "rejected",
      message:
        cleanDecision === "approved"
          ? "Payment approved successfully."
          : "Payment proof rejected.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const sendZoomLinksForWebinar = async ({ slug }) => {
  const cleanSlug = sanitizeText(slug, 150);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const webinarResult = await client.query(
      `
        SELECT id, slug, title, start_at, timezone, zoom_join_url
        FROM webinars
        WHERE slug = $1
          AND is_published = true
        LIMIT 1
        FOR UPDATE
      `,
      [cleanSlug],
    );

    if (webinarResult.rows.length === 0) {
      throw new AppError(404, "Webinar not found.");
    }

    const webinar = webinarResult.rows[0];
    if (!webinar.zoom_join_url) {
      throw new AppError(409, "This webinar does not have a Zoom join link configured yet.");
    }

    const registrationsResult = await client.query(
      `
        SELECT id, email, full_name, zoom_registrant_join_url
        FROM webinar_registrations
        WHERE webinar_id = $1
          AND status = 'verified'
          AND payment_status = 'paid'
          AND zoom_link_sent_at IS NULL
        FOR UPDATE
      `,
      [webinar.id],
    );

    for (const registration of registrationsResult.rows) {
      const joinUrl = registration.zoom_registrant_join_url || webinar.zoom_join_url;
      await enqueueEmail(client, {
        toEmail: registration.email,
        templateKey: "webinar.zoom_link",
        payload: {
          full_name: registration.full_name,
          webinar_title: webinar.title,
          webinar_slug: webinar.slug,
          webinar_start_at: webinar.start_at,
          webinar_timezone: webinar.timezone,
          join_url: joinUrl,
        },
      });
    }

    const registrationIds = registrationsResult.rows.map((row) => row.id);
    if (registrationIds.length > 0) {
      await client.query(
        `
          UPDATE webinar_registrations
          SET
            zoom_link_sent_at = NOW(),
            last_confirmation_email_sent_at = NOW()
          WHERE id = ANY($1::uuid[])
        `,
        [registrationIds],
      );
    }

    await client.query("COMMIT");

    return {
      ok: true,
      webinar_slug: webinar.slug,
      sent_count: registrationIds.length,
      message:
        registrationIds.length > 0
          ? `Zoom link emails queued for ${registrationIds.length} attendee(s).`
          : "No approved attendees were waiting for a Zoom link.",
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
      throw new AppError(429, "Too many resend attempts. Please retry later.", {
        retry_after_seconds: resendRateLimit.retryAfterSeconds,
      });
    }

    const registrationResult = await client.query(
      `
        SELECT
          id,
          full_name,
          status,
          payment_required,
          payment_status,
          last_confirmation_email_sent_at,
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
    if (registration.payment_required && registration.payment_status !== "paid") {
      throw new AppError(409, "Payment is still pending for this registration.");
    }
    if (!webinar.zoom_join_url && !registration.zoom_registrant_join_url) {
      throw new AppError(409, "Zoom link is not configured for this webinar yet.");
    }
    if (resendCooldownSeconds > 0 && registration.last_confirmation_email_sent_at) {
      const lastSentAtMs = new Date(registration.last_confirmation_email_sent_at).getTime();
      if (Number.isFinite(lastSentAtMs)) {
        const elapsedSeconds = Math.floor((Date.now() - lastSentAtMs) / 1000);
        if (elapsedSeconds < resendCooldownSeconds) {
          throw new AppError(
            429,
            "Zoom link email was sent recently. Please wait before requesting again.",
            {
              retry_after_seconds: resendCooldownSeconds - elapsedSeconds,
            },
          );
        }
      }
    }

    const joinUrl = registration.zoom_registrant_join_url || webinar.zoom_join_url || null;
    await enqueueEmail(client, {
      toEmail: cleanEmail,
      templateKey: "webinar.zoom_link",
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
      message: "Zoom link email queued.",
      next_allowed_in_seconds: resendCooldownSeconds,
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

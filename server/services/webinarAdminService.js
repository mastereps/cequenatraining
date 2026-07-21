import { pool } from "../db.js";
import { AppError } from "../utils/errors.js";
import { normalizeSlug, parseDateInput } from "../utils/validation.js";
import { enqueueEmail } from "./emailOutboxService.js";
import { mapWebinar, webinarSelectSql } from "./webinarService.js";

/** Columns an admin may write. Order matters only for readability. */
const EDITABLE_COLUMNS = [
  "slug",
  "title",
  "topic",
  "description",
  "start_at",
  "end_at",
  "timezone",
  "capacity",
  "price_cents",
  "is_published",
  "registration_open",
  "zoom_join_url",
  "poster_image_url",
  "payment_qr_image_url",
  "payment_instructions",
  "join_link_delivery_mode",
];

const trimmed = (value, maxLength) => String(value ?? "").trim().slice(0, maxLength);

const parseNullableUrl = (value, label) => {
  const url = trimmed(value, 2000);
  if (!url) return null;
  // Rendered as an anchor and as an <img src>, so a `javascript:` value here
  // would be a stored XSS. Site-relative paths are allowed for bundled assets.
  if (!/^(https?:\/\/\S+|\/\S*)$/i.test(url)) {
    throw new AppError(400, `${label} must be a full http(s) link or a /path.`);
  }
  return url;
};

// Both columns are nullable: no capacity means unlimited seats, no price means free.
const parseNullableInteger = (value, label) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(400, `${label} must be a whole number, 0 or more.`);
  }
  return parsed;
};

/**
 * Validates the editable webinar columns. With `partial`, absent keys are left
 * out so a PATCH only touches what it sent.
 *
 * Note that start/end are only compared to each other when both are present -
 * a PATCH that moves just one of them is checked against the stored row by
 * `assertChronological` once the current values are known.
 */
export const parseWebinarInput = (payload, { partial = false } = {}) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError(400, "A webinar payload is required.");
  }

  const fields = {};
  const has = (key) => payload[key] !== undefined;

  if (!partial || has("title")) {
    const title = trimmed(payload.title, 300);
    if (!title) throw new AppError(400, "A title is required.");
    fields.title = title;
  }

  if (!partial || has("slug")) {
    // A blank slug on create is derived from the title.
    const slug = normalizeSlug(payload.slug || (partial ? "" : payload.title), 150);
    if (!slug) throw new AppError(400, "A url slug is required.");
    fields.slug = slug;
  }

  if (!partial || has("description")) {
    const description = trimmed(payload.description, 20000);
    if (!description) throw new AppError(400, "A description is required.");
    fields.description = description;
  }

  if (!partial || has("topic")) {
    fields.topic = trimmed(payload.topic, 80) || "General";
  }

  if (!partial || has("timezone")) {
    fields.timezone = trimmed(payload.timezone, 80) || "Asia/Manila";
  }

  if (!partial || has("start_at")) {
    const startAt = parseDateInput(payload.start_at);
    if (!startAt) throw new AppError(400, "A valid start date and time is required.");
    fields.start_at = startAt.toISOString();
  }

  if (!partial || has("end_at")) {
    const endAt = parseDateInput(payload.end_at);
    if (!endAt) throw new AppError(400, "A valid end date and time is required.");
    fields.end_at = endAt.toISOString();
  }

  if (fields.start_at && fields.end_at && fields.end_at <= fields.start_at) {
    throw new AppError(400, "The end time must be after the start time.");
  }

  if (!partial || has("capacity")) {
    fields.capacity = parseNullableInteger(payload.capacity, "Capacity");
  }

  if (!partial || has("price_cents")) {
    fields.price_cents = parseNullableInteger(payload.price_cents, "Price");
  }

  if (!partial || has("is_published")) {
    fields.is_published = Boolean(payload.is_published);
  }

  // A new webinar opens for registration unless the form says otherwise.
  if (!partial || has("registration_open")) {
    fields.registration_open = has("registration_open")
      ? Boolean(payload.registration_open)
      : true;
  }

  if (has("zoom_join_url")) {
    fields.zoom_join_url = parseNullableUrl(payload.zoom_join_url, "The Zoom link");
  }
  if (has("poster_image_url")) {
    fields.poster_image_url = parseNullableUrl(payload.poster_image_url, "The poster image");
  }
  if (has("payment_qr_image_url")) {
    fields.payment_qr_image_url = parseNullableUrl(
      payload.payment_qr_image_url,
      "The payment QR image",
    );
  }
  if (has("payment_instructions")) {
    fields.payment_instructions = trimmed(payload.payment_instructions, 5000) || null;
  }
  if (has("join_link_delivery_mode")) {
    const mode = trimmed(payload.join_link_delivery_mode, 20).toLowerCase();
    if (mode !== "auto" && mode !== "manual") {
      throw new AppError(400, "Join link delivery must be either auto or manual.");
    }
    fields.join_link_delivery_mode = mode;
  }

  return fields;
};

/** Guards the `end_at > start_at` invariant when a PATCH moves only one side. */
export const assertChronological = (fields, currentRow) => {
  const startAt = new Date(fields.start_at ?? currentRow.start_at).getTime();
  const endAt = new Date(fields.end_at ?? currentRow.end_at).getTime();
  if (!(endAt > startAt)) {
    throw new AppError(400, "The end time must be after the start time.");
  }
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? ""));

const requireWebinarId = (id) => {
  if (!isUuid(id)) throw new AppError(404, "Webinar not found.");
  return String(id);
};

const findWebinarById = async (client, id, { forUpdate = false } = {}) => {
  const result = await client.query(
    `SELECT * FROM webinars WHERE id = $1 LIMIT 1 ${forUpdate ? "FOR UPDATE" : ""}`,
    [requireWebinarId(id)],
  );
  if (result.rows.length === 0) throw new AppError(404, "Webinar not found.");
  return result.rows[0];
};

/**
 * The public payload deliberately omits the Zoom link - it is only mailed to
 * confirmed registrants - so the admin view adds it back on top.
 */
const mapAdminWebinar = (row) => ({
  ...mapWebinar(row),
  zoom_join_url: row.zoom_join_url || null,
});

/** Re-reads through the shared select so admins see the same seat maths as the site. */
const readWebinar = async (client, id) => {
  const result = await client.query(`${webinarSelectSql} WHERE w.id = $1 LIMIT 1`, [id]);
  return mapAdminWebinar(result.rows[0]);
};

const assertSlugAvailable = async (client, slug, excludeId = null) => {
  const result = await client.query(
    "SELECT id FROM webinars WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2) LIMIT 1",
    [slug, excludeId],
  );
  if (result.rows.length > 0) {
    throw new AppError(409, `The url slug "${slug}" is already taken.`);
  }
};

/**
 * Every webinar - drafts, finished, and archived alike. The admin table tabs
 * filter this in the browser; the whole catalogue is a few dozen rows at most.
 */
export const listWebinarsForAdmin = async () => {
  const result = await pool.query(`${webinarSelectSql} ORDER BY w.start_at DESC`);
  return result.rows.map(mapAdminWebinar);
};

export const createWebinar = async (payload) => {
  const fields = parseWebinarInput(payload);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertSlugAvailable(client, fields.slug);

    const columns = EDITABLE_COLUMNS.filter((column) => fields[column] !== undefined);
    const inserted = await client.query(
      `
        INSERT INTO webinars (${columns.join(", ")})
        VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})
        RETURNING id
      `,
      columns.map((column) => fields[column]),
    );

    const webinar = await readWebinar(client, inserted.rows[0].id);
    await client.query("COMMIT");
    return webinar;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateWebinar = async (id, payload) => {
  const fields = parseWebinarInput(payload, { partial: true });
  const columns = EDITABLE_COLUMNS.filter((column) => fields[column] !== undefined);
  if (columns.length === 0) {
    throw new AppError(400, "No editable fields were provided.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const current = await findWebinarById(client, id, { forUpdate: true });
    assertChronological(fields, current);
    if (fields.slug) await assertSlugAvailable(client, fields.slug, current.id);

    await client.query(
      `
        UPDATE webinars
        SET ${columns.map((column, index) => `${column} = $${index + 2}`).join(", ")}
        WHERE id = $1
      `,
      [current.id, ...columns.map((column) => fields[column])],
    );

    const webinar = await readWebinar(client, current.id);
    await client.query("COMMIT");
    return webinar;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Moving an event is separated from `updateWebinar` because it is the one edit
 * that invalidates what registrants were already told. Notification emails are
 * queued in the same transaction as the move - per the outbox pattern, nothing
 * is sent in the request path.
 */
export const rescheduleWebinar = async (id, { start_at, end_at, timezone, notify_registrants }) => {
  const fields = parseWebinarInput(
    { start_at, end_at, ...(timezone === undefined ? {} : { timezone }) },
    { partial: true },
  );
  if (fields.start_at === undefined && fields.end_at === undefined) {
    throw new AppError(400, "A new start or end time is required.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const current = await findWebinarById(client, id, { forUpdate: true });
    assertChronological(fields, current);

    const columns = ["start_at", "end_at", "timezone"].filter(
      (column) => fields[column] !== undefined,
    );
    await client.query(
      `
        UPDATE webinars
        SET ${columns.map((column, index) => `${column} = $${index + 2}`).join(", ")}
        WHERE id = $1
      `,
      [current.id, ...columns.map((column) => fields[column])],
    );

    let notifiedCount = 0;
    if (notify_registrants) {
      // Only verified registrants: pending ones never confirmed the address, and
      // cancelled ones opted out.
      const recipients = await client.query(
        `
          SELECT email, full_name
          FROM webinar_registrations
          WHERE webinar_id = $1
            AND status = 'verified'
        `,
        [current.id],
      );

      for (const recipient of recipients.rows) {
        await enqueueEmail(client, {
          toEmail: recipient.email,
          templateKey: "webinar.rescheduled",
          payload: {
            full_name: recipient.full_name,
            webinar_title: current.title,
            webinar_slug: current.slug,
            previous_start_at: current.start_at,
            previous_timezone: current.timezone,
            webinar_start_at: fields.start_at ?? current.start_at,
            webinar_end_at: fields.end_at ?? current.end_at,
            webinar_timezone: fields.timezone ?? current.timezone,
            queued_at: new Date().toISOString(),
          },
        });
      }

      notifiedCount = recipients.rowCount;
    }

    const webinar = await readWebinar(client, current.id);
    await client.query("COMMIT");
    return { webinar, notified_count: notifiedCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Archive instead of delete. Registrations, payment sessions, and payment proofs
 * all cascade off `webinars`, so a real DELETE would take the money trail with it.
 */
export const setWebinarArchived = async (id, archived) => {
  const client = await pool.connect();

  try {
    const current = await findWebinarById(client, id);
    await client.query("UPDATE webinars SET archived_at = $2 WHERE id = $1", [
      current.id,
      archived ? new Date().toISOString() : null,
    ]);
    return await readWebinar(client, current.id);
  } finally {
    client.release();
  }
};

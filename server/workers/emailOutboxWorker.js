import nodemailer from "nodemailer";
import { pool } from "../db.js";
import { logger } from "../utils/logger.js";

const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
const dryRun = process.env.EMAIL_OUTBOX_DRY_RUN === "true";

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true";

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number.isNaN(smtpPort) ? 587 : smtpPort,
        secure: smtpSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const toManilaDateTime = (iso) => {
  if (!iso) return "TBD";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
};

const renderTemplate = (templateKey, payload) => {
  if (templateKey === "webinar.verify") {
    const schedule = toManilaDateTime(payload.webinar_start_at);
    return {
      subject: `Verify your webinar reservation: ${payload.webinar_title}`,
      text: [
        `Hi ${payload.full_name},`,
        "",
        `Please verify your reservation for "${payload.webinar_title}".`,
        `Schedule: ${schedule} (${payload.webinar_timezone || "Asia/Manila"})`,
        "",
        `Verify here: ${payload.verify_url}`,
        "",
        "If you did not request this registration, you can ignore this email.",
      ].join("\n"),
      html: `
        <p>Hi ${escapeHtml(payload.full_name)},</p>
        <p>Please verify your reservation for <strong>${escapeHtml(payload.webinar_title)}</strong>.</p>
        <p><strong>Schedule:</strong> ${escapeHtml(schedule)} (${escapeHtml(payload.webinar_timezone || "Asia/Manila")})</p>
        <p><a href="${escapeHtml(payload.verify_url)}">Verify my registration</a></p>
        <p>If you did not request this registration, you can ignore this email.</p>
      `,
    };
  }

  if (templateKey === "webinar.confirmed") {
    const schedule = toManilaDateTime(payload.webinar_start_at);
    const joinInstruction = payload.join_url
      ? `Join link: ${payload.join_url}`
      : "Join link will be shared by the organizer before the webinar starts.";
    const joinHtml = payload.join_url
      ? `<p><a href="${escapeHtml(payload.join_url)}">Join webinar</a></p>`
      : "<p>Join link will be shared by the organizer before the webinar starts.</p>";

    return {
      subject: `You're confirmed: ${payload.webinar_title}`,
      text: [
        `Hi ${payload.full_name},`,
        "",
        `Your registration for "${payload.webinar_title}" is confirmed.`,
        `Schedule: ${schedule} (${payload.webinar_timezone || "Asia/Manila"})`,
        "",
        joinInstruction,
      ].join("\n"),
      html: `
        <p>Hi ${escapeHtml(payload.full_name)},</p>
        <p>Your registration for <strong>${escapeHtml(payload.webinar_title)}</strong> is confirmed.</p>
        <p><strong>Schedule:</strong> ${escapeHtml(schedule)} (${escapeHtml(payload.webinar_timezone || "Asia/Manila")})</p>
        ${joinHtml}
      `,
    };
  }

  return {
    subject: "Notification",
    text: JSON.stringify(payload),
    html: `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`,
  };
};

const fetchBatch = async (batchSize) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `
        SELECT id, to_email, template_key, payload_json, attempts
        FROM email_outbox
        WHERE status IN ('pending', 'failed')
          AND attempts < 5
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
      [batchSize],
    );

    if (result.rows.length === 0) {
      await client.query("COMMIT");
      return [];
    }

    const ids = result.rows.map((row) => row.id);
    await client.query(
      `
        UPDATE email_outbox
        SET status = 'sending', attempts = attempts + 1
        WHERE id = ANY($1::uuid[])
      `,
      [ids],
    );

    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const markSent = async (id) => {
  await pool.query(
    `
      UPDATE email_outbox
      SET status = 'sent', sent_at = NOW(), last_error = NULL
      WHERE id = $1
    `,
    [id],
  );
};

const markFailed = async (id, errorMessage) => {
  await pool.query(
    `
      UPDATE email_outbox
      SET status = 'failed', last_error = $2
      WHERE id = $1
    `,
    [id, errorMessage.slice(0, 2000)],
  );
};

const sendOutboxMessage = async (message) => {
  const rendered = renderTemplate(message.template_key, message.payload_json || {});

  if (dryRun || !transporter) {
    logger.info("email_outbox_dry_run", {
      outbox_id: message.id,
      to_email: message.to_email,
      template_key: message.template_key,
      subject: rendered.subject,
    });
    return;
  }

  await transporter.sendMail({
    from: fromAddress,
    to: message.to_email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
};

export const startEmailOutboxWorker = ({
  intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS || 5000),
  batchSize = Number(process.env.EMAIL_WORKER_BATCH_SIZE || 10),
} = {}) => {
  const enabled = process.env.EMAIL_WORKER_ENABLED !== "false";
  if (!enabled) {
    logger.info("email_outbox_worker_disabled");
    return () => {};
  }

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      const batch = await fetchBatch(batchSize);
      if (batch.length === 0) return;

      for (const message of batch) {
        try {
          await sendOutboxMessage(message);
          await markSent(message.id);
          logger.info("email_outbox_sent", {
            outbox_id: message.id,
            to_email: message.to_email,
            template_key: message.template_key,
          });
        } catch (error) {
          const text = error instanceof Error ? error.message : "Unknown mail error";
          await markFailed(message.id, text);
          logger.error("email_outbox_failed", {
            outbox_id: message.id,
            to_email: message.to_email,
            template_key: message.template_key,
            error,
          });
        }
      }
    } catch (error) {
      logger.error("email_outbox_worker_tick_failed", { error });
    } finally {
      running = false;
    }
  };

  const interval = setInterval(() => {
    void tick();
  }, intervalMs);

  void tick();
  logger.info("email_outbox_worker_started", { intervalMs, batchSize, dryRun, smtp_ready: Boolean(transporter) });

  return () => clearInterval(interval);
};

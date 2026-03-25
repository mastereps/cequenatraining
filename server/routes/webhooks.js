import express from "express";
import { pool } from "../db.js";
import { enqueueEmail } from "../services/emailOutboxService.js";
import { verifyPaymongoSignature } from "../services/paymongo.js";
import { logger } from "../utils/logger.js";

const router = express.Router();
const PAYMONGO_PROVIDER = "paymongo";

const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) =>
  typeof value === "string" && UUID_PATTERN.test(value.trim());

const toPaymentIdFromPaymentsList = (payments) => {
  if (Array.isArray(payments)) {
    for (const payment of payments) {
      const id =
        typeof payment === "string"
          ? payment
          : pickFirstString(payment?.id, payment?.data?.id);
      if (id) return id;
    }
  }

  if (Array.isArray(payments?.data)) {
    for (const payment of payments.data) {
      const id =
        typeof payment === "string"
          ? payment
          : pickFirstString(payment?.id, payment?.data?.id);
      if (id) return id;
    }
  }

  return pickFirstString(
    typeof payments === "string" ? payments : null,
    payments?.id,
    payments?.data?.id,
  );
};

const extractEventContext = (payload) => {
  const event = payload?.data ?? {};
  const eventAttributes = event?.attributes ?? {};
  const resource = eventAttributes?.data ?? {};
  const resourceAttributes = resource?.attributes ?? {};

  const eventId = pickFirstString(event?.id);
  const eventType = pickFirstString(eventAttributes?.type, event?.type);

  const orderIdCandidate = pickFirstString(
    resourceAttributes?.metadata?.order_id,
    resourceAttributes?.order_id,
    resourceAttributes?.reference_number,
  );

  const checkoutSessionId = pickFirstString(
    resource?.type === "checkout_session" ? resource?.id : null,
    resourceAttributes?.checkout_session_id,
    resourceAttributes?.checkout_id,
    resourceAttributes?.checkout_session?.id,
    eventAttributes?.checkout_session_id,
  );

  const paymentId = pickFirstString(
    resource?.type === "payment" ? resource?.id : null,
    resourceAttributes?.payment_id,
    resourceAttributes?.payment?.id,
    toPaymentIdFromPaymentsList(resourceAttributes?.payments),
    eventAttributes?.payment_id,
  );

  const amount = Number(
    resourceAttributes?.amount ??
      resourceAttributes?.amount_paid ??
      resourceAttributes?.amount_total,
  );

  const currencyCandidate = pickFirstString(
    resourceAttributes?.currency,
    resourceAttributes?.amount_details?.currency,
  );

  return {
    eventId,
    eventType,
    resource,
    orderIdCandidate,
    checkoutSessionId,
    paymentId,
    amountCents: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null,
    currency: currencyCandidate ? currencyCandidate.toUpperCase() : null,
  };
};

const readOrderByIdForUpdate = async (client, orderId) => {
  if (!isUuid(orderId)) return null;
  const result = await client.query(
    `
      SELECT id, status, payment_status, subtotal_cents, total_cents, currency
      FROM orders
      WHERE id = $1
      FOR UPDATE
    `,
    [orderId],
  );
  return result.rows[0] || null;
};

const resolveOrderForEvent = async (client, context) => {
  const { orderIdCandidate, checkoutSessionId, paymentId } = context;

  const byId = await readOrderByIdForUpdate(client, orderIdCandidate);
  if (byId) return byId;

  if (checkoutSessionId) {
    const byCheckoutId = await client.query(
      `
        SELECT id, status, payment_status, subtotal_cents, total_cents, currency
        FROM orders
        WHERE provider_checkout_id = $1
        FOR UPDATE
      `,
      [checkoutSessionId],
    );

    if (byCheckoutId.rows[0]) return byCheckoutId.rows[0];
  }

  if (paymentId) {
    const byPaymentId = await client.query(
      `
        SELECT o.id, o.status, o.payment_status, o.subtotal_cents, o.total_cents, o.currency
        FROM orders o
        JOIN payments p ON p.order_id = o.id
        WHERE p.provider = $1
          AND p.provider_payment_id = $2
        LIMIT 1
        FOR UPDATE OF o
      `,
      [PAYMONGO_PROVIDER, paymentId],
    );

    if (byPaymentId.rows[0]) return byPaymentId.rows[0];
  }

  return null;
};

const resolveWebinarPaymentSessionForEvent = async (client, context) => {
  const { checkoutSessionId, paymentId } = context;

  if (checkoutSessionId) {
    const byCheckoutId = await client.query(
      `
        SELECT
          wps.id,
          wps.registration_id,
          wps.provider_checkout_id,
          wps.provider_payment_id,
          wps.status AS session_status,
          wps.amount_cents,
          wps.currency,
          wr.status AS registration_status,
          wr.payment_required,
          wr.payment_status,
          wr.paid_at,
          wr.last_confirmation_email_sent_at,
          wr.zoom_link_sent_at,
          wr.email,
          wr.full_name,
          wr.zoom_registrant_join_url,
          w.slug,
          w.title,
          w.start_at,
          w.timezone,
          w.zoom_join_url,
          w.join_link_delivery_mode
        FROM webinar_payment_sessions wps
        JOIN webinar_registrations wr ON wr.id = wps.registration_id
        JOIN webinars w ON w.id = wr.webinar_id
        WHERE wps.provider = $1
          AND wps.provider_checkout_id = $2
        LIMIT 1
        FOR UPDATE OF wps, wr
      `,
      [PAYMONGO_PROVIDER, checkoutSessionId],
    );

    if (byCheckoutId.rows[0]) return byCheckoutId.rows[0];
  }

  if (!paymentId) return null;

  const byPaymentId = await client.query(
    `
      SELECT
        wps.id,
        wps.registration_id,
        wps.provider_checkout_id,
        wps.provider_payment_id,
        wps.status AS session_status,
        wps.amount_cents,
        wps.currency,
        wr.status AS registration_status,
        wr.payment_required,
        wr.payment_status,
        wr.paid_at,
        wr.last_confirmation_email_sent_at,
        wr.zoom_link_sent_at,
        wr.email,
        wr.full_name,
        wr.zoom_registrant_join_url,
        w.slug,
        w.title,
        w.start_at,
        w.timezone,
        w.zoom_join_url,
        w.join_link_delivery_mode
      FROM webinar_payment_sessions wps
      JOIN webinar_registrations wr ON wr.id = wps.registration_id
      JOIN webinars w ON w.id = wr.webinar_id
      WHERE wps.provider = $1
        AND wps.provider_payment_id = $2
      LIMIT 1
      FOR UPDATE OF wps, wr
    `,
    [PAYMONGO_PROVIDER, paymentId],
  );

  return byPaymentId.rows[0] || null;
};

const updateWebinarPaymentSession = async ({
  client,
  sessionId,
  providerPaymentId,
  status,
  rawPayloadJson,
  amountCents,
  currency,
}) => {
  await client.query(
    `
      UPDATE webinar_payment_sessions
      SET provider_payment_id = COALESCE($2, provider_payment_id),
          status = $3,
          amount_cents = COALESCE($4, amount_cents),
          currency = COALESCE($5, currency),
          raw_payload = $6::jsonb,
          updated_at = NOW()
      WHERE id = $1
    `,
    [sessionId, providerPaymentId, status, amountCents, currency, rawPayloadJson],
  );
};

const markWebinarRegistrationPaid = async (client, registrationId) => {
  await client.query(
    `
      UPDATE webinar_registrations
      SET payment_status = 'paid',
          paid_at = COALESCE(paid_at, NOW())
      WHERE id = $1
        AND payment_required = true
    `,
    [registrationId],
  );
};

const markWebinarRegistrationFailed = async (client, registrationId) => {
  await client.query(
    `
      UPDATE webinar_registrations
      SET payment_status = CASE
            WHEN payment_status = 'paid' THEN payment_status
            ELSE 'rejected'
          END
      WHERE id = $1
        AND payment_required = true
    `,
    [registrationId],
  );
};

const markWebinarRegistrationRefunded = async (client, registrationId) => {
  await client.query(
    `
      UPDATE webinar_registrations
      SET payment_status = 'refunded'
      WHERE id = $1
        AND payment_required = true
    `,
    [registrationId],
  );
};

const markWebinarRegistrationRefundFailed = async (client, registrationId) => {
  await client.query(
    `
      UPDATE webinar_registrations
      SET payment_status = CASE
            WHEN payment_status = 'refunded' THEN 'paid'
            ELSE payment_status
          END
      WHERE id = $1
        AND payment_required = true
    `,
    [registrationId],
  );
};

const enqueueWebinarConfirmationIfNeeded = async (client, registration) => {
  if (registration.registration_status !== "verified") return false;
  if (!registration.payment_required) return false;

  const joinUrl = registration.zoom_registrant_join_url || registration.zoom_join_url || null;
  const joinLinkDeliveryMode =
    String(registration.join_link_delivery_mode || "auto").trim().toLowerCase() === "manual"
      ? "manual"
      : "auto";

  await enqueueEmail(client, {
    toEmail: registration.email,
    templateKey: joinLinkDeliveryMode === "auto" && joinUrl ? "webinar.zoom_link" : "webinar.payment_approved",
    payload: {
      full_name: registration.full_name,
      webinar_title: registration.title,
      webinar_slug: registration.slug,
      webinar_start_at: registration.start_at,
      webinar_timezone: registration.timezone,
      join_url: joinUrl,
    },
  });

  if (joinLinkDeliveryMode === "auto" && joinUrl) {
    await client.query(
      `
        UPDATE webinar_registrations
        SET
          last_confirmation_email_sent_at = COALESCE(last_confirmation_email_sent_at, NOW()),
          zoom_link_sent_at = COALESCE(zoom_link_sent_at, NOW())
        WHERE id = $1
      `,
      [registration.registration_id],
    );
  }

  return true;
};

const upsertPaymentByProviderPaymentId = async ({
  client,
  orderId,
  providerPaymentId,
  amountCents,
  currency,
  status,
  rawPayloadJson,
}) => {
  if (providerPaymentId) {
    await client.query(
      `
        INSERT INTO payments (
          order_id,
          provider,
          provider_payment_id,
          amount_cents,
          currency,
          status,
          raw_payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        ON CONFLICT (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL
        DO UPDATE SET
          order_id = EXCLUDED.order_id,
          amount_cents = EXCLUDED.amount_cents,
          currency = EXCLUDED.currency,
          status = EXCLUDED.status,
          raw_payload = EXCLUDED.raw_payload,
          updated_at = NOW()
      `,
      [
        orderId,
        PAYMONGO_PROVIDER,
        providerPaymentId,
        amountCents,
        currency,
        status,
        rawPayloadJson,
      ],
    );
    return;
  }

  const existing = await client.query(
    `
      SELECT id
      FROM payments
      WHERE order_id = $1
        AND provider = $2
        AND provider_payment_id IS NULL
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `,
    [orderId, PAYMONGO_PROVIDER],
  );

  if (existing.rows[0]) {
    await client.query(
      `
        UPDATE payments
        SET amount_cents = $2,
            currency = $3,
            status = $4,
            raw_payload = $5::jsonb,
            updated_at = NOW()
        WHERE id = $1
      `,
      [existing.rows[0].id, amountCents, currency, status, rawPayloadJson],
    );
    return;
  }

  await client.query(
    `
      INSERT INTO payments (
        order_id,
        provider,
        provider_payment_id,
        amount_cents,
        currency,
        status,
        raw_payload
      )
      VALUES ($1, $2, NULL, $3, $4, $5, $6::jsonb)
    `,
    [orderId, PAYMONGO_PROVIDER, amountCents, currency, status, rawPayloadJson],
  );
};

const markOrderPaid = async (client, orderId) => {
  await client.query(
    `
      UPDATE orders
      SET payment_status = 'paid',
          status = 'completed',
          provider = $2,
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
      WHERE id = $1
    `,
    [orderId, PAYMONGO_PROVIDER],
  );
};

const markOrderFailed = async (client, orderId) => {
  await client.query(
    `
      UPDATE orders
      SET payment_status = CASE
            WHEN payment_status = 'paid' THEN payment_status
            ELSE 'failed'
          END,
          status = CASE
            WHEN payment_status = 'paid' THEN status
            ELSE 'cancelled'
          END,
          updated_at = NOW()
      WHERE id = $1
    `,
    [orderId],
  );
};

const markOrderRefunded = async (client, orderId) => {
  await client.query(
    `
      UPDATE orders
      SET payment_status = 'refunded',
          status = 'refunded',
          updated_at = NOW()
      WHERE id = $1
    `,
    [orderId],
  );
};

const markOrderRefundPending = async (client, orderId) => {
  await client.query(
    `
      UPDATE orders
      SET payment_status = CASE
            WHEN payment_status = 'refunded' THEN payment_status
            WHEN payment_status = 'paid' THEN 'refund_pending'
            ELSE payment_status
          END,
          status = CASE
            WHEN status = 'completed' THEN 'processing_refund'
            ELSE status
          END,
          updated_at = NOW()
      WHERE id = $1
    `,
    [orderId],
  );
};

const markOrderRefundFailed = async (client, orderId) => {
  await client.query(
    `
      UPDATE orders
      SET payment_status = CASE
            WHEN payment_status = 'refund_pending' THEN 'paid'
            ELSE payment_status
          END,
          status = CASE
            WHEN status = 'processing_refund' THEN 'completed'
            ELSE status
          END,
          updated_at = NOW()
      WHERE id = $1
    `,
    [orderId],
  );
};

const getRefundStateFromResource = (resource) => {
  const status = pickFirstString(
    resource?.attributes?.status,
    resource?.attributes?.refund?.status,
    resource?.attributes?.refund_status,
  );

  const normalized = String(status || "").toLowerCase();
  if (
    normalized.includes("success") ||
    normalized.includes("succeed") ||
    normalized === "paid" ||
    normalized === "refunded"
  ) {
    return "refunded";
  }

  if (normalized.includes("fail") || normalized.includes("cancel")) {
    return "refund_failed";
  }

  return "refund_pending";
};

const processPaymongoEvent = async ({ payload, context }) => {
  const rawPayloadJson = JSON.stringify(payload ?? {});
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertedEvent = await client.query(
      `
        INSERT INTO payment_events (provider_event_id, event_type, payload)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (provider_event_id) DO NOTHING
        RETURNING id
      `,
      [context.eventId, context.eventType, rawPayloadJson],
    );

    if (insertedEvent.rowCount === 0) {
      await client.query("COMMIT");
      return { duplicate: true, handled: true, action: "duplicate" };
    }

    const order = await resolveOrderForEvent(client, context);
    if (order) {
      const fallbackAmount = Number(order.total_cents ?? order.subtotal_cents ?? 0);
      const amountCents =
        context.amountCents && context.amountCents > 0
          ? context.amountCents
          : Math.max(1, Math.round(fallbackAmount));
      const currency = context.currency || String(order.currency || "PHP").toUpperCase();

      if (context.eventType === "checkout_session.payment.paid") {
        await upsertPaymentByProviderPaymentId({
          client,
          orderId: order.id,
          providerPaymentId: context.paymentId,
          amountCents,
          currency,
          status: "paid",
          rawPayloadJson,
        });
        await markOrderPaid(client, order.id);
        await client.query("COMMIT");
        return {
          duplicate: false,
          handled: true,
          action: "marked_paid",
          orderId: order.id,
        };
      }

      if (context.eventType === "payment.failed") {
        await upsertPaymentByProviderPaymentId({
          client,
          orderId: order.id,
          providerPaymentId: context.paymentId,
          amountCents,
          currency,
          status: "failed",
          rawPayloadJson,
        });
        await markOrderFailed(client, order.id);
        await client.query("COMMIT");
        return {
          duplicate: false,
          handled: true,
          action: "marked_failed",
          orderId: order.id,
        };
      }

      if (context.eventType === "payment.refunded") {
        await upsertPaymentByProviderPaymentId({
          client,
          orderId: order.id,
          providerPaymentId: context.paymentId,
          amountCents,
          currency,
          status: "refunded",
          rawPayloadJson,
        });
        await markOrderRefunded(client, order.id);
        await client.query("COMMIT");
        return {
          duplicate: false,
          handled: true,
          action: "marked_refunded",
          orderId: order.id,
        };
      }

      if (context.eventType === "payment.refund.updated") {
        const refundState = getRefundStateFromResource(context.resource);
        await upsertPaymentByProviderPaymentId({
          client,
          orderId: order.id,
          providerPaymentId: context.paymentId,
          amountCents,
          currency,
          status: refundState,
          rawPayloadJson,
        });

        if (refundState === "refunded") {
          await markOrderRefunded(client, order.id);
        } else if (refundState === "refund_failed") {
          await markOrderRefundFailed(client, order.id);
        } else {
          await markOrderRefundPending(client, order.id);
        }

        await client.query("COMMIT");
        return {
          duplicate: false,
          handled: true,
          action: refundState,
          orderId: order.id,
        };
      }

      await client.query("COMMIT");
      return { duplicate: false, handled: false, action: "ignored_event_type", orderId: order.id };
    }

    const webinarSession = await resolveWebinarPaymentSessionForEvent(client, context);
    if (!webinarSession) {
      await client.query("COMMIT");
      return { duplicate: false, handled: false, action: "target_not_found" };
    }

    const fallbackAmount = Number(webinarSession.amount_cents || 0);
    const amountCents =
      context.amountCents && context.amountCents > 0
        ? context.amountCents
        : Math.max(1, Math.round(fallbackAmount));
    const currency = context.currency || String(webinarSession.currency || "PHP").toUpperCase();

    if (context.eventType === "checkout_session.payment.paid") {
      await updateWebinarPaymentSession({
        client,
        sessionId: webinarSession.id,
        providerPaymentId: context.paymentId,
        status: "paid",
        rawPayloadJson,
        amountCents,
        currency,
      });
      await markWebinarRegistrationPaid(client, webinarSession.registration_id);
      const queuedConfirmation = await enqueueWebinarConfirmationIfNeeded(client, webinarSession);
      await client.query("COMMIT");
      return {
        duplicate: false,
        handled: true,
        action: "webinar_marked_paid",
        webinarRegistrationId: webinarSession.registration_id,
        queuedConfirmation,
      };
    }

    if (context.eventType === "payment.failed") {
      await updateWebinarPaymentSession({
        client,
        sessionId: webinarSession.id,
        providerPaymentId: context.paymentId,
        status: "failed",
        rawPayloadJson,
        amountCents,
        currency,
      });
      await markWebinarRegistrationFailed(client, webinarSession.registration_id);
      await client.query("COMMIT");
      return {
        duplicate: false,
        handled: true,
        action: "webinar_marked_failed",
        webinarRegistrationId: webinarSession.registration_id,
      };
    }

    if (context.eventType === "payment.refunded") {
      await updateWebinarPaymentSession({
        client,
        sessionId: webinarSession.id,
        providerPaymentId: context.paymentId,
        status: "refunded",
        rawPayloadJson,
        amountCents,
        currency,
      });
      await markWebinarRegistrationRefunded(client, webinarSession.registration_id);
      await client.query("COMMIT");
      return {
        duplicate: false,
        handled: true,
        action: "webinar_marked_refunded",
        webinarRegistrationId: webinarSession.registration_id,
      };
    }

    if (context.eventType === "payment.refund.updated") {
      const refundState = getRefundStateFromResource(context.resource);
      await updateWebinarPaymentSession({
        client,
        sessionId: webinarSession.id,
        providerPaymentId: context.paymentId,
        status: refundState,
        rawPayloadJson,
        amountCents,
        currency,
      });

      if (refundState === "refunded") {
        await markWebinarRegistrationRefunded(client, webinarSession.registration_id);
      } else if (refundState === "refund_failed") {
        await markWebinarRegistrationRefundFailed(client, webinarSession.registration_id);
      }

      await client.query("COMMIT");
      return {
        duplicate: false,
        handled: true,
        action: `webinar_${refundState}`,
        webinarRegistrationId: webinarSession.registration_id,
      };
    }

    await client.query("COMMIT");
    return {
      duplicate: false,
      handled: false,
      action: "ignored_event_type",
      webinarRegistrationId: webinarSession.registration_id,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

router.post("/paymongo", async (req, res) => {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) {
    return res
      .status(500)
      .json({ message: "Missing PAYMONGO_WEBHOOK_SECRET." });
  }

  const signature =
    req.get("Paymongo-Signature") || req.get("paymongo-signature");

  if (!signature) {
    return res.status(400).json({ message: "Missing signature." });
  }

  const rawBody = req.rawBody
    ? req.rawBody.toString("utf8")
    : JSON.stringify(req.body ?? {});

  const isValid = verifyPaymongoSignature({
    signature,
    payload: rawBody,
    secret,
  });

  if (!isValid) {
    return res.status(401).json({ message: "Invalid signature." });
  }

  const payload = req.body ?? {};
  const context = extractEventContext(payload);

  if (!context.eventId || !context.eventType) {
    return res.status(400).json({ message: "Invalid event payload." });
  }

  try {
    const result = await processPaymongoEvent({ payload, context });

    logger.info("paymongo_webhook_processed", {
      event_id: context.eventId,
      event_type: context.eventType,
      duplicate: result.duplicate,
      handled: result.handled,
      action: result.action,
      order_id: result.orderId || null,
      webinar_registration_id: result.webinarRegistrationId || null,
    });

    return res.json({
      received: true,
      eventId: context.eventId,
      eventType: context.eventType,
      ...result,
    });
  } catch (error) {
    logger.error("paymongo_webhook_failed", {
      event_id: context.eventId,
      event_type: context.eventType,
      error,
    });

    return res.status(500).json({ message: "Failed to process webhook event." });
  }
});

export default router;

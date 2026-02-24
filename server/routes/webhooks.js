import express from "express";
import { pool } from "../db.js";
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
    if (!order) {
      await client.query("COMMIT");
      return { duplicate: false, handled: false, action: "order_not_found" };
    }

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
    return { duplicate: false, handled: false, action: "ignored_event_type" };
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

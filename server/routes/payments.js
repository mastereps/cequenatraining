import express from "express";
import { createGcashCheckout } from "../services/paymongo.js";
import { pool, query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const toSafeItem = (item) => {
  const id = Number(item?.id);
  const quantity = Number(item?.quantity);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) return null;
  return { id, quantity };
};

const normalizeCheckoutItems = (items) => {
  const merged = new Map();
  for (const item of items) {
    const safe = toSafeItem(item);
    if (!safe) continue;
    const nextQuantity = Math.min((merged.get(safe.id) || 0) + safe.quantity, 99);
    merged.set(safe.id, nextQuantity);
  }
  return Array.from(merged.entries()).map(([id, quantity]) => ({ id, quantity }));
};

const createPendingOrderForCheckout = async ({
  userId,
  normalizedItems,
  booksById,
  checkoutId,
}) => {
  const subtotalCents = normalizedItems.reduce((sum, { id, quantity }) => {
    const book = booksById.get(id);
    return sum + Math.round(Number(book?.price_cents || 0)) * quantity;
  }, 0);

  const firstBook = booksById.get(normalizedItems[0]?.id);
  const currency = String(firstBook?.currency || "PHP").toUpperCase();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        INSERT INTO orders (
          status,
          subtotal_cents,
          total_cents,
          currency,
          user_id,
          tax_cents,
          discount_cents,
          payment_status,
          provider,
          provider_checkout_id
        )
        VALUES ('pending', $1, $1, $2, $3, 0, 0, 'unpaid', 'paymongo', $4)
        RETURNING id
      `,
      [subtotalCents, currency, userId, checkoutId],
    );

    const orderId = orderResult.rows[0]?.id;

    for (const { id, quantity } of normalizedItems) {
      const book = booksById.get(id);
      await client.query(
        `
          INSERT INTO order_items (order_id, book_id, quantity, unit_price_cents, currency)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          orderId,
          id,
          quantity,
          Math.round(Number(book?.price_cents || 0)),
          String(book?.currency || "PHP").toUpperCase(),
        ],
      );
    }

    await client.query("COMMIT");
    return orderId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

router.post("/gcash", requireAuth, async (req, res) => {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  const normalizedItems = normalizeCheckoutItems(items);
  if (normalizedItems.length === 0) {
    return res.status(400).json({ message: "Invalid cart items." });
  }

  try {
    const itemIds = normalizedItems.map((item) => item.id);
    const booksResult = await query(
      `
        SELECT id, slug, title, price_cents, currency, is_active, in_stock
        FROM books
        WHERE id = ANY($1::int[])
      `,
      [itemIds],
    );

    if (booksResult.rows.length !== itemIds.length) {
      return res.status(400).json({ message: "Some cart items are no longer available." });
    }

    const booksById = new Map(booksResult.rows.map((row) => [Number(row.id), row]));
    const lineItems = normalizedItems.map(({ id, quantity }) => {
      const book = booksById.get(id);
      if (!book || !book.is_active || !book.in_stock) {
        throw new Error("Some cart items are no longer available.");
      }
      const amount = Number(book.price_cents);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Some cart items have invalid pricing.");
      }
      return {
        name: book.title || "Item",
        amount: Math.round(amount),
        currency: book.currency || "PHP",
        quantity,
      };
    });

    const checkout = await createGcashCheckout({
      lineItems,
      successUrl: `${
        process.env.PUBLIC_BASE_URL || "http://localhost:5173"
      }/checkout/success`,
      cancelUrl: `${
        process.env.PUBLIC_BASE_URL || "http://localhost:5173"
      }/checkout/cancel`,
      description: `Book order by user ${req.authUser.id}`,
    });

    const orderId = await createPendingOrderForCheckout({
      userId: req.authUser.id,
      normalizedItems,
      booksById,
      checkoutId: checkout.checkoutId,
    });

    return res.json({
      ...checkout,
      orderId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Payment request failed.";
    return res.status(500).json({ message });
  }
});

export default router;

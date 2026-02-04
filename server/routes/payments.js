import express from "express";
import { createGcashCheckout } from "../services/paymongo.js";
import { query } from "../db.js";
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
        SELECT id, title, price_cents, currency, is_active, in_stock
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
    return res.json(checkout);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Payment request failed.";
    return res.status(500).json({ message });
  }
});

export default router;

import express from "express";
import { createGcashCheckout } from "../services/paymongo.js";
import { toLineItems, filterValidLineItems } from "../utils/cart.js";

const router = express.Router();

router.post("/gcash", async (req, res) => {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  const lineItems = filterValidLineItems(toLineItems(items));
  if (lineItems.length === 0) {
    return res.status(400).json({ message: "Invalid cart items." });
  }

  try {
    const checkout = await createGcashCheckout({
      lineItems,
      successUrl: `${process.env.PUBLIC_BASE_URL || "http://localhost:5173"}/checkout/success`,
      cancelUrl: `${process.env.PUBLIC_BASE_URL || "http://localhost:5173"}/checkout/cancel`,
      description: "Book order",
    });
    return res.json(checkout);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Payment request failed.";
    return res.status(500).json({ message });
  }
});

export default router;

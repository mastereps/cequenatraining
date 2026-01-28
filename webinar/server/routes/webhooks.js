import express from "express";
import { verifyPaymongoSignature } from "../services/paymongo.js";

const router = express.Router();

router.post("/paymongo", (req, res) => {
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

  const eventType =
    req.body?.data?.attributes?.type || req.body?.data?.type || "unknown";
  const eventId = req.body?.data?.id || "unknown";

  console.log("PayMongo webhook received:", { eventId, eventType });

  return res.json({ received: true });
});

export default router;

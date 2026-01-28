import express from "express";
import paymentsRouter from "./routes/payments.js";
import webhooksRouter from "./routes/webhooks.js";

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      if (buf?.length) req.rawBody = buf;
    },
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/payments", paymentsRouter);
app.use("/api/webhooks", webhooksRouter);

export default app;

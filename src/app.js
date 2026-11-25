const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const authenticateMerchant = require("./middleware/auth");
const orderRoutes = require("./modules/orders/order.routes");
const paymentRoutes = require("./modules/payments/payment.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/orders", orderRoutes);
app.use("/api/payment-intents", paymentRoutes);
app.use("/api/ledger", require("./modules/ledger/ledger.routes"));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Payment Gateway API is running",
  });
});

app.get("/api/merchant/profile", authenticateMerchant, (req, res) => {
  res.status(200).json({
    message: "Authentication successful",
    merchant: req.merchant,
  });
});

app.get(
  "/api/merchant/overview",
  authenticateMerchant,
  require("./modules/merchant/merchant.controller").getOverview
);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("API Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "Internal server error",
  });
});

module.exports = app;

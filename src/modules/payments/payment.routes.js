const express = require("express");

const authenticateMerchant = require("../../middleware/auth");
const {
  createPaymentIntent,
  listPaymentIntents,
  getPaymentIntent,
} = require("./payment.controller");

const router = express.Router();

router.post("/", authenticateMerchant, createPaymentIntent);
router.get("/", authenticateMerchant, listPaymentIntents);
router.get("/:id", authenticateMerchant, getPaymentIntent);

module.exports = router;

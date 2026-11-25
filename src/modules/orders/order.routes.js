const express = require("express");
const authenticateMerchant = require("../../middleware/auth");
const {
  createOrder,
  listOrders,
  getOrder,
} = require("./order.controller");

const router = express.Router();

router.post("/", authenticateMerchant, createOrder);
router.get("/", authenticateMerchant, listOrders);
router.get("/:id", authenticateMerchant, getOrder);

module.exports = router;

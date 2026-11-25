const { z } = require("zod");

const createPaymentIntentSchema = z.object({
  order_id: z.string().uuid(),
});

module.exports = {
  createPaymentIntentSchema,
};
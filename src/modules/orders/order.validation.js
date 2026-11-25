const { z } = require("zod");

const createOrderSchema = z.object({
  merchant_order_reference: z.string().trim().min(1).max(100),

  amount: z.number().int().positive(),

  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .default("INR"),

  description: z.string().max(1000).optional(),

  metadata: z.record(z.string(), z.unknown()).default({}),
});

module.exports = {
  createOrderSchema,
};
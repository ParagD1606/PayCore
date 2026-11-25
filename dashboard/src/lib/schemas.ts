import { z } from "zod";

export const createOrderFormSchema = z.object({
  merchant_order_reference: z
    .string()
    .trim()
    .min(1, "Order reference is required")
    .max(100, "Order reference must be 100 characters or fewer"),
  amount_rupees: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
      message: "Enter a valid amount with up to 2 decimals",
    })
    .refine((value) => Number(value) > 0, {
      message: "Amount must be greater than zero",
    }),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter code")
    .regex(/^[A-Z]{3}$/, "Currency must be uppercase ISO code"),
  description: z.string().max(1000).optional(),
});

export type CreateOrderFormValues = z.infer<typeof createOrderFormSchema>;

export function toMinorUnits(amountRupees: string): number {
  const [whole, fraction = ""] = amountRupees.split(".");
  const padded = `${fraction}00`.slice(0, 2);
  return Number(whole) * 100 + Number(padded);
}

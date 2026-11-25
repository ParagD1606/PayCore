"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api-client";
import {
  createOrderFormSchema,
  toMinorUnits,
  type CreateOrderFormValues,
} from "@/lib/schemas";

export function CreateOrderDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderFormSchema),
    defaultValues: {
      merchant_order_reference: "",
      amount_rupees: "",
      currency: "INR",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CreateOrderFormValues) =>
      api.createOrder({
        merchant_order_reference: values.merchant_order_reference,
        amount: toMinorUnits(values.amount_rupees),
        currency: values.currency,
        description: values.description || undefined,
        metadata: {},
      }),
    onSuccess: async () => {
      toast.success("Order created");
      setOpen(false);
      form.reset({
        merchant_order_reference: "",
        amount_rupees: "",
        currency: "INR",
        description: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : "Failed to create order";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Create order</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create order</DialogTitle>
          <DialogDescription>
            Uses `POST /api/orders`. Amount is entered in major units and sent
            to the backend as integer minor units.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="space-y-2">
            <Label htmlFor="merchant_order_reference">Merchant order reference</Label>
            <Input
              id="merchant_order_reference"
              placeholder="ORD-1001"
              aria-invalid={!!form.formState.errors.merchant_order_reference}
              {...form.register("merchant_order_reference")}
            />
            {form.formState.errors.merchant_order_reference ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.merchant_order_reference.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount_rupees">Amount</Label>
              <Input
                id="amount_rupees"
                placeholder="500.00"
                inputMode="decimal"
                aria-invalid={!!form.formState.errors.amount_rupees}
                {...form.register("amount_rupees")}
              />
              {form.formState.errors.amount_rupees ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amount_rupees.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Converted to minor units before submit
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                placeholder="INR"
                aria-invalid={!!form.formState.errors.currency}
                {...form.register("currency")}
              />
              {form.formState.errors.currency ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.currency.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional order description"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

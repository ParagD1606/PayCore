"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api } from "@/lib/api-client";
import { formatAmount, formatDateTime } from "@/lib/format";
import { orderStatusTone } from "@/lib/status";

function createIdempotencyKey(orderId: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `intent-${orderId.slice(0, 8)}-${crypto.randomUUID()}`;
  }
  return `intent-${orderId}-${Date.now()}`;
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: ({ signal }) => api.getOrder(orderId, signal),
  });

  const createIntent = useMutation({
    mutationFn: async () =>
      api.createPaymentIntent(
        { order_id: orderId },
        createIdempotencyKey(orderId)
      ),
    onSuccess: async (result) => {
      toast.success("Payment intent created");
      await queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      router.push(`/payments/${result.payment_intent.id}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Failed to create payment intent"
      );
    },
  });

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order details" />
        <ErrorState
          error={orderQuery.error}
          onRetry={() => orderQuery.refetch()}
          title="Unable to load order"
        />
      </div>
    );
  }

  const order = orderQuery.data.order;

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.merchant_order_reference}
        description="Order detail from `GET /api/orders/:id`."
        actions={
          <>
            <Button variant="outline" render={<Link href="/orders" />}>
              Back to orders
            </Button>
            {order.status === "pending" ? (
              <Button
                onClick={() => createIntent.mutate()}
                disabled={createIntent.isPending}
              >
                {createIntent.isPending
                  ? "Creating intent…"
                  : "Create payment intent"}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Detail label="Order ID" value={order.id} mono />
            <Detail
              label="Status"
              value={
                <StatusBadge
                  status={order.status}
                  tone={orderStatusTone(order.status)}
                />
              }
            />
            <Detail
              label="Amount"
              value={formatAmount(order.amount, order.currency)}
            />
            <Detail label="Currency" value={order.currency} />
            <Detail label="Created" value={formatDateTime(order.created_at)} />
            <Detail
              label="Updated"
              value={formatDateTime(order.updated_at)}
            />
            <Detail
              label="Description"
              value={order.description || "—"}
              className="sm:col-span-2"
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Payment intent creation uses `POST /api/payment-intents` with an
              `Idempotency-Key` header. Only pending orders are eligible.
            </p>
            {order.status !== "pending" ? (
              <p>This order is `{order.status}`, so intent creation is disabled.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className={mono ? "mt-1 font-mono text-sm break-all" : "mt-1 text-sm"}>
        {value}
      </div>
    </div>
  );
}

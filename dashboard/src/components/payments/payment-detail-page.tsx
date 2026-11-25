"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { formatAmount, formatDateTime, shortenId } from "@/lib/format";
import { paymentStatusTone } from "@/lib/status";

export function PaymentDetailPage({ intentId }: { intentId: string }) {
  const intentQuery = useQuery({
    queryKey: ["payment-intent", intentId],
    queryFn: ({ signal }) => api.getPaymentIntent(intentId, signal),
  });

  if (intentQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (intentQuery.isError || !intentQuery.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payment intent" />
        <ErrorState
          error={intentQuery.error}
          onRetry={() => intentQuery.refetch()}
          title="Unable to load payment intent"
        />
      </div>
    );
  }

  const { payment_intent: intent, attempts } = intentQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={shortenId(intent.id, 12)}
        description="Payment intent detail from `GET /api/payment-intents/:id`."
        actions={
          <Button variant="outline" render={<Link href="/payments" />}>
            Back to payments
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Intent summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Detail label="Intent ID" value={intent.id} mono />
            <Detail
              label="Status"
              value={
                <StatusBadge
                  status={intent.status}
                  tone={paymentStatusTone(intent.status)}
                />
              }
            />
            <Detail
              label="Amount"
              value={formatAmount(intent.amount, intent.currency)}
            />
            <Detail label="Currency" value={intent.currency} />
            <Detail
              label="Order"
              value={
                <Link
                  href={`/orders/${intent.order_id}`}
                  className="text-primary hover:underline"
                >
                  {intent.merchant_order_reference ?? shortenId(intent.order_id)}
                </Link>
              }
            />
            <Detail
              label="Order status"
              value={intent.order_status ?? "—"}
            />
            <Detail label="Created" value={formatDateTime(intent.created_at)} />
            <Detail
              label="Updated"
              value={formatDateTime(intent.updated_at)}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Provider references appear on payment attempts when the simulated
              provider processes the intent.
            </p>
            <p>
              Capture and refund actions are not exposed here unless matching
              merchant endpoints exist.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Payment attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <EmptyState
              title="No attempts yet"
              description="Attempts are created when the payment provider is invoked."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Failure</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>{attempt.attempt_number}</TableCell>
                    <TableCell>{attempt.provider}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {attempt.provider_reference ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={attempt.status}
                        tone={paymentStatusTone(attempt.status)}
                      />
                    </TableCell>
                    <TableCell className="max-w-56 truncate">
                      {attempt.failure_message ??
                        attempt.failure_code ??
                        "—"}
                    </TableCell>
                    <TableCell>
                      {formatDateTime(attempt.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className={mono ? "mt-1 font-mono text-sm break-all" : "mt-1 text-sm"}>
        {value}
      </div>
    </div>
  );
}

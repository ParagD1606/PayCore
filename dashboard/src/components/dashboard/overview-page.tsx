"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CircleAlert,
  CreditCard,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/dashboard/error-state";
import { MetricCard, MetricCardSkeleton } from "@/components/dashboard/metric-card";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
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
import {
  ledgerTypeTone,
  orderStatusTone,
  paymentStatusTone,
} from "@/lib/status";

export function OverviewPage() {
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: ({ signal }) => api.getOverview(signal),
  });

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description="Live merchant metrics from the payment gateway API."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description="Live merchant metrics from the payment gateway API."
        />
        <ErrorState
          error={overviewQuery.error}
          onRetry={() => overviewQuery.refetch()}
          title="Unable to load overview"
        />
      </div>
    );
  }

  const data = overviewQuery.data;
  const metrics = data.metrics;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Live merchant metrics from the payment gateway API. All values are fetched from `/api/merchant/overview`."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total orders"
          value={String(metrics.total_orders)}
          icon={Receipt}
        />
        <MetricCard
          title="Payment intents"
          value={String(metrics.total_payment_intents)}
          icon={CreditCard}
        />
        <MetricCard
          title="Successful payments"
          value={String(metrics.successful_payments)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Failed payments"
          value={String(metrics.failed_payments)}
          icon={CircleAlert}
        />
        <MetricCard
          title="Payment volume"
          value={formatAmount(metrics.total_payment_volume)}
          hint="Succeeded intents only"
          icon={Wallet}
        />
      </div>

      <OverviewCharts data={data} />

      <div className="grid gap-4 xl:grid-cols-3">
        <RecentOrdersCard orders={data.recent_orders} />
        <RecentIntentsCard intents={data.recent_payment_intents} />
        <RecentLedgerCard rows={data.recent_ledger_transactions} />
      </div>
    </div>
  );
}

function RecentOrdersCard({
  orders,
}: {
  orders: OverviewPageData["recent_orders"];
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent orders</CardTitle>
        <Link href="/orders" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Create an order to see activity here."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {order.merchant_order_reference}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>{formatAmount(order.amount, order.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={order.status}
                      tone={orderStatusTone(order.status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RecentIntentsCard({
  intents,
}: {
  intents: OverviewPageData["recent_payment_intents"];
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent payment intents</CardTitle>
        <Link href="/payments" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {intents.length === 0 ? (
          <EmptyState
            title="No payment intents"
            description="Payment intents appear after an order is charged."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intent</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intents.map((intent) => (
                <TableRow key={intent.id}>
                  <TableCell>
                    <Link
                      href={`/payments/${intent.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {shortenId(intent.id)}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {intent.merchant_order_reference ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatAmount(intent.amount, intent.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={intent.status}
                      tone={paymentStatusTone(intent.status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RecentLedgerCard({
  rows,
}: {
  rows: OverviewPageData["recent_ledger_transactions"];
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Latest ledger activity</CardTitle>
        <Link href="/ledger" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            title="No ledger posts yet"
            description="Ledger rows appear after payment captures post."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <StatusBadge
                      status={row.transaction_type}
                      tone={ledgerTypeTone(row.transaction_type)}
                    />
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(row.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/ledger/${row.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {shortenId(row.id)}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {row.description ?? row.currency}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

type OverviewPageData = Awaited<ReturnType<typeof api.getOverview>>;

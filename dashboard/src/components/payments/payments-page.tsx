"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const STATUS_OPTIONS = [
  "all",
  "requires_payment_method",
  "processing",
  "requires_action",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const queryKey = useMemo(
    () => ["payment-intents", { page, search, status }] as const,
    [page, search, status]
  );

  const intentsQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      api.listPaymentIntents(
        {
          page,
          limit: 20,
          q: search || undefined,
          status: status === "all" ? undefined : status,
        },
        signal
      ),
  });

  function applySearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Payment intents scoped to the authenticated merchant."
      />

      <Card className="shadow-none">
        <CardContent className="space-y-4 pt-4">
          <form
            onSubmit={applySearch}
            className="flex flex-col gap-3 lg:flex-row lg:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search intent ID or order reference"
                className="pl-8"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-56">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all"
                      ? "All statuses"
                      : option.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          {intentsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : intentsQuery.isError ? (
            <ErrorState
              error={intentsQuery.error}
              onRetry={() => intentsQuery.refetch()}
              title="Unable to load payment intents"
            />
          ) : !intentsQuery.data || intentsQuery.data.data.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payment intents found"
              description="Create a payment intent from a pending order detail page."
              action={
                <Button variant="outline" render={<Link href="/orders" />}>
                  Go to orders
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intent</TableHead>
                    <TableHead>Order reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intentsQuery.data.data.map((intent) => (
                    <TableRow key={intent.id}>
                      <TableCell>
                        <Link
                          href={`/payments/${intent.id}`}
                          className="font-medium hover:underline"
                        >
                          {shortenId(intent.id)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {intent.merchant_order_reference ?? "—"}
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
                      <TableCell>{formatDateTime(intent.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                pagination={intentsQuery.data.pagination}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Receipt, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { CreateOrderDialog } from "@/components/orders/create-order-dialog";
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
import { orderStatusTone } from "@/lib/status";

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const queryKey = useMemo(
    () => ["orders", { page, search, status }] as const,
    [page, search, status]
  );

  const ordersQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      api.listOrders(
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
        title="Orders"
        description="Create and inspect merchant payment orders from the live gateway API."
        actions={<CreateOrderDialog />}
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
                placeholder="Search merchant order reference"
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
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          {ordersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : ordersQuery.isError ? (
            <ErrorState
              error={ordersQuery.error}
              onRetry={() => ordersQuery.refetch()}
              title="Unable to load orders"
            />
          ) : !ordersQuery.data || ordersQuery.data.data.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No orders found"
              description="Create an order or adjust your search filters."
              action={<CreateOrderDialog />}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersQuery.data.data.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium hover:underline"
                        >
                          {shortenId(order.id)}
                        </Link>
                      </TableCell>
                      <TableCell>{order.merchant_order_reference}</TableCell>
                      <TableCell>
                        {formatAmount(order.amount, order.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={order.status}
                          tone={orderStatusTone(order.status)}
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(order.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                pagination={ordersQuery.data.pagination}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

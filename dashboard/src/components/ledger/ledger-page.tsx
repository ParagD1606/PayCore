"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { ledgerTypeTone } from "@/lib/status";

const TYPE_OPTIONS = [
  "all",
  "payment_capture",
  "refund",
  "adjustment",
  "reversal",
] as const;

export function LedgerPage() {
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState("all");

  const queryKey = useMemo(
    () => ["ledger-transactions", { page, transactionType }] as const,
    [page, transactionType]
  );

  const ledgerQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      api.listLedgerTransactions(
        {
          page,
          limit: 20,
          transaction_type:
            transactionType === "all" ? undefined : transactionType,
        },
        signal
      ),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        description="Double-entry ledger transactions posted for this merchant’s payments."
      />

      <Card className="shadow-none">
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Debit and credit totals are summed from ledger entries.
            </p>
            <Select
              value={transactionType}
              onValueChange={(value) => {
                setTransactionType(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Transaction type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all"
                      ? "All types"
                      : option.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ledgerQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : ledgerQuery.isError ? (
            <ErrorState
              error={ledgerQuery.error}
              onRetry={() => ledgerQuery.refetch()}
              title="Unable to load ledger"
            />
          ) : !ledgerQuery.data || ledgerQuery.data.data.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No ledger transactions"
              description="Ledger posts appear after payment captures are recorded by the backend."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment intent</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerQuery.data.data.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Link
                          href={`/ledger/${tx.id}`}
                          className="font-medium hover:underline"
                        >
                          {shortenId(tx.id)}
                        </Link>
                        <div className="max-w-56 truncate text-xs text-muted-foreground">
                          {tx.description ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={tx.transaction_type}
                          tone={ledgerTypeTone(tx.transaction_type)}
                        />
                      </TableCell>
                      <TableCell>
                        {tx.payment_intent_id ? (
                          <Link
                            href={`/payments/${tx.payment_intent_id}`}
                            className="font-mono text-xs hover:underline"
                          >
                            {shortenId(tx.payment_intent_id)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-emerald-700">
                        {formatAmount(tx.debit_total, tx.currency)}
                      </TableCell>
                      <TableCell className="text-sky-700">
                        {formatAmount(tx.credit_total, tx.currency)}
                      </TableCell>
                      <TableCell>{formatDateTime(tx.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                pagination={ledgerQuery.data.pagination}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

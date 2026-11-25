"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, api } from "@/lib/api-client";
import { formatAmount, formatDateTime, shortenId } from "@/lib/format";
import { ledgerTypeTone } from "@/lib/status";

export function LedgerDetailPage({ transactionId }: { transactionId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const detailQuery = useQuery({
    queryKey: ["ledger-transaction", transactionId],
    queryFn: ({ signal }) => api.getLedgerTransaction(transactionId, signal),
  });

  const reverseMutation = useMutation({
    mutationFn: () => api.reverseLedgerTransaction(transactionId),
    onSuccess: async (result) => {
      toast.success("Ledger transaction reversed");
      await queryClient.invalidateQueries({ queryKey: ["ledger-transactions"] });
      await queryClient.invalidateQueries({
        queryKey: ["ledger-transaction", transactionId],
      });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      router.push(`/ledger/${result.reversalTransactionId}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Failed to reverse ledger transaction"
      );
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ledger transaction" />
        <ErrorState
          error={detailQuery.error}
          onRetry={() => detailQuery.refetch()}
          title="Unable to load ledger transaction"
        />
      </div>
    );
  }

  const { transaction, entries, reversal } = detailQuery.data;
  const canReverse =
    transaction.transaction_type !== "reversal" &&
    !transaction.original_transaction_id &&
    !reversal;

  return (
    <div className="space-y-6">
      <PageHeader
        title={shortenId(transaction.id, 12)}
        description="Ledger detail from `GET /api/ledger/transactions/:id`."
        actions={
          <>
            <Button variant="outline" render={<Link href="/ledger" />}>
              Back to ledger
            </Button>
            {canReverse ? (
              <Dialog>
                <DialogTrigger render={<Button variant="destructive" />}>
                  Reverse transaction
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reverse ledger transaction?</DialogTitle>
                    <DialogDescription>
                      Creates a new balanced reversal transaction. History is
                      never edited in place.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      disabled={reverseMutation.isPending}
                      onClick={() => reverseMutation.mutate()}
                    >
                      {reverseMutation.isPending
                        ? "Reversing…"
                        : "Confirm reversal"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Transaction</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Detail label="Transaction ID" value={transaction.id} mono />
            <Detail
              label="Type"
              value={
                <StatusBadge
                  status={transaction.transaction_type}
                  tone={ledgerTypeTone(transaction.transaction_type)}
                />
              }
            />
            <Detail label="Currency" value={transaction.currency} />
            <Detail
              label="Created"
              value={formatDateTime(transaction.created_at)}
            />
            <Detail
              label="Payment intent"
              value={
                transaction.payment_intent_id ? (
                  <Link
                    href={`/payments/${transaction.payment_intent_id}`}
                    className="text-primary hover:underline"
                  >
                    {shortenId(transaction.payment_intent_id)}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Detail
              label="Original transaction"
              value={
                transaction.original_transaction_id ? (
                  <Link
                    href={`/ledger/${transaction.original_transaction_id}`}
                    className="text-primary hover:underline"
                  >
                    {shortenId(transaction.original_transaction_id)}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Detail
              label="Reversal"
              value={
                reversal ? (
                  <Link
                    href={`/ledger/${reversal.id}`}
                    className="text-primary hover:underline"
                  >
                    {shortenId(reversal.id)}
                  </Link>
                ) : (
                  "None"
                )
              }
            />
            <Detail
              label="Description"
              value={transaction.description || "—"}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Integrity notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Entries are immutable. Reversals create a new transaction that
              flips debit and credit legs.
            </p>
            {!canReverse ? (
              <p>
                Reverse is unavailable because this transaction is already a
                reversal, already reversed, or linked as a reversal child.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Ledger entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState
              title="No entries"
              description="This transaction has no associated ledger entries."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">
                      {shortenId(entry.id)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.account_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.account_code} · {entry.account_type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          entry.entry_type === "debit"
                            ? "font-medium text-emerald-700 capitalize"
                            : "font-medium text-sky-700 capitalize"
                        }
                      >
                        {entry.entry_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatAmount(entry.amount, entry.account_currency)}
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

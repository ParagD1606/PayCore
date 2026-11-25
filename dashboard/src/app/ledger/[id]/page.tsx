import { Suspense } from "react";

import { LedgerDetailPage } from "@/components/ledger/ledger-detail-page";
import { Skeleton } from "@/components/ui/skeleton";

async function LedgerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LedgerDetailPage transactionId={id} />;
}

export default function LedgerDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <LedgerDetail params={params} />
    </Suspense>
  );
}

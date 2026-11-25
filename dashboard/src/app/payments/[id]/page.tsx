import { Suspense } from "react";

import { PaymentDetailPage } from "@/components/payments/payment-detail-page";
import { Skeleton } from "@/components/ui/skeleton";

async function PaymentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentDetailPage intentId={id} />;
}

export default function PaymentDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <PaymentDetail params={params} />
    </Suspense>
  );
}

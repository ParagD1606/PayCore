import { Suspense } from "react";

import { OrderDetailPage } from "@/components/orders/order-detail-page";
import { Skeleton } from "@/components/ui/skeleton";

async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailPage orderId={id} />;
}

export default function OrderDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

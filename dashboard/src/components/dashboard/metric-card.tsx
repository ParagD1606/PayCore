import type { LucideIcon } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="rounded-lg border border-border bg-muted/50 p-2 text-muted-foreground">
            <Icon className="size-4" />
          </div>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-40" />
      </CardHeader>
    </Card>
  );
}

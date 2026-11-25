import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { humanizeStatus, type StatusTone } from "@/lib/status";

const toneClass: Record<StatusTone, string> = {
  default: "border-transparent bg-primary/10 text-primary capitalize",
  success:
    "border-transparent bg-emerald-50 text-emerald-700 capitalize dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-transparent bg-amber-50 text-amber-800 capitalize dark:bg-amber-950/40 dark:text-amber-300",
  danger:
    "border-transparent bg-red-50 text-red-700 capitalize dark:bg-red-950/40 dark:text-red-300",
  muted: "border-transparent bg-muted text-muted-foreground capitalize",
};

export function StatusBadge({
  status,
  tone = "default",
  className,
}: {
  status: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(toneClass[tone], className)}>
      {humanizeStatus(status)}
    </Badge>
  );
}

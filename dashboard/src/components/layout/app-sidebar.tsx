"use client";

import Link from "next/link";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Separator } from "@/components/ui/separator";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-5">
        <Link href="/" className="flex items-center gap-2.5" onClick={onNavigate}>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            PG
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Payment Gateway</div>
            <div className="text-[11px] text-muted-foreground">Merchant Dashboard</div>
          </div>
        </Link>
      </div>
      <Separator />
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto border-t border-sidebar-border px-4 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Single-merchant demo via server-side API key proxy. Not a multi-tenant login product.
        </p>
      </div>
    </div>
  );
}

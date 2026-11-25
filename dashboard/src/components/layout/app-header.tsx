"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { getPageTitle } from "@/lib/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["merchant-profile"],
    queryFn: ({ signal }) => api.getProfile(signal),
  });

  const title = getPageTitle(pathname);
  const merchant = profileQuery.data?.merchant;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur supports-backdrop-filter:bg-background/75 sm:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="icon-sm" className="lg:hidden" />
          }
        >
          <Menu />
          <span className="sr-only">Open navigation</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <span className="sr-only">Main navigation</span>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">
          Scalable Payment Gateway
        </div>
      </div>

      <Badge
        variant="outline"
        className="hidden border-amber-200 bg-amber-50 text-amber-800 sm:inline-flex"
      >
        Test Mode
      </Badge>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={refreshing}
        aria-label="Refresh dashboard data"
      >
        <RefreshCw className={refreshing ? "animate-spin" : undefined} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="max-w-48" />}
        >
          {profileQuery.isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span className="truncate">
              {merchant?.businessName ?? "Merchant"}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="space-y-1">
            <div className="truncate font-medium">
              {merchant?.businessName ?? "Merchant"}
            </div>
            <div className="truncate text-xs font-normal text-muted-foreground">
              {merchant?.email ?? "Profile unavailable"}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/settings" />}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/api-docs" />}>
            API Documentation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

function SidebarFallback() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function HeaderFallback() {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-border px-4 sm:px-6">
      <Skeleton className="h-6 w-32" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <Suspense fallback={<SidebarFallback />}>
          <AppSidebar />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<HeaderFallback />}>
          <AppHeader />
        </Suspense>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

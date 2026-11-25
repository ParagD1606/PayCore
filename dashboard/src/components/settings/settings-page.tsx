"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { getPublicGatewayBaseUrl } from "@/lib/public-config";

export function SettingsPage() {
  const profileQuery = useQuery({
    queryKey: ["merchant-profile"],
    queryFn: ({ signal }) => api.getProfile(signal),
  });

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.getHealth(signal),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Merchant identity and dashboard integration configuration."
      />

      <Alert>
        <AlertTitle>Authentication model</AlertTitle>
        <AlertDescription>
          The backend authenticates with merchant API keys (`x-api-key`), not
          email/password login. This dashboard uses a Next.js BFF proxy with a
          server-only `MERCHANT_API_KEY` for a single-merchant local demo. It is
          not a production multi-merchant auth system.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Merchant profile</CardTitle>
          </CardHeader>
          <CardContent>
            {profileQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-5 w-72" />
              </div>
            ) : profileQuery.isError ? (
              <ErrorState
                error={profileQuery.error}
                onRetry={() => profileQuery.refetch()}
                title="Unable to load merchant profile"
              />
            ) : (
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Business name</dt>
                  <dd className="mt-1 font-medium">
                    {profileQuery.data?.merchant.businessName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="mt-1 font-medium">
                    {profileQuery.data?.merchant.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Merchant ID</dt>
                  <dd className="mt-1 font-mono text-xs break-all">
                    {profileQuery.data?.merchant.id}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Mode</span>
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-800"
              >
                Test Mode
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Gateway base URL</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {getPublicGatewayBaseUrl()}
              </code>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">API health</span>
              {healthQuery.isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : healthQuery.isError ? (
                <Badge variant="destructive">Unavailable</Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  {healthQuery.data?.status}
                </Badge>
              )}
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
              API keys are configured only via server environment variables. They
              are never stored in localStorage or exposed through
              `NEXT_PUBLIC_*` variables.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Required environment variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Variable</th>
                  <th className="py-2 pr-4 font-medium">Scope</th>
                  <th className="py-2 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-xs">
                    GATEWAY_API_BASE_URL
                  </td>
                  <td className="py-3 pr-4">Server only</td>
                  <td className="py-3">Backend origin used by the BFF proxy</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-xs">MERCHANT_API_KEY</td>
                  <td className="py-3 pr-4">Server only</td>
                  <td className="py-3">
                    Single demo merchant key injected as `x-api-key`
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-xs">
                    NEXT_PUBLIC_API_BASE_URL
                  </td>
                  <td className="py-3 pr-4">Public</td>
                  <td className="py-3">
                    Non-secret base URL shown in API docs examples
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

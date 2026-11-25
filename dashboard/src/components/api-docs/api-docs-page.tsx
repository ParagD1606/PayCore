"use client";

import { CopyButton } from "@/components/dashboard/copy-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiDocs } from "@/lib/api-docs-data";
import { getPublicGatewayBaseUrl } from "@/lib/public-config";

const methodClass: Record<string, string> = {
  GET: "border-emerald-200 bg-emerald-50 text-emerald-700",
  POST: "border-sky-200 bg-sky-50 text-sky-700",
};

export function ApiDocsPage() {
  const baseUrl = getPublicGatewayBaseUrl();

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Documentation"
        description="Reference for endpoints currently implemented by the Express backend. The dashboard proxies authenticated calls through a server-side BFF."
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Merchant APIs authenticate with the `x-api-key` header. Keys look
            like `pg_live_` + 64 hex characters. Only the SHA-256 hash is stored
            by the backend.
          </p>
          <p>
            This dashboard never puts the merchant API key in the browser. For
            local demos, set `MERCHANT_API_KEY` as a server-only environment
            variable and call `/api/bff/*` from the UI.
          </p>
          <p>
            Public gateway base URL shown in examples:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
              {baseUrl}
            </code>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {apiDocs.map((endpoint) => {
          const curl = buildCurl(baseUrl, endpoint);
          return (
            <Card key={endpoint.id} className="shadow-none" id={endpoint.id}>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={methodClass[endpoint.method]}
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm font-medium">{endpoint.path}</code>
                  {endpoint.auth ? (
                    <Badge variant="secondary">Requires API key</Badge>
                  ) : (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>
                <CardTitle>{endpoint.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {endpoint.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {endpoint.headers?.length ? (
                  <Section title="Headers">
                    <CodeBlock value={endpoint.headers.join("\n")} />
                  </Section>
                ) : null}
                {endpoint.query?.length ? (
                  <Section title="Query parameters">
                    <CodeBlock value={endpoint.query.join("\n")} />
                  </Section>
                ) : null}
                {endpoint.body ? (
                  <Section title="Request body">
                    <CodeBlock value={endpoint.body} />
                  </Section>
                ) : null}
                <Section title="Example response">
                  <CodeBlock value={endpoint.successExample} />
                </Section>
                {endpoint.errorExamples.length > 0 ? (
                  <Section title="Error responses">
                    <div className="space-y-3">
                      {endpoint.errorExamples.map((example) => (
                        <CodeBlock key={example} value={example} />
                      ))}
                    </div>
                  </Section>
                ) : null}
                <Section
                  title="cURL"
                  action={<CopyButton value={curl} label="Copy cURL" />}
                >
                  <CodeBlock value={curl} />
                </Section>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
      <code>{value}</code>
    </pre>
  );
}

function buildCurl(
  baseUrl: string,
  endpoint: (typeof apiDocs)[number]
): string {
  const lines = [`curl -s -X ${endpoint.method} ${baseUrl}${endpoint.path}`];

  if (endpoint.auth) {
    lines.push(`  -H "x-api-key: pg_live_..."`);
  }

  if (endpoint.method === "POST") {
    lines.push(`  -H "content-type: application/json"`);
  }

  if (endpoint.headers?.some((header) => header.startsWith("Idempotency-Key"))) {
    lines.push(`  -H "Idempotency-Key: intent-ord-1001"`);
  }

  if (endpoint.body) {
    lines.push(`  -d '${endpoint.body.replace(/\s+/g, " ").trim()}'`);
  }

  return lines
    .map((line, index) => (index === 0 ? line : ` \\\n${line}`))
    .join("");
}

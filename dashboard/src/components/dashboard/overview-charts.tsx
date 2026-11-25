"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatAmount, formatDate } from "@/lib/format";
import type { OverviewResponse } from "@/lib/types";
import { humanizeStatus } from "@/lib/status";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function OverviewCharts({ data }: { data: OverviewResponse }) {
  const volumeData = data.volume_by_day.map((row) => ({
    day: formatDate(String(row.day)),
    volume: Number(row.volume) / 100,
    count: row.count,
  }));

  const successCount = data.metrics.successful_payments;
  const failedCount = data.metrics.failed_payments;
  const outcomeData = [
    { name: "Succeeded", value: successCount },
    { name: "Failed", value: failedCount },
  ].filter((item) => item.value > 0);

  const statusData = data.status_distribution.map((row) => ({
    name: humanizeStatus(row.status),
    value: row.count,
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="shadow-none xl:col-span-2">
        <CardHeader>
          <CardTitle>Payment volume (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {volumeData.length === 0 ? (
            <EmptyState
              title="No payment volume yet"
              description="Volume appears after payment intents are created for this merchant."
              className="h-full border-0 bg-transparent py-8"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number"
                      ? formatAmount(Math.round(value * 100))
                      : String(value)
                  }
                />
                <Bar dataKey="volume" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Successful vs failed</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {outcomeData.length === 0 ? (
            <EmptyState
              title="No outcomes yet"
              description="Succeeded and failed counts will appear once payment intents settle."
              className="h-full border-0 bg-transparent py-8"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {outcomeData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none xl:col-span-3">
        <CardHeader>
          <CardTitle>Payment status distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {statusData.length === 0 ? (
            <EmptyState
              title="No payment intents"
              description="Status distribution is derived from real payment intent records."
              className="h-full border-0 bg-transparent py-8"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState, ErrorBanner, PageLoading } from "@/components/ui";
import { api } from "@/lib/api";
import { CATEGORY_COLORS, currentMonth, formatMoney, formatMonth } from "@/lib/format";
import type { Summary } from "@/lib/types";

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const query = useQuery({
    queryKey: ["summary", month],
    queryFn: () => api.summary(month),
    enabled: Boolean(month),
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div>
          <label htmlFor="d-month" className="mb-1 block text-sm font-medium">
            Month
          </label>
          <input
            id="d-month"
            type="month"
            className="input"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6" aria-live="polite">
        {query.isPending && <PageLoading label="Loading summary" />}
        {query.isError && <ErrorBanner error={query.error} onRetry={() => query.refetch()} />}
        {query.data &&
          (query.data.expense_count === 0 && query.data.other_currencies.length === 0 ? (
            <EmptyState title={`No spending recorded for ${formatMonth(month)}`}>
              <Link href="/add" className="text-brand-700 underline">
                Add an expense
              </Link>
            </EmptyState>
          ) : (
            <SummaryView summary={query.data} />
          ))}
      </div>
    </div>
  );
}

function SummaryView({ summary }: { summary: Summary }) {
  const { currency } = summary;
  const change = summary.change_pct;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Total spending</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(summary.total, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.expense_count} expense{summary.expense_count === 1 ? "" : "s"}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">vs {formatMonth(summary.previous_month)}</p>
          {change === null ? (
            <p className="mt-1 text-lg font-semibold">No spending last month</p>
          ) : (
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                change > 0 ? "text-red-700" : change < 0 ? "text-green-700" : ""
              }`}
            >
              <span aria-hidden="true">{change > 0 ? "▲" : change < 0 ? "▼" : "•"}</span>{" "}
              {Math.abs(change).toFixed(1)}%
              <span className="sr-only">{change > 0 ? " higher" : change < 0 ? " lower" : ""}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Last month: {formatMoney(summary.previous_total, currency)}
            {change !== null && change !== 0 && (change > 0 ? " · spending is up" : " · spending is down")}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">Top category</p>
          <p className="mt-1 text-2xl font-semibold">{summary.categories[0]?.category ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.categories[0] ? `${summary.categories[0].share_pct}% of spending` : ""}
          </p>
        </div>
      </div>

      {summary.categories.length > 0 && (
        <div className="card grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 font-semibold">Spending by category</h2>
            <div
              role="img"
              aria-label="Pie chart of spending by category. The table beside it lists the same figures."
            >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={summary.categories}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {summary.categories.map((c) => (
                    <Cell key={c.category} fill={CATEGORY_COLORS[c.category] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Spending by category</caption>
              <thead className="text-slate-500">
                <tr>
                  <th scope="col" className="py-2 font-medium">Category</th>
                  <th scope="col" className="py-2 text-right font-medium">Amount</th>
                  <th scope="col" className="py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.categories.map((c) => (
                  <tr key={c.category}>
                    <td className="py-2">
                      <span
                        aria-hidden="true"
                        className="mr-2 inline-block h-3 w-3 rounded-sm align-middle"
                        style={{ background: CATEGORY_COLORS[c.category] ?? "#94a3b8" }}
                      />
                      {c.category}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(c.total, currency)}</td>
                    <td className="py-2 text-right tabular-nums">{c.share_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary.other_currencies.length > 0 && (
        <p className="text-sm text-slate-600">
          Also spent in other currencies (not included above):{" "}
          {summary.other_currencies.map((o) => formatMoney(o.total, o.currency)).join(", ")}.
        </p>
      )}
    </div>
  );
}

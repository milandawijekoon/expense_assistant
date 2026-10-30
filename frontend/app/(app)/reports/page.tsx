"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorBanner } from "@/components/ui";
import { api } from "@/lib/api";
import { CATEGORY_COLORS, currentMonth, formatMoney, formatMonth } from "@/lib/format";
import type { MonthlyReport } from "@/lib/types";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const colorOf = (category: string) => CATEGORY_COLORS[category] ?? "#94a3b8";

export default function ReportsPage() {
  const thisYear = Number(currentMonth().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const query = useQuery({ queryKey: ["report", year], queryFn: () => api.monthlyReport(year) });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Month by month</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Reports</h1>
        </div>
        <div className="inline-flex items-center rounded-full bg-white p-1 shadow-soft ring-1 ring-slate-900/5">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100"
          >
            ‹
          </button>
          <span className="min-w-[4.5rem] px-2 text-center text-sm font-medium tabular-nums" aria-live="polite">
            {year}
          </span>
          <button
            type="button"
            disabled={year >= thisYear}
            onClick={() => setYear((y) => y + 1)}
            aria-label="Next year"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ›
          </button>
        </div>
      </header>

      <div aria-live="polite" className="space-y-6">
        {query.isPending && (
          <div role="status" aria-label="Loading report" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5" />
          </div>
        )}
        {query.isError && <ErrorBanner error={query.error} onRetry={() => query.refetch()} />}
        {query.data && <ReportView report={query.data} />}
      </div>
    </div>
  );
}

function ChangePill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300">—</span>;
  const tone =
    value > 0 ? "bg-red-50 text-red-700" : value < 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      <span aria-hidden="true">{value > 0 ? "↑" : value < 0 ? "↓" : "•"}</span>
      {Math.abs(value).toFixed(1)}%
      <span className="sr-only">{value > 0 ? " higher" : value < 0 ? " lower" : ""}</span>
    </span>
  );
}

function ReportView({ report }: { report: MonthlyReport }) {
  const { currency } = report;
  const active = report.months.filter((m) => m.expense_count > 0);
  const hasData = active.length > 0;
  const peak = active.reduce((a, b) => (b.total > a.total ? b : a), active[0]);
  const max = Math.max(...report.months.map((m) => m.total), 1);
  const chartData = report.months.map((m, i) => ({ name: SHORT_MONTHS[i], full: formatMonth(m.month), total: m.total }));
  const compact = (v: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(v);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Total in {report.year}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {formatMoney(report.year_total, currency, 0)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {active.reduce((n, m) => n + m.expense_count, 0)} expenses
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Average per month</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {formatMoney(report.average_per_month, currency, 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Highest month</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {peak ? formatMonth(peak.month).split(" ")[0] : "—"}
          </p>
          {peak && <p className="mt-2 text-xs tabular-nums text-slate-500">{formatMoney(peak.total, currency, 0)}</p>}
        </div>
      </div>

      {!hasData && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
          <p className="text-3xl" aria-hidden="true">📊</p>
          <p className="mt-2 font-medium">No spending recorded in {report.year}</p>
        </div>
      )}

      {hasData && (
        <>
          <section className="card" aria-labelledby="chart-title">
            <h2 id="chart-title" className="font-semibold">Spending by month</h2>
            <div
              className="mt-4"
              role="img"
              aria-label="Bar chart of total spending per month. The table below lists the same figures."
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis
                    width={48}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={compact}
                  />
                  <Tooltip
                    cursor={{ fill: "rgb(99 102 241 / 0.06)" }}
                    formatter={(v: number) => formatMoney(v, currency, 0)}
                    labelFormatter={(_, p) => p?.[0]?.payload.full ?? ""}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                    {chartData.map((d, i) => (
                      <Cell key={d.full} fill={report.months[i].month === peak?.month ? "#4f46e5" : "#a5b4fc"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Spending per month in {report.year}</caption>
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Month</th>
                  <th scope="col" className="px-5 py-3 font-medium">Total</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Expenses</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">vs previous</th>
                  <th scope="col" className="px-5 py-3 font-medium">Top category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.months.map((m) => {
                  const empty = m.expense_count === 0;
                  return (
                    <tr key={m.month} className={empty ? "text-slate-300" : "hover:bg-slate-50/70"}>
                      <td className="whitespace-nowrap px-5 py-3 font-medium">{formatMonth(m.month)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-28 shrink-0 tabular-nums">{empty ? "—" : formatMoney(m.total, currency, 0)}</span>
                          {!empty && (
                            <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:block" aria-hidden="true">
                              <span
                                className="block h-full rounded-full bg-brand-500"
                                style={{ width: `${Math.max((m.total / max) * 100, 3)}%` }}
                              />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{empty ? "" : m.expense_count}</td>
                      <td className="px-5 py-3 text-right">{empty ? "" : <ChangePill value={m.change_pct} />}</td>
                      <td className="px-5 py-3">
                        {m.top_category && (
                          <span className="inline-flex items-center gap-2 text-slate-700">
                            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(m.top_category) }} />
                            {m.top_category}
                            <span className="text-xs tabular-nums text-slate-400">{formatMoney(m.top_category_total, currency, 0)}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {report.other_currencies.length > 0 && (
        <p className="text-sm text-slate-500">
          You also have expenses in {report.other_currencies.join(", ")}; they are not included above.
        </p>
      )}
    </>
  );
}

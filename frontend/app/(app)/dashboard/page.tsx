"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { ErrorBanner } from "@/components/ui";
import { api } from "@/lib/api";
import {
  CATEGORY_COLORS,
  currentMonth,
  daysInMonth,
  formatDate,
  formatMoney,
  formatMonth,
  greeting,
  shiftMonth,
} from "@/lib/format";
import type { Expense, Summary } from "@/lib/types";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const compact = (v: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);
const colorOf = (category: string) => CATEGORY_COLORS[category] ?? "#94a3b8";

export default function DashboardPage() {
  const now = currentMonth();
  const [month, setMonth] = useState(now);

  const summary = useQuery({ queryKey: ["summary", month], queryFn: () => api.summary(month) });
  const recent = useQuery({
    queryKey: ["expenses", { month, category: "", page: 1, size: 6 }],
    queryFn: () => api.listExpenses({ month, category: "", page: 1 }, 6),
  });
  const year = Number(month.slice(0, 4));
  const report = useQuery({ queryKey: ["report", year], queryFn: () => api.monthlyReport(year) });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{greeting()} 👋</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your spending</h1>
        </div>
        <MonthStepper month={month} max={now} onChange={setMonth} />
      </header>

      <AddExpenseForm />

      <div aria-live="polite" className="space-y-6">
        {summary.isError && <ErrorBanner error={summary.error} onRetry={() => summary.refetch()} />}
        {summary.isPending && <DashboardSkeleton />}
        {summary.data && (
          <>
            <Stats summary={summary.data} month={month} isCurrent={month === now} />
            {summary.data.expense_count === 0 && summary.data.other_currencies.length === 0 ? (
              <EmptyMonth month={month} />
            ) : (
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <CategoryCard summary={summary.data} />
                </div>
                <div className="lg:col-span-2">
                  <RecentCard
                    items={recent.data?.items.slice(0, 6)}
                    loading={recent.isPending}
                    failed={recent.isError}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {report.data && report.data.months.some((m) => m.expense_count > 0) && (
          <TrendCard
            months={report.data.months.map((m) => m.total)}
            selected={Number(month.slice(5)) - 1}
            year={year}
            average={report.data.average_per_month}
            currency={report.data.currency}
          />
        )}
        {summary.data && summary.data.other_currencies.length > 0 && (
          <p className="text-sm text-slate-500">
            Also spent in other currencies (not included above):{" "}
            {summary.data.other_currencies.map((o) => formatMoney(o.total, o.currency)).join(", ")}.
          </p>
        )}
      </div>
    </div>
  );
}

function MonthStepper({ month, max, onChange }: { month: string; max: string; onChange: (m: string) => void }) {
  return (
    <div className="inline-flex items-center rounded-full bg-white p-1 shadow-soft ring-1 ring-slate-900/5">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100"
      >
        ‹
      </button>
      <span className="min-w-[8.5rem] px-2 text-center text-sm font-medium" aria-live="polite">
        {formatMonth(month)}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= max}
        aria-label="Next month"
        className="grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        ›
      </button>
    </div>
  );
}

function Stat({ label, children, foot }: { label: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-2">{children}</div>
      {foot && <p className="mt-2 text-xs text-slate-500">{foot}</p>}
    </div>
  );
}

function Stats({ summary, month, isCurrent }: { summary: Summary; month: string; isCurrent: boolean }) {
  const { currency, change_pct: change } = summary;
  const days = isCurrent ? new Date().getDate() : daysInMonth(month);
  const top = summary.categories[0];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat label="Total spent" foot={`${summary.expense_count} expense${summary.expense_count === 1 ? "" : "s"}`}>
        <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          {formatMoney(summary.total, currency, 0)}
        </p>
      </Stat>

      <Stat
        label={`vs ${formatMonth(summary.previous_month).split(" ")[0]}`}
        foot={`Last month ${formatMoney(summary.previous_total, currency, 0)}`}
      >
        {change === null ? (
          <p className="text-lg font-medium text-slate-400">No data</p>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${
              change > 0
                ? "bg-red-50 text-red-700"
                : change < 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            <span aria-hidden="true">{change > 0 ? "↑" : change < 0 ? "↓" : "•"}</span>
            {Math.abs(change).toFixed(1)}%
            <span className="sr-only">{change > 0 ? " higher" : change < 0 ? " lower" : ""}</span>
          </span>
        )}
      </Stat>

      <Stat label="Daily average" foot={`over ${days} day${days === 1 ? "" : "s"}`}>
        <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          {formatMoney(summary.total / days, currency, 0)}
        </p>
      </Stat>

      <Stat label="Top category" foot={top ? `${top.share_pct}% of spending` : undefined}>
        {top ? (
          <p className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: colorOf(top.category) }} />
            {top.category}
          </p>
        ) : (
          <p className="text-lg font-medium text-slate-400">—</p>
        )}
      </Stat>
    </div>
  );
}

function CategoryCard({ summary }: { summary: Summary }) {
  const { currency, categories } = summary;
  return (
    <section className="card h-full" aria-labelledby="cat-title">
      <h2 id="cat-title" className="font-semibold">Where it went</h2>
      <div className="mt-4 grid items-center gap-6 sm:grid-cols-[210px_1fr]">
        <div
          className="relative mx-auto h-[210px] w-[210px]"
          role="img"
          aria-label="Donut chart of spending by category. The list beside it has the same figures."
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                dataKey="total"
                nameKey="category"
                innerRadius={74}
                outerRadius={100}
                paddingAngle={categories.length > 1 ? 2 : 0}
                cornerRadius={3}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {categories.map((c) => (
                  <Cell key={c.category} fill={colorOf(c.category)} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div className="max-w-[120px]">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total spent</p>
              <p className="mt-0.5 text-xl font-semibold leading-tight tracking-tight tabular-nums">
                {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(summary.total)}
              </p>
              <p className="text-xs font-medium text-slate-500">{currency}</p>
            </div>
          </div>
        </div>

        <ul className="space-y-3">
          {categories.map((c) => (
            <li key={c.category}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(c.category) }} />
                  {c.category}
                </span>
                <span className="tabular-nums text-slate-600">
                  {formatMoney(c.total, currency, 0)}
                  <span className="ml-2 text-xs text-slate-400">{c.share_pct}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(c.share_pct, 2)}%`, background: colorOf(c.category) }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RecentCard({ items, loading, failed }: { items?: Expense[]; loading: boolean; failed: boolean }) {
  return (
    <section className="card h-full" aria-labelledby="recent-title">
      <div className="flex items-center justify-between">
        <h2 id="recent-title" className="font-semibold">Recent</h2>
        <Link href="/transactions" className="text-sm font-medium text-brand-700 hover:underline">
          View all
        </Link>
      </div>
      {loading && (
        <div className="mt-4 space-y-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}
      {failed && <p className="mt-4 text-sm text-red-700">Couldn&apos;t load recent expenses.</p>}
      {items && items.length === 0 && <p className="mt-4 text-sm text-slate-500">Nothing here yet.</p>}
      {items && items.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ background: colorOf(e.category) }}
              >
                {e.category[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.merchant ?? e.category}</p>
                <p className="text-xs text-slate-500">
                  {e.category} · {formatDate(e.date)}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(e.amount, e.currency, 0)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TrendCard({
  months,
  selected,
  year,
  average,
  currency,
}: {
  months: number[];
  selected: number;
  year: number;
  average: number;
  currency: string;
}) {
  const data = months.map((total, i) => ({
    name: SHORT_MONTHS[i],
    full: formatMonth(`${year}-${String(i + 1).padStart(2, "0")}`),
    total,
  }));
  const picked = data[selected];
  const prev = selected > 0 ? data[selected - 1].total : null;
  const delta = prev && prev > 0 ? ((picked.total - prev) / prev) * 100 : null;
  const peak = data.reduce((a, b) => (b.total > a.total ? b : a), data[0]);

  return (
    <section className="card" aria-labelledby="trend-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="trend-title" className="font-semibold">{year} at a glance</h2>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-slate-900">{picked.full.split(" ")[0]}</span>{" "}
            <span className="tabular-nums">{formatMoney(picked.total, currency, 0)}</span>
            {delta !== null && (
              <span className={delta > 0 ? "text-red-700" : "text-emerald-700"}>
                {" "}· {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs {data[selected - 1].name}
              </span>
            )}
          </p>
        </div>
        <Link href="/reports" className="text-sm font-medium text-brand-700 hover:underline">
          Full report
        </Link>
      </div>

      <div className="mt-4" role="img" aria-label={`Bar chart of monthly spending in ${year}. The reports page has the figures.`}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
            <YAxis
              width={44}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={compact}
              tickCount={4}
            />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <Tooltip
              cursor={{ fill: "rgb(99 102 241 / 0.06)" }}
              formatter={(v: number) => [formatMoney(v, currency, 0), "Spent"]}
              labelFormatter={(_, p) => p?.[0]?.payload.full ?? ""}
            />
            {average > 0 && (
              <ReferenceLine
                y={average}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: `avg ${compact(average)}`, position: "insideTopRight", fontSize: 11, fill: "#64748b" }}
              />
            )}
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={30} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={d.full} fill={i === selected ? "#4f46e5" : "#c7d2fe"} />
              ))}
              <LabelList
                dataKey="total"
                position="top"
                formatter={(v: number) => (v > 0 ? compact(v) : "")}
                style={{ fontSize: 10, fill: "#64748b" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex gap-1.5">
          <dt>Monthly average</dt>
          <dd className="font-medium tabular-nums text-slate-700">{formatMoney(average, currency, 0)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Highest</dt>
          <dd className="font-medium text-slate-700">
            {peak.name} · <span className="tabular-nums">{formatMoney(peak.total, currency, 0)}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function EmptyMonth({ month }: { month: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <p className="text-3xl" aria-hidden="true">🧾</p>
      <p className="mt-2 font-medium">No spending recorded for {formatMonth(month)}</p>
      <p className="mt-1 text-sm text-slate-500">Add an expense above and it will show up here.</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading your spending">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5" />
    </div>
  );
}

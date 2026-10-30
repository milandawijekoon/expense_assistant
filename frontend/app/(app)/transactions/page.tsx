"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { DatePicker } from "@/components/DatePicker";
import { MonthPicker } from "@/components/MonthPicker";
import { Select } from "@/components/Select";
import { ErrorBanner, Spinner } from "@/components/ui";
import { PAGE_SIZE, api } from "@/lib/api";
import { CATEGORY_COLORS, currentMonth, formatDayLabel, formatMoney } from "@/lib/format";
import { CATEGORIES, type Category, type Expense } from "@/lib/types";

const colorOf = (category: string) => CATEGORY_COLORS[category] ?? "#94a3b8";

interface Draft {
  date: string;
  amount: string;
  currency: string;
  category: Category;
  merchant: string;
  description: string;
}

const toDraft = (e: Expense): Draft => ({
  date: e.date,
  amount: String(e.amount),
  currency: e.currency,
  category: e.category,
  merchant: e.merchant ?? "",
  description: e.description ?? "",
});

/** Consecutive rows with the same date share one header; the API already sorts newest first. */
function groupByDate(items: Expense[]) {
  const groups: { date: string; items: Expense[] }[] = [];
  for (const e of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }
  return groups;
}

function dayTotal(items: Expense[]): string {
  const totals = new Map<string, number>();
  for (const e of items) totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.amount);
  return [...totals].map(([cur, amt]) => formatMoney(amt, cur, 0)).join(" · ");
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const filters = { month, category, page };
  const query = useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => api.listExpenses(filters),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    for (const key of ["expenses", "summary", "report"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const stopEditing = () => {
    setEditingId(null);
    setDraft(null);
  };

  const update = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Draft }) =>
      api.updateExpense(id, {
        date: d.date,
        amount: Number(d.amount),
        currency: d.currency,
        category: d.category,
        merchant: d.merchant.trim() || null,
        description: d.description.trim() || null,
      }),
    onSuccess: () => {
      stopEditing();
      refresh();
    },
  });
  const remove = useMutation({ mutationFn: api.deleteExpense, onSuccess: refresh });

  const startEdit = (e: Expense) => {
    update.reset();
    setEditingId(e.id);
    setDraft(toDraft(e));
  };

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const groups = useMemo(() => (data ? groupByDate(data.items) : []), [data]);

  // Deleting the last row on the final page would otherwise strand the user on an empty page.
  useEffect(() => {
    if (data && !query.isPlaceholderData && page > totalPages) setPage(totalPages);
  }, [data, query.isPlaceholderData, page, totalPages]);

  const filtered = Boolean(month || category);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {data ? `${data.total} expense${data.total === 1 ? "" : "s"}` : " "}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Transactions</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker
            id="f-month"
            value={month}
            onChange={(v) => {
              setMonth(v);
              setPage(1);
            }}
          />
          <label htmlFor="f-category" className="sr-only">Category</label>
          <Select
            id="f-category"
            className="input w-auto py-1.5"
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "All categories" },
              ...CATEGORIES.map((c) => ({ value: c, label: c, dot: colorOf(c) })),
            ]}
          />
          {filtered && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5"
              onClick={() => {
                setMonth("");
                setCategory("");
                setPage(1);
              }}
            >
              Show all
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3" aria-live="polite">
        {update.isError && <ErrorBanner error={update.error} />}
        {remove.isError && <ErrorBanner error={remove.error} />}
        {query.isError && <ErrorBanner error={query.error} onRetry={() => query.refetch()} />}
        {query.isPending && (
          <div role="status" aria-label="Loading transactions" className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-white ring-1 ring-slate-900/5" />
            ))}
          </div>
        )}
        {data && data.items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
            <p className="font-medium">
              {filtered ? "No transactions match these filters" : "No expenses yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {filtered ? (
                "Try a different month or category."
              ) : (
                <Link href="/dashboard" className="text-brand-700 underline">
                  Add your first expense on the dashboard
                </Link>
              )}
            </p>
          </div>
        )}
      </div>

      {data && data.items.length > 0 && (
        <>
          <div
            className={`space-y-3 ${query.isPlaceholderData ? "opacity-60" : ""}`}
          >
            {groups.map((g) => (
              <section
                key={g.date}
                aria-label={formatDayLabel(g.date)}
                className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5"
              >
                {/*
                  One left axis: the date, the colour dot and the merchant all start at the same x,
                  and the day total shares the right edge with the amounts. Each date is its own
                  card, so records read as belonging to that day.
                */}
                <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 px-5 py-2.5">
                  <h2 className="text-sm font-semibold text-slate-800">{formatDayLabel(g.date)}</h2>
                  <span className="text-[13px] tabular-nums text-slate-400">{dayTotal(g.items)}</span>
                </div>
                <ul className="divide-y divide-slate-100/80">
                  {g.items.map((e) =>
                    editingId === e.id && draft ? (
                      <li key={e.id}>
                        <EditRow
                          draft={draft}
                          setDraft={setDraft}
                          saving={update.isPending}
                          onSave={() => update.mutate({ id: e.id, d: draft })}
                          onCancel={stopEditing}
                        />
                      </li>
                    ) : (
                      <li
                        key={e.id}
                        className="group relative flex items-center gap-3 px-5 py-2.5 text-[13px] transition-colors hover:bg-slate-50"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: colorOf(e.category) }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate">
                            <span className="font-medium text-slate-900">{e.merchant ?? e.category}</span>
                            {e.description && <span className="text-slate-400"> · {e.description}</span>}
                          </p>
                        </div>
                        <span className="hidden w-32 shrink-0 sm:block">
                          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600">
                            {e.category}
                          </span>
                        </span>
                        <span className="shrink-0 text-right font-semibold tabular-nums sm:w-32">
                          {formatMoney(e.amount, e.currency)}
                        </span>
                        <span className="flex shrink-0 gap-1 sm:absolute sm:right-[9.75rem] sm:top-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:bg-white sm:p-0.5 sm:opacity-0 sm:shadow-sm sm:ring-1 sm:ring-slate-900/10 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            onClick={() => startEdit(e)}
                            aria-label={`Edit ${e.merchant ?? e.category} on ${e.date}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (window.confirm("Delete this expense?")) remove.mutate(e.id);
                            }}
                            aria-label={`Delete ${e.merchant ?? e.category} on ${e.date}`}
                          >
                            Delete
                          </button>
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ))}
          </div>

          <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Page {data.page} of {totalPages}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn-secondary px-3 py-1.5"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </span>
          </nav>
        </>
      )}
    </div>
  );
}

function EditRow({
  draft,
  setDraft,
  saving,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });
  const amount = Number(draft.amount);
  const valid = amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && draft.currency.length === 3;

  const field = "mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400";
  const input = "input py-1.5";

  return (
    <form
      className="grid gap-x-3 gap-y-2 bg-brand-50/50 px-4 py-3 sm:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !saving) onSave();
      }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div className="sm:col-span-2">
        <label htmlFor="e-date" className={field}>Date</label>
        <DatePicker id="e-date" className={input} value={draft.date} onChange={(v) => set("date", v)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="e-amount" className={field}>Amount</label>
        <input
          id="e-amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          className={input}
          value={draft.amount}
          onChange={(e) => set("amount", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="e-currency" className={field}>Currency</label>
        <CurrencySelect id="e-currency" value={draft.currency} onChange={(c) => set("currency", c)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="e-category" className={field}>Category</label>
        <Select
          id="e-category"
          className={input}
          value={draft.category}
          onChange={(v) => set("category", v as Category)}
          options={CATEGORIES.map((c) => ({ value: c, label: c, dot: colorOf(c) }))}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="e-merchant" className={field}>Merchant</label>
        <input id="e-merchant" maxLength={120} className={input} value={draft.merchant} onChange={(e) => set("merchant", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="e-description" className={field}>Note</label>
        <input id="e-description" maxLength={255} className={input} value={draft.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-6">
        <button type="button" className="btn-secondary px-3 py-1.5" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary px-3 py-1.5" disabled={!valid || saving}>
          {saving && <Spinner label="Saving" />}
          Save changes
        </button>
      </div>
    </form>
  );
}

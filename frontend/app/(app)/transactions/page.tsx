"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryBadge, EmptyState, ErrorBanner, PageLoading } from "@/components/ui";
import { PAGE_SIZE, api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { CATEGORIES, type Category, type Expense } from "@/lib/types";

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Category>("Other");

  const filters = { month, category, page };
  const query = useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => api.listExpenses(filters),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const update = useMutation({
    mutationFn: ({ id, category }: { id: string; category: Category }) =>
      api.updateExpense(id, { category }),
    onSuccess: () => {
      setEditingId(null);
      refresh();
    },
  });
  const remove = useMutation({ mutationFn: api.deleteExpense, onSuccess: refresh });

  const startEdit = (e: Expense) => {
    update.reset();
    setEditingId(e.id);
    setDraft(e.category);
  };

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Deleting the last row on the final page would otherwise strand the user on an empty page.
  useEffect(() => {
    if (data && !query.isPlaceholderData && page > totalPages) setPage(totalPages);
  }, [data, query.isPlaceholderData, page, totalPages]);
  const filtered = Boolean(month || category);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Transactions</h1>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="f-month" className="mb-1 block text-sm font-medium">
            Month
          </label>
          <input
            id="f-month"
            type="month"
            className="input"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label htmlFor="f-category" className="mb-1 block text-sm font-medium">
            Category
          </label>
          <select
            id="f-category"
            className="input"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {filtered && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setMonth("");
              setCategory("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {update.isError && <ErrorBanner error={update.error} />}
        {remove.isError && <ErrorBanner error={remove.error} />}

        {query.isPending && <PageLoading label="Loading transactions" />}
        {query.isError && <ErrorBanner error={query.error} onRetry={() => query.refetch()} />}

        {data && data.items.length === 0 && (
          <EmptyState title={filtered ? "No transactions match these filters" : "No expenses yet"}>
            {filtered ? (
              "Try a different month or category."
            ) : (
              <Link href="/add" className="text-brand-700 underline">
                Add your first expense
              </Link>
            )}
          </EmptyState>
        )}
      </div>

      {data && data.items.length > 0 && (
        <>
          <div
            className={`mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white ${
              query.isPlaceholderData ? "opacity-60" : ""
            }`}
          >
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Your expenses, newest first</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Merchant</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((e) => {
                  const editing = editingId === e.id;
                  return (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(e.date)}</td>
                      <td className="px-4 py-3">{e.merchant ?? "—"}</td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <>
                            <label htmlFor={`cat-${e.id}`} className="sr-only">
                              Category for {e.merchant ?? "this expense"}
                            </label>
                            <select
                              id={`cat-${e.id}`}
                              className="input py-1"
                              value={draft}
                              onChange={(ev) => setDraft(ev.target.value as Category)}
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <CategoryBadge category={e.category} />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatMoney(e.amount, e.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {editing ? (
                          <span className="inline-flex gap-2">
                            <button
                              type="button"
                              className="btn-primary px-3 py-1"
                              disabled={update.isPending}
                              onClick={() => update.mutate({ id: e.id, category: draft })}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-2">
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1"
                              onClick={() => startEdit(e)}
                              aria-label={`Edit ${e.merchant ?? "expense"} on ${formatDate(e.date)}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1 text-red-700"
                              disabled={remove.isPending}
                              onClick={() => {
                                if (window.confirm("Delete this expense?")) remove.mutate(e.id);
                              }}
                              aria-label={`Delete ${e.merchant ?? "expense"} on ${formatDate(e.date)}`}
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Page {data.page} of {totalPages} · {data.total} expense{data.total === 1 ? "" : "s"}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
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

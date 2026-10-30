"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { CATEGORY_COLORS, formatDate, formatMoney } from "@/lib/format";
import type { Expense } from "@/lib/types";

const EXAMPLES = [
  "Paid 1800 for lunch at Barista today",
  "Uber to the airport 2400 yesterday",
  "Groceries at Keells 6500",
];

export function AddExpenseForm() {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  // Parse with the LLM, then save the validated result. The text is only cleared on success,
  // so a failure never loses what the user typed.
  const mutation = useMutation({
    mutationFn: async (input: string) => {
      const parsed = await api.parseExpense(input);
      return api.createExpense({ ...parsed, raw_text: input });
    },
    onSuccess: () => {
      setText("");
      for (const key of ["expenses", "summary", "report"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  const submit = () => {
    if (text.trim() && !mutation.isPending) mutation.mutate(text.trim());
  };

  return (
    <section
      aria-labelledby="add-title"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-900 p-5 text-white shadow-soft sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
      />
      <h2 id="add-title" className="relative text-lg font-semibold tracking-tight">
        What did you spend?
      </h2>
      <p className="relative mt-0.5 text-sm text-brand-100">
        Type it the way you&apos;d say it. We&apos;ll find the amount, category and date.
      </p>

      <form
        className="relative mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="expense-text" className="sr-only">
          Describe your expense
        </label>
        <div className="rounded-xl bg-white p-2 text-slate-900 shadow-lg shadow-brand-900/20 focus-within:ring-2 focus-within:ring-white/60">
          <textarea
            id="expense-text"
            rows={2}
            maxLength={500}
            className="block w-full resize-none rounded-lg border-0 bg-transparent px-2 py-1.5 text-[15px] placeholder:text-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder={EXAMPLES[0]}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            aria-invalid={mutation.isError}
            aria-describedby="expense-help"
          />
          <div className="flex items-center justify-between gap-3 px-1 pt-1">
            <p id="expense-help" className="text-xs text-slate-400">
              Press Enter to save
            </p>
            <button
              type="submit"
              className="btn-primary px-4 py-1.5"
              disabled={!text.trim() || mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {mutation.isPending && <Spinner label="Saving your expense" />}
              {mutation.isPending ? "Saving…" : "Add expense"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-brand-50 ring-1 ring-white/20 transition hover:bg-white/20"
            >
              {ex}
            </button>
          ))}
        </div>

        <div aria-live="polite" className="mt-3 empty:hidden">
          {mutation.isError && (
            <div className="rounded-lg bg-white p-1 text-slate-900">
              <ErrorBanner error={mutation.error} onRetry={() => mutation.mutate(text.trim())} />
            </div>
          )}
          {mutation.isSuccess && <SavedNote expense={mutation.data} />}
        </div>
      </form>
    </section>
  );
}

function SavedNote({ expense }: { expense: Expense }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/15 px-3 py-2 text-sm ring-1 ring-white/20">
      <span aria-hidden="true">✓</span>
      <span className="font-medium">Saved</span>
      <span className="tabular-nums">{formatMoney(expense.amount, expense.currency)}</span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ background: CATEGORY_COLORS[expense.category] ?? "#94a3b8" }}
        />
        {expense.category}
      </span>
      {expense.merchant && <span className="text-brand-100">· {expense.merchant}</span>}
      <span className="text-brand-100">· {formatDate(expense.date)}</span>
    </div>
  );
}

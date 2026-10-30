"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { CategoryBadge, ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Expense } from "@/lib/types";

const EXAMPLE = "Paid 1800 rupees for lunch at Barista today";

export default function AddExpensePage() {
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
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const submit = () => {
    if (text.trim() && !mutation.isPending) mutation.mutate(text.trim());
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Add an expense</h1>
      <p className="mt-1 text-sm text-slate-600">
        Describe it in your own words and we&apos;ll fill in the details.
      </p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="expense-text" className="block text-sm font-medium">
          What did you spend?
        </label>
        <textarea
          id="expense-text"
          rows={3}
          maxLength={500}
          className="input"
          placeholder={EXAMPLE}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          aria-invalid={mutation.isError}
          aria-describedby="expense-help"
        />
        <p id="expense-help" className="text-xs text-slate-500">
          Press Ctrl/⌘ + Enter to save.
        </p>

        <div aria-live="polite">
          {mutation.isError && (
            <ErrorBanner
              error={mutation.error}
              onRetry={() => mutation.mutate(text.trim())}
            />
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!text.trim() || mutation.isPending}
          aria-busy={mutation.isPending}
        >
          {mutation.isPending && <Spinner label="Saving your expense" />}
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </form>

      {mutation.isSuccess && <ConfirmationCard expense={mutation.data} />}
    </div>
  );
}

function ConfirmationCard({ expense }: { expense: Expense }) {
  const rows: [string, React.ReactNode][] = [
    ["Amount", formatMoney(expense.amount, expense.currency)],
    ["Category", <CategoryBadge key="c" category={expense.category} />],
    ["Merchant", expense.merchant ?? "—"],
    ["Date", formatDate(expense.date)],
  ];
  return (
    <section
      aria-labelledby="saved-title"
      className="card mt-8 border-green-200 bg-green-50"
      role="status"
    >
      <h2 id="saved-title" className="font-semibold text-green-800">
        ✓ Expense saved
      </h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <Link href="/transactions" className="mt-4 inline-block text-sm text-brand-700 underline">
        View in transactions
      </Link>
    </section>
  );
}

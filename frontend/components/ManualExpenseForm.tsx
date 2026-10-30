"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { DatePicker, todayIso } from "@/components/DatePicker";
import { Select } from "@/components/Select";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { CATEGORY_COLORS, formatMoney } from "@/lib/format";
import { CATEGORIES, type Category, type Expense } from "@/lib/types";

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15";
const label = "mb-1 block text-xs font-medium text-slate-600";

export function ManualExpenseForm() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [date, setDate] = useState(todayIso);
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (me.data && !currency) setCurrency(me.data.default_currency);
  }, [me.data, currency]);

  const mutation = useMutation({
    mutationFn: () =>
      api.createExpense({
        amount: Number(amount),
        currency,
        category,
        date,
        merchant: merchant.trim() || null,
        description: note.trim() || null,
      }),
    onSuccess: () => {
      setAmount("");
      setMerchant("");
      setNote("");
      for (const key of ["expenses", "summary", "report"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  const valid = Number(amount) > 0 && /^[A-Z]{3}$/.test(currency);

  return (
    <form
      className="mt-4 rounded-xl bg-white p-4 text-slate-900 shadow-lg shadow-brand-900/20"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !mutation.isPending) mutation.mutate();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label htmlFor="m-amount" className={label}>Amount</label>
          <input
            id="m-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            className={field}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="m-currency" className={label}>Currency</label>
          <CurrencySelect id="m-currency" value={currency || "INR"} onChange={setCurrency} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="m-category" className={label}>Category</label>
          <Select
            id="m-category"
            className={field}
            value={category}
            onChange={(v) => setCategory(v as Category)}
            options={CATEGORIES.map((c) => ({ value: c, label: c, dot: CATEGORY_COLORS[c] ?? "#94a3b8" }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="m-date" className={label}>Date</label>
          <DatePicker id="m-date" value={date} onChange={setDate} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="m-merchant" className={label}>Merchant <span className="text-slate-400">(optional)</span></label>
          <input id="m-merchant" maxLength={120} className={field} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="m-note" className={label}>Note <span className="text-slate-400">(optional)</span></label>
          <input id="m-note" maxLength={255} className={field} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="min-w-0 flex-1 text-sm empty:hidden">
          {mutation.isError && <ErrorBanner error={mutation.error} />}
          {mutation.isSuccess && <SavedLine expense={mutation.data} />}
        </div>
        <button type="submit" className="btn-primary ml-auto px-4 py-2" disabled={!valid || mutation.isPending} aria-busy={mutation.isPending}>
          {mutation.isPending && <Spinner label="Saving your expense" />}
          {mutation.isPending ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

function SavedLine({ expense }: { expense: Expense }) {
  return (
    <p role="status" className="text-emerald-700">
      ✓ Saved {formatMoney(expense.amount, expense.currency)} · {expense.category}
    </p>
  );
}

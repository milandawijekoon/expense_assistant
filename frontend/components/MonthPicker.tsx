"use client";

import { useEffect, useRef, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const thisMonth = () => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "m12 5-5 5 5 5" : "m8 5 5 5-5 5"} />
    </svg>
  );
}

/** Month picker for "YYYY-MM" values; an empty string means no month selected. */
export function MonthPicker({
  id,
  value,
  onChange,
  label = "Month",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = /^\d{4}-\d{2}$/.test(value)
    ? { year: Number(value.slice(0, 4)), month: Number(value.slice(5)) - 1 }
    : null;
  const now = thisMonth();
  const [year, setYear] = useState(selected?.year ?? now.year);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (y: number, m: number) => {
    onChange(`${y}-${String(m + 1).padStart(2, "0")}`);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          if (!open) setYear(selected?.year ?? now.year);
          setOpen((o) => !o);
        }}
        className="input flex w-auto items-center gap-2 py-1.5 text-left"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
          <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
        </svg>
        <span className={selected ? "text-slate-900" : "text-slate-500"}>
          {selected ? `${LONG_MONTHS[selected.month]} ${selected.year}` : "All months"}
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose month"
          className="absolute right-0 z-20 mt-2 w-64 rounded-2xl bg-white p-3 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/10"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous year" onClick={() => setYear((y) => y - 1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <Chevron dir="left" />
            </button>
            <span className="text-sm font-semibold tabular-nums" aria-live="polite">{year}</span>
            <button type="button" aria-label="Next year" onClick={() => setYear((y) => y + 1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <Chevron dir="right" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((name, m) => {
              const isSelected = selected?.year === year && selected.month === m;
              const isNow = now.year === year && now.month === m;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${LONG_MONTHS[m]} ${year}`}
                  onClick={() => pick(year, m)}
                  className={`rounded-lg py-2 text-sm font-medium transition ${
                    isSelected
                      ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                      : isNow
                        ? "text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50"
                        : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-medium">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </button>
            <button type="button" className="rounded-md px-2 py-1 text-brand-700 hover:bg-brand-50" onClick={() => pick(now.year, now.month)}>
              This month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

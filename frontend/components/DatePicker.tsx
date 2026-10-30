"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const todayIso = () => {
  const n = new Date();
  return iso(n.getFullYear(), n.getMonth(), n.getDate());
};

function parse(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "m12 5-5 5 5 5" : "m8 5 5 5-5 5"} />
    </svg>
  );
}

/** Day picker for "YYYY-MM-DD" values. */
export function DatePicker({
  id,
  value,
  onChange,
  className = "input",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Classes for the trigger button. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parse(value);
  const today = parse(todayIso())!;
  const [view, setView] = useState({ y: selected?.y ?? today.y, m: selected?.m ?? today.m });

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

  const shift = (delta: number) =>
    setView(({ y, m }) => {
      const t = y * 12 + m + delta;
      return { y: Math.floor(t / 12), m: t % 12 };
    });

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday first
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) setView({ y: selected?.y ?? today.y, m: selected?.m ?? today.m });
          setOpen((o) => !o);
        }}
        className={`${className} flex items-center gap-2 text-left`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
          <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
        </svg>
        <span className={selected ? "" : "text-slate-400"}>
          {selected
            ? new Date(selected.y, selected.m, selected.d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "Pick a date"}
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label="Choose date" className="absolute left-0 z-30 mt-2 w-72 rounded-2xl bg-white p-3 text-slate-900 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/10">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <Chevron dir="left" />
            </button>
            <span className="text-sm font-semibold" aria-live="polite">{MONTHS[view.m]} {view.y}</span>
            <button type="button" aria-label="Next month" onClick={() => shift(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <Chevron dir="right" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} />;
              const isSel = selected?.y === view.y && selected.m === view.m && selected.d === d;
              const isToday = today.y === view.y && today.m === view.m && today.d === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={isSel}
                  aria-label={new Date(view.y, view.m, d).toLocaleDateString("en-GB", { dateStyle: "full" })}
                  onClick={() => pick(iso(view.y, view.m, d))}
                  className={`aspect-square rounded-lg text-sm tabular-nums transition ${
                    isSel
                      ? "bg-brand-600 font-semibold text-white shadow-sm shadow-brand-600/30"
                      : isToday
                        ? "font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50"
                        : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2 text-right text-sm font-medium">
            <button type="button" className="rounded-md px-2 py-1 text-brand-700 hover:bg-brand-50" onClick={() => pick(todayIso())}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

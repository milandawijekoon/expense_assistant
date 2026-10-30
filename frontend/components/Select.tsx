"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional colour swatch shown before the label. */
  dot?: string;
}

/** Custom listbox that replaces the native <select> so menus match the app. */
export function Select({
  id,
  value,
  options,
  onChange,
  className = "input",
  disabled,
  describedBy,
  placeholder = "Select…",
}: {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Classes for the trigger button. */
  className?: string;
  disabled?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selectedIndex = options.findIndex((o) => o.value === value);
  const current = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openMenu = () => {
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  };

  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive((a) => Math.min(a + 1, last)); break;
      case "ArrowUp": e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); break;
      case "Home": e.preventDefault(); setActive(0); break;
      case "End": e.preventDefault(); setActive(last); break;
      case "Enter":
      case " ": e.preventDefault(); choose(active); break;
      case "Escape": e.preventDefault(); setOpen(false); break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          const ch = e.key.toLowerCase();
          const from = active + 1;
          const hit = [...options.slice(from), ...options.slice(0, from)].findIndex((o) =>
            o.label.toLowerCase().startsWith(ch),
          );
          if (hit >= 0) setActive((from + hit) % options.length);
        }
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-describedby={describedBy}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`${className} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {current?.dot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: current.dot }} />}
          <span className={`truncate ${current ? "" : "text-slate-400"}`}>{current?.label ?? placeholder}</span>
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 z-30 mt-2 max-h-64 w-max min-w-full max-w-[22rem] overflow-auto rounded-2xl bg-white p-1.5 text-sm shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/10"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-6 rounded-lg px-2.5 py-2 ${
                  i === active ? "bg-slate-100" : ""
                } ${isSelected ? "font-semibold text-brand-700" : "text-slate-700"}`}
              >
                <span className="flex items-center gap-2">
                  {o.dot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.dot }} />}
                  {o.label}
                </span>
                {isSelected && (
                  <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m4 10.5 4 4 8-9" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

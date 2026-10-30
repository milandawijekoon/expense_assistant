"use client";

import { useMemo } from "react";
import { currencyOptions } from "@/lib/currencies";

export function CurrencySelect({
  id,
  value,
  onChange,
  disabled,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  const options = useMemo(() => currencyOptions(value), [value]);
  return (
    <select
      id={id}
      className="input"
      value={value}
      disabled={disabled}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

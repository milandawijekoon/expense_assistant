"use client";

import { useMemo } from "react";
import { Select } from "@/components/Select";
import { currencyOptions } from "@/lib/currencies";

export function CurrencySelect({
  id,
  value,
  onChange,
  disabled,
  describedBy,
  className = "input",
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const options = useMemo(() => currencyOptions(value), [value]);
  return (
    <Select
      id={id}
      className={className}
      value={value}
      disabled={disabled}
      describedBy={describedBy}
      onChange={onChange}
      options={options.map((o) => ({ value: o.code, label: o.label }))}
    />
  );
}

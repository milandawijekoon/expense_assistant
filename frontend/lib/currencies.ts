export const COMMON_CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "LKR", "AUD", "CAD", "SGD", "AED", "JPY", "CNY", "CHF", "NZD", "ZAR",
];

export interface CurrencyOption {
  code: string;
  label: string;
}

/** Every ISO currency the browser knows, with its name; common ones first. */
export function currencyOptions(selected?: string): CurrencyOption[] {
  let codes: string[] = [];
  try {
    codes = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("currency");
  } catch {
    // Older browsers: fall back to the common list.
  }
  const names = (() => {
    try {
      return new Intl.DisplayNames("en", { type: "currency" });
    } catch {
      return null;
    }
  })();
  const all = new Set([...COMMON_CURRENCIES, ...codes]);
  if (selected) all.add(selected);
  const rest = [...all].filter((c) => !COMMON_CURRENCIES.includes(c)).sort();
  return [...COMMON_CURRENCIES, ...rest].filter((c) => all.has(c)).map((code) => ({
    code,
    label: `${code} — ${names?.of(code) ?? code}`,
  }));
}

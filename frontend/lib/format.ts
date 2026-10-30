export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Formats a YYYY-MM-DD string without letting the browser's timezone shift the day. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f97316",
  Groceries: "#84cc16",
  Transport: "#0ea5e9",
  Shopping: "#d946ef",
  Bills: "#64748b",
  Entertainment: "#eab308",
  Health: "#ef4444",
  Travel: "#14b8a6",
  Other: "#a78bfa",
};

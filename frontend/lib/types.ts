export const CATEGORIES = [
  "Food",
  "Groceries",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Travel",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface ParsedExpense {
  amount: number;
  currency: string;
  category: Category;
  merchant: string | null;
  date: string;
}

export interface Expense extends ParsedExpense {
  id: string;
  description: string | null;
  created_at: string;
}

export interface ExpensePage {
  items: Expense[];
  total: number;
  page: number;
  page_size: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  share_pct: number;
  count: number;
  previous_total: number;
  change_pct: number | null;
}

export interface Summary {
  month: string;
  previous_month: string;
  currency: string;
  total: number;
  previous_total: number;
  change_pct: number | null;
  expense_count: number;
  categories: CategoryBreakdown[];
  other_currencies: { currency: string; total: number }[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ExpenseFilters {
  month: string;
  category: string;
  page: number;
}

export type Provider = "anthropic" | "openai" | "ollama";

export interface LLMSettings {
  provider: Provider;
  model: string;
  base_url: string | null;
  has_api_key: boolean;
  api_key_hint: string | null;
  configured: boolean;
  source: "user" | "server";
}

export interface LLMSettingsInput {
  provider: Provider;
  model: string;
  api_key?: string;
  base_url?: string;
}

export interface MonthlyRow {
  month: string;
  total: number;
  expense_count: number;
  change_pct: number | null;
  top_category: string | null;
  top_category_total: number;
}

export interface MonthlyReport {
  year: number;
  currency: string;
  year_total: number;
  average_per_month: number;
  months: MonthlyRow[];
  other_currencies: string[];
}

export interface User {
  id: string;
  email: string;
  default_currency: string;
}

export interface ExpenseUpdate {
  amount?: number;
  currency?: string;
  category?: Category;
  merchant?: string | null;
  date?: string;
  description?: string | null;
}

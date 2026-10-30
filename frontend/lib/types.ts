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

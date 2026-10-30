import { getToken } from "./token";
import type {
  ChatTurn,
  Expense,
  ExpenseFilters,
  ExpenseUpdate,
  ExpensePage,
  LLMSettings,
  LLMSettingsInput,
  MonthlyReport,
  ParsedExpense,
  Summary,
  User,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const PAGE_SIZE = 50;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public missing: string[] = [],
  ) {
    super(message);
  }

  /** True for failures where trying the same request again could plausibly succeed. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

const NETWORK_MESSAGE = "We couldn't reach the server. Please check your connection and try again.";
const SERVER_MESSAGE = "Something went wrong on our side. Please try again in a moment.";

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", NETWORK_MESSAGE);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    const detail = data?.detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const message = res.status >= 500 ? SERVER_MESSAGE : (detail.message ?? SERVER_MESSAGE);
      throw new ApiError(res.status, detail.code ?? "error", message, detail.missing ?? []);
    }
    if (res.status === 422) {
      throw new ApiError(422, "validation_error", "Please check the details you entered.");
    }
    throw new ApiError(res.status, "error", res.status >= 500 ? SERVER_MESSAGE : "Request failed.");
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  register: (email: string, password: string, default_currency?: string) =>
    request<{ access_token: string }>("/auth/register", {
      method: "POST",
      body: { email, password, default_currency },
      auth: false,
    }),

  me: () => request<User>("/auth/me"),
  updateCurrency: (default_currency: string) =>
    request<User>("/auth/me", { method: "PATCH", body: { default_currency } }),

  parseExpense: (text: string) =>
    request<ParsedExpense>("/expenses/parse", { method: "POST", body: { text } }),
  createExpense: (body: ParsedExpense & { raw_text?: string; description?: string | null }) =>
    request<Expense>("/expenses", { method: "POST", body }),
  listExpenses: ({ month, category, page }: ExpenseFilters, pageSize = PAGE_SIZE) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (month) params.set("month", month);
    if (category) params.set("category", category);
    return request<ExpensePage>(`/expenses?${params}`);
  },
  updateExpense: (id: string, patch: ExpenseUpdate) =>
    request<Expense>(`/expenses/${id}`, { method: "PATCH", body: patch }),
  deleteExpense: (id: string) => request<void>(`/expenses/${id}`, { method: "DELETE" }),

  summary: (month: string) => request<Summary>(`/summary?month=${month}`),
  monthlyReport: (year: number) => request<MonthlyReport>(`/reports/monthly?year=${year}`),

  getLLMSettings: () => request<LLMSettings>("/settings/llm"),
  saveLLMSettings: (body: LLMSettingsInput) =>
    request<LLMSettings>("/settings/llm", { method: "PUT", body }),
  resetLLMSettings: () => request<LLMSettings>("/settings/llm", { method: "DELETE" }),
  testLLMSettings: () => request<{ ok: boolean }>("/settings/llm/test", { method: "POST" }),

  chat: (message: string, history: ChatTurn[]) =>
    request<{ reply: string }>("/assistant/chat", { method: "POST", body: { message, history } }),
};

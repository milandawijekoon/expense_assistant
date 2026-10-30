import { ApiError } from "@/lib/api";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex justify-center py-16 text-slate-500">
      <Spinner label={label} />
    </div>
  );
}

export function ErrorBanner({
  error,
  onRetry,
  retryLabel = "Try again",
}: {
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const message =
    error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
  const showRetry = onRetry && (!(error instanceof ApiError) || error.retryable);
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <span>{message}</span>
      {showRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary">
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
      {category}
    </span>
  );
}

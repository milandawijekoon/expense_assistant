"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { ErrorBanner, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";

type Mode = "login" | "register";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15";

function Logo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-900 text-white md:flex md:w-[46%] md:flex-col md:justify-between md:p-10 xl:p-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_-10%_-10%,rgba(129,140,248,0.45),transparent_60%),radial-gradient(40rem_30rem_at_110%_110%,rgba(99,102,241,0.5),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]"
      />

      <div className="relative flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
          <Logo />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Smart Expense Assistant</span>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight lg:text-4xl xl:text-5xl">
          Just say what you spent.
          <span className="block text-brand-200">We&rsquo;ll handle the rest.</span>
        </h2>
        <p className="mt-5 text-base leading-relaxed text-indigo-100/80">
          Log expenses in plain language and see where your money actually goes.
        </p>

        <div className="mt-8 space-y-3 xl:mt-10" aria-hidden="true">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-white/15 px-4 py-2.5 text-sm ring-1 ring-white/20 backdrop-blur">
            Lunch with Priya 480 and cab home 220
          </div>
          <div className="w-full rounded-2xl rounded-bl-md bg-white p-4 text-slate-900 shadow-2xl shadow-black/20">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Added 2 expenses</p>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              <li className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Food</span>
                  Lunch with Priya
                </span>
                <span className="font-semibold tabular-nums">480</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Travel</span>
                  Cab home
                </span>
                <span className="font-semibold tabular-nums">220</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <ul className="relative flex flex-wrap gap-x-6 gap-y-2 text-sm text-indigo-100/80">
        {["Auto-categorised", "Clear reports", "Your data, private"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
              <Check />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) score = Math.min(score, 1);
  return { score, label: ["Too short", "Weak", "Fair", "Good", "Strong"][score] };
}

export default function LoginPage() {
  const { token, ready, signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready && token) router.replace("/dashboard");
  }, [ready, token, router]);

  const mutation = useMutation({
    mutationFn: () => (mode === "login" ? signIn(email, password) : signUp(email, password, currency)),
    onSuccess: () => router.replace("/dashboard"),
  });

  const isLogin = mode === "login";
  const strength = passwordStrength(password);

  function switchMode(next: Mode) {
    if (next === mode) return;
    mutation.reset();
    setMode(next);
  }

  return (
    <div className="flex min-h-screen bg-white">
      <BrandPanel />

      <main className="flex flex-1 flex-col bg-[#f6f7fb] md:bg-white">
        <div className="flex items-center gap-2.5 px-6 pt-6 md:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm shadow-brand-600/30">
            <Logo className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Smart Expense Assistant</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[26rem]">
            <div role="tablist" aria-label="Authentication mode" className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
              {(
                [
                  ["login", "Log in"],
                  ["register", "Sign up"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  id={`tab-${m}`}
                  aria-selected={mode === m}
                  aria-controls="auth-panel"
                  onClick={() => switchMode(m)}
                  className={`rounded-lg py-2 transition ${
                    mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-900">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1.5 text-[15px] text-slate-500">
                {isLogin
                  ? "Log in to see your spending."
                  : "Start tracking your expenses in under a minute."}
              </p>
            </div>

            <form
              id="auth-panel"
              role="tabpanel"
              aria-labelledby={`tab-${mode}`}
              className="mt-7 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              {mutation.isError && <ErrorBanner error={mutation.error} />}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={isLogin ? 1 : 8}
                    maxLength={72}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder={isLogin ? "Your password" : "At least 8 characters"}
                    className={`${fieldClass} pr-16`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby={isLogin ? undefined : "password-hint"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                    <span className="sr-only"> password</span>
                  </button>
                </div>
                {!isLogin && (
                  <div id="password-hint" className="mt-2">
                    <div className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            strength.score >= i
                              ? ["", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"][strength.score]
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500" aria-live="polite">
                      {strength.label ? `${strength.label}. ` : ""}Use at least 8 characters.
                    </p>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="currency" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Currency
                  </label>
                  <CurrencySelect id="currency" value={currency} onChange={setCurrency} describedBy="currency-hint" className={fieldClass} />
                  <p id="currency-hint" className="mt-1.5 text-xs text-slate-500">
                    You can change it later in Settings.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending && <Spinner label="Please wait" />}
                {isLogin ? "Log in" : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {isLogin ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-semibold text-brand-700 underline-offset-4 hover:underline"
                onClick={() => switchMode(isLogin ? "register" : "login")}
              >
                {isLogin ? "Create an account" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

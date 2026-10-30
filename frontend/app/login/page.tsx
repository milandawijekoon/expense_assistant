"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBanner, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { token, ready, signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (ready && token) router.replace("/add");
  }, [ready, token, router]);

  const mutation = useMutation({
    mutationFn: () => (mode === "login" ? signIn(email, password) : signUp(email, password)),
    onSuccess: () => router.replace("/add"),
  });

  const isLogin = mode === "login";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold">Smart Expense Assistant</h1>
      <p className="mt-1 text-sm text-slate-600">
        {isLogin ? "Log in to see your spending." : "Create an account to start tracking."}
      </p>

      <form
        className="card mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        {mutation.isError && <ErrorBanner error={mutation.error} />}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={isLogin ? 1 : 8}
            maxLength={72}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={isLogin ? undefined : "password-hint"}
          />
          {!isLogin && (
            <p id="password-hint" className="mt-1 text-xs text-slate-500">
              At least 8 characters.
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner label="Please wait" />}
          {isLogin ? "Log in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 text-sm text-brand-700 underline"
        onClick={() => {
          mutation.reset();
          setMode(isLogin ? "register" : "login");
        }}
      >
        {isLogin ? "New here? Create an account" : "Already have an account? Log in"}
      </button>
    </main>
  );
}

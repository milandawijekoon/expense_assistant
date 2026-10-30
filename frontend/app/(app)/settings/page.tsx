"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { ErrorBanner, PageLoading, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import type { LLMSettings, Provider } from "@/lib/types";

const PROVIDERS: Record<Provider, { label: string; model: string; needsKey: boolean; urlHint: string }> = {
  anthropic: { label: "Anthropic (Claude)", model: "claude-sonnet-5-5", needsKey: true, urlHint: "" },
  openai: { label: "OpenAI or compatible", model: "gpt-4o-mini", needsKey: true, urlHint: "https://api.openai.com/v1" },
  ollama: { label: "Ollama (local)", model: "qwen2.5:3b", needsKey: false, urlHint: "http://localhost:11434/v1" },
};

export default function SettingsPage() {
  const query = useQuery({ queryKey: ["llm-settings"], queryFn: api.getLLMSettings });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <CurrencyForm />

      <h2 className="mt-10 text-lg font-semibold">AI provider</h2>
      <p className="mt-1 text-sm text-slate-600">
        Choose the provider that reads your expenses and answers your questions. Your API key is
        encrypted on the server and is never shown again after you save it.
      </p>
      <div className="mt-4" aria-live="polite">
        {query.isPending && <PageLoading label="Loading settings" />}
        {query.isError && <ErrorBanner error={query.error} onRetry={() => query.refetch()} />}
        {query.data && <LLMForm saved={query.data} />}
      </div>
    </div>
  );
}

function CurrencyForm() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  const [value, setValue] = useState("");

  useEffect(() => {
    if (me.data) setValue(me.data.default_currency);
  }, [me.data]);

  const save = useMutation({
    mutationFn: () => api.updateCurrency(value),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      // Totals, summaries and reports are all reported in the default currency.
      for (const key of ["summary", "report", "expenses"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  const valid = /^[A-Z]{3}$/.test(value);
  const changed = me.data && value !== me.data.default_currency;

  return (
    <section aria-labelledby="currency-title" className="mt-6">
      <h2 id="currency-title" className="text-lg font-semibold">Currency</h2>
      <p className="mt-1 text-sm text-slate-600">
        Used when an expense doesn&apos;t name a currency, and for totals, the dashboard and reports.
        Existing expenses keep the currency they were saved with.
      </p>
      <form
        className="card mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && changed && !save.isPending) save.mutate();
        }}
      >
        <div>
          <label htmlFor="default-currency" className="mb-1 block text-sm font-medium">
            Default currency
          </label>
          <CurrencySelect
            id="default-currency"
            value={value}
            disabled={!me.data}
            onChange={(code) => {
              save.reset();
              setValue(code);
            }}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={!valid || !changed || save.isPending}>
          {save.isPending && <Spinner label="Saving" />}
          Save currency
        </button>
        <div aria-live="polite" className="w-full">
          {me.isError && <ErrorBanner error={me.error} onRetry={() => me.refetch()} />}
          {save.isError && <ErrorBanner error={save.error} />}
          {save.isSuccess && <p role="status" className="text-sm text-green-700">✓ Currency updated.</p>}
        </div>
      </form>
    </section>
  );
}

function LLMForm({ saved }: { saved: LLMSettings }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>(saved.provider);
  const [model, setModel] = useState(saved.model);
  const [baseUrl, setBaseUrl] = useState(saved.base_url ?? "");
  const [apiKey, setApiKey] = useState("");

  // Re-sync after a save or reset replaces the stored values.
  useEffect(() => {
    setProvider(saved.provider);
    setModel(saved.model);
    setBaseUrl(saved.base_url ?? "");
    setApiKey("");
  }, [saved]);

  const meta = PROVIDERS[provider];
  const sameProvider = provider === saved.provider;
  const keptKey = sameProvider && saved.has_api_key;

  const onSaved = (data: LLMSettings) => queryClient.setQueryData(["llm-settings"], data);
  const save = useMutation({
    mutationFn: () =>
      api.saveLLMSettings({
        provider,
        model: model.trim(),
        api_key: apiKey.trim() || undefined,
        base_url: provider === "anthropic" ? undefined : baseUrl.trim() || undefined,
      }),
    onSuccess: onSaved,
  });
  const reset = useMutation({ mutationFn: api.resetLLMSettings, onSuccess: onSaved });
  const test = useMutation({ mutationFn: api.testLLMSettings });

  const changeProvider = (next: Provider) => {
    setProvider(next);
    setModel(next === saved.provider ? saved.model : PROVIDERS[next].model);
    setBaseUrl(next === saved.provider ? (saved.base_url ?? "") : "");
    setApiKey("");
    save.reset();
    test.reset();
  };

  const busy = save.isPending || reset.isPending;
  const canSave = model.trim() && (!meta.needsKey || apiKey.trim() || keptKey);

  return (
    <form
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        test.reset();
        if (canSave && !busy) save.mutate();
      }}
    >
      <p className="text-sm text-slate-600">
        {saved.source === "server"
          ? "Currently using the server's default configuration."
          : "Currently using your saved configuration."}{" "}
        {saved.configured ? "" : "No API key is set yet, so AI features are disabled."}
      </p>

      <div>
        <label htmlFor="provider" className="mb-1 block text-sm font-medium">Provider</label>
        <select id="provider" className="input" value={provider} onChange={(e) => changeProvider(e.target.value as Provider)}>
          {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
            <option key={p} value={p}>{PROVIDERS[p].label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="model" className="mb-1 block text-sm font-medium">Model</label>
        <input id="model" className="input" required maxLength={120} value={model} onChange={(e) => setModel(e.target.value)} />
      </div>

      {meta.needsKey && (
        <div>
          <label htmlFor="api-key" className="mb-1 block text-sm font-medium">API key</label>
          <input
            id="api-key"
            type="password"
            autoComplete="off"
            className="input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={keptKey ? `Saved (${saved.api_key_hint ?? "hidden"}). Leave blank to keep it.` : "Paste your API key"}
            aria-describedby="key-help"
          />
          <p id="key-help" className="mt-1 text-xs text-slate-500">
            Stored encrypted. Leave blank to keep the saved key.
          </p>
        </div>
      )}

      {provider !== "anthropic" && (
        <div>
          <label htmlFor="base-url" className="mb-1 block text-sm font-medium">
            Base URL {provider === "openai" && <span className="font-normal text-slate-500">(optional)</span>}
          </label>
          <input
            id="base-url"
            type="url"
            className="input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={meta.urlHint}
          />
          <p className="mt-1 text-xs text-slate-500">
            The server makes the requests, so for Ollama this must be reachable from the backend
            (inside Docker use <code>http://host.docker.internal:11434/v1</code>).
          </p>
        </div>
      )}

      <div aria-live="polite" className="space-y-2">
        {save.isError && <ErrorBanner error={save.error} />}
        {reset.isError && <ErrorBanner error={reset.error} />}
        {test.isError && <ErrorBanner error={test.error} />}
        {save.isSuccess && !save.isPending && <p role="status" className="text-sm text-green-700">✓ Settings saved.</p>}
        {test.isSuccess && <p role="status" className="text-sm text-green-700">✓ Connection works.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={!canSave || busy}>
          {save.isPending && <Spinner label="Saving" />}
          Save
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={test.isPending || busy || !saved.configured}
          onClick={() => test.mutate()}
          title="Tests the saved settings"
        >
          {test.isPending && <Spinner label="Testing" />}
          Test saved connection
        </button>
        {saved.source === "user" && (
          <button
            type="button"
            className="btn-secondary text-red-700"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Remove your saved key and use the server defaults?")) {
                test.reset();
                reset.mutate();
              }
            }}
          >
            Remove saved settings
          </button>
        )}
      </div>
    </form>
  );
}

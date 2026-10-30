"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ChatTurn } from "@/lib/types";

interface Message extends ChatTurn {
  error?: boolean;
}

const SUGGESTIONS = [
  "How much did I spend on food compared to last month?",
  "What is my total spending this month?",
  "Break down my spending by category",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: ChatTurn[] }) =>
      api.chat(message, history),
    onSuccess: ({ reply }) => setMessages((m) => [...m, { role: "assistant", content: reply }]),
    onError: (error) =>
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          error: true,
          content:
            error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
        },
      ]),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, mutation.isPending]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || mutation.isPending) return;
    const history = messages.filter((m) => !m.error).slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    mutation.mutate({ message, history });
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <h1 className="text-2xl font-semibold">Assistant</h1>
      <p className="mt-1 text-sm text-slate-600">Ask questions about your own spending.</p>

      <div
        className="card mt-4 flex h-[28rem] flex-col gap-3 overflow-y-auto"
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {messages.length === 0 && !mutation.isPending && (
          <div className="m-auto text-center">
            <p className="mb-3 text-sm text-slate-500">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="btn-secondary text-left" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : m.error
                    ? "border border-red-200 bg-red-50 text-red-800"
                    : "bg-slate-100 text-slate-900"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
              {m.content}
            </p>
          </div>
        ))}

        {mutation.isPending && (
          <div className="flex justify-start" role="status">
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  aria-hidden="true"
                  className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
              <span className="sr-only">The assistant is typing</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Your question
        </label>
        <input
          id="chat-input"
          className="input"
          placeholder="Ask about your spending…"
          maxLength={1000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim() || mutation.isPending}>
          Send
        </button>
      </form>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * How expenses can be entered.
 * - ai: describe-in-words only
 * - manual: manual form only
 * - both: offer both
 */
export type EntryMode = "ai" | "manual" | "both";

const KEY = "expense_entry_mode";
const MODES: EntryMode[] = ["ai", "manual", "both"];

export function useEntryMode(): [EntryMode, (mode: EntryMode) => void] {
  const [mode, setModeState] = useState<EntryMode>("both");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY) as EntryMode | null;
      if (saved && MODES.includes(saved)) setModeState(saved);
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  const setMode = useCallback((next: EntryMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return [mode, setMode];
}

export function entryOptions(mode: EntryMode) {
  return {
    ai: mode === "ai" || mode === "both",
    manual: mode === "manual" || mode === "both",
  };
}

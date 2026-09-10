// Serializes saves and propagates failures to explicit save/publication callers.
import { useEffect, useRef, useState, useCallback } from "react";
export type SaveState = "idle" | "editing" | "saving" | "saved" | "error";
export function useAutosave<T>(opts: {
  value: T; enabled: boolean; delayMs?: number;
  onSave: (value: T) => Promise<void>;
  getValue: () => T; getBaseline: () => T;
  isEqual: (a: T, b: T) => boolean;
}) {
  const latest = useRef(opts); latest.current = opts;
  const [state, setState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const cancel = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  const flush = useCallback(async () => {
    cancel();
    while (inflight.current) await inflight.current;
    const current = latest.current;
    const value = current.getValue();
    if (current.isEqual(value, current.getBaseline())) return;
    setState("saving"); setError(null);
    const pending = (async () => {
      try {
        await current.onSave(value);
        setState("saved"); setLastSavedAt(new Date());
      } catch (e) {
        setState("error"); setError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    })();
    inflight.current = pending;
    try { await pending; } finally { if (inflight.current === pending) inflight.current = null; }
  }, [cancel]);
  const wait = useCallback(async () => { cancel(); while (inflight.current) await inflight.current; }, [cancel]);
  useEffect(() => {
    cancel();
    if (!opts.enabled || opts.isEqual(opts.value, opts.getBaseline())) return;
    setState("editing");
    timer.current = setTimeout(() => { void flush().catch(() => undefined); }, opts.delayMs ?? 900);
    return cancel;
  }, [opts.value, opts.enabled, opts.delayMs, flush, cancel]);
  useEffect(() => {
    if (!opts.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); void flush().catch(() => undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts.enabled, flush]);
  return { state, lastSavedAt, error, flush, wait };
}

// useAutosave — debounce + status (Bloco 3 §4 Publicação como Workflow, §2 Content Session).
import { useEffect, useRef, useState, useCallback } from "react";

export type SaveState = "idle" | "editing" | "saving" | "saved" | "error";

export function useAutosave<T>(opts: {
  value: T;
  enabled: boolean;
  delayMs?: number;
  onSave: (value: T) => Promise<void>;
  isEqual?: (a: T, b: T) => boolean;
}) {
  const { value, enabled, delayMs = 900, onSave, isEqual } = opts;
  const [state, setState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValueRef = useRef<T>(value);
  const inflightRef = useRef<Promise<void> | null>(null);

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (inflightRef.current) await inflightRef.current;
    setState("saving");
    setError(null);
    const p = (async () => {
      try {
        await onSave(lastValueRef.current);
        setState("saved");
        setLastSavedAt(new Date());
      } catch (e) {
        setState("error");
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        inflightRef.current = null;
      }
    })();
    inflightRef.current = p;
    await p;
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;
    const eq = isEqual ? isEqual(value, lastValueRef.current) : value === lastValueRef.current;
    lastValueRef.current = value;
    if (eq) return;
    setState("editing");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flush(); }, delayMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, enabled, delayMs, isEqual, flush]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, flush]);

  return { state, lastSavedAt, error, flush };
}

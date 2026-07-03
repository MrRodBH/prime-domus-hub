// Workspace UI state — persistente entre reloads. Doc 06 §2 + Bloco 3 §3.
import { useSyncExternalStore } from "react";

type State = {
  railCollapsed: boolean;
  density: "compact" | "comfortable" | "spacious";
  paletteOpen: boolean;
  aiOpen: boolean;
  previewDevice: "desktop" | "tablet" | "mobile";  // Bloco 3 §3 — persistente
};

const KEY = "workspace.ui.v1";
const defaults: State = {
  railCollapsed: false,
  density: "compact",
  paletteOpen: false,
  aiOpen: false,
  previewDevice: "desktop",
};

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch { return defaults; }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    const { paletteOpen: _p, aiOpen: _a, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch { /* ignore */ }
}

export function setUI(patch: Partial<State>) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

export function useUI() {
  const snap = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => defaults,
  );
  return {
    ...snap,
    toggleRail: () => setUI({ railCollapsed: !state.railCollapsed }),
    setDensity: (d: State["density"]) => setUI({ density: d }),
    openPalette: () => setUI({ paletteOpen: true }),
    closePalette: () => setUI({ paletteOpen: false }),
    togglePalette: () => setUI({ paletteOpen: !state.paletteOpen }),
    openAi: () => setUI({ aiOpen: true }),
    closeAi: () => setUI({ aiOpen: false }),
    setPreviewDevice: (d: State["previewDevice"]) => setUI({ previewDevice: d }),
  };
}

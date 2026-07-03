// Workspace UI state — persistent per-user across reloads.
// Doc 06 §2. localStorage only in Bloco 1 (profile sync = Bloco 6).
import { useSyncExternalStore } from "react";

type State = {
  railCollapsed: boolean;
  density: "compact" | "comfortable" | "spacious";
  paletteOpen: boolean;
  aiOpen: boolean;
};

const KEY = "workspace.ui.v1";
const defaults: State = {
  railCollapsed: false,
  density: "compact",
  paletteOpen: false,
  aiOpen: false,
};

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    const { paletteOpen: _p, aiOpen: _a, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* ignore */
  }
}

export function setUI(patch: Partial<State>) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

export function useUI(): State & {
  toggleRail: () => void;
  setDensity: (d: State["density"]) => void;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  openAi: () => void;
  closeAi: () => void;
} {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => defaults
  );
  return {
    ...snap,
    toggleRail: () => setUI({ railCollapsed: !state.railCollapsed }),
    setDensity: (d) => setUI({ density: d }),
    openPalette: () => setUI({ paletteOpen: true }),
    closePalette: () => setUI({ paletteOpen: false }),
    togglePalette: () => setUI({ paletteOpen: !state.paletteOpen }),
    openAi: () => setUI({ aiOpen: true }),
    closeAi: () => setUI({ aiOpen: false }),
  };
}

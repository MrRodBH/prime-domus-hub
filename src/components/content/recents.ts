// Recents & Favorites por contexto (Bloco 3.1 §8 — Command Palette).
export type RecentEntry = { kind: string; id: string; titulo: string; route: string; at: number };

const KEY_RECENT = "workspace.recents.v1";
const KEY_FAV = "workspace.favorites.v1";
const MAX_RECENT = 12;

function read(k: string): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(k) ?? "[]") as RecentEntry[]; } catch { return []; }
}
function write(k: string, v: RecentEntry[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

export function getRecents(): RecentEntry[] { return read(KEY_RECENT); }
export function getFavorites(): RecentEntry[] { return read(KEY_FAV); }

export function pushRecent(e: Omit<RecentEntry, "at">) {
  const list = read(KEY_RECENT).filter((x) => !(x.kind === e.kind && x.id === e.id));
  list.unshift({ ...e, at: Date.now() });
  write(KEY_RECENT, list.slice(0, MAX_RECENT));
}

export function toggleFavorite(e: Omit<RecentEntry, "at">) {
  const list = read(KEY_FAV);
  const exists = list.find((x) => x.kind === e.kind && x.id === e.id);
  const next = exists
    ? list.filter((x) => !(x.kind === e.kind && x.id === e.id))
    : [{ ...e, at: Date.now() }, ...list].slice(0, MAX_RECENT);
  write(KEY_FAV, next);
  return !exists;
}

export function isFavorite(kind: string, id: string): boolean {
  return !!read(KEY_FAV).find((x) => x.kind === kind && x.id === id);
}

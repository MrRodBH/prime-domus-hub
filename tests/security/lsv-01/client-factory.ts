// LSV-01 · Lote A — Client factory (skeleton).
// Produces one Supabase client per identity, each with an isolated
// storage adapter and header set. Clients never share tokens, cookies,
// storage adapters, or authenticated globals.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimal in-memory storage adapter matching the interface Supabase
 * expects. Each client instance gets a fresh one to guarantee session
 * isolation.
 */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

export interface LsvClientOptions {
  readonly url: string;
  readonly anonKey: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export function createIsolatedClient(opts: LsvClientOptions): SupabaseClient {
  const storage = new MemoryStorage() as unknown as Storage;
  return createClient(opts.url, opts.anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { ...(opts.headers ?? {}) },
    },
  });
}

/**
 * Structural check used by the smoke tests: two clients must not share
 * their storage adapter reference.
 */
export function clientsShareStorage(
  a: SupabaseClient,
  b: SupabaseClient,
): boolean {
  const storageOf = (c: SupabaseClient) =>
    (c as unknown as { auth: { storage?: unknown } }).auth?.storage;
  const sa = storageOf(a);
  const sb = storageOf(b);
  return sa !== undefined && sa === sb;
}

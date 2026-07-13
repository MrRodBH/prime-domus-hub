// Impersonation Local State — Patch 2.3.1 (Security Hardening)
//
// Fonte única do estado local de impersonação do Super Admin.
// O estado local é APENAS transporte / UX: qualquer decisão de autoridade
// permanece server-side em `requireTenant` (IA-001). Este módulo garante
// que o estado local nunca sobreviva a:
//   • logout;
//   • evento SIGNED_OUT do Supabase Auth;
//   • encerramento manual pelo Super;
//   • falhas de impersonação sinalizadas pelo server;
//   • inicialização com usuário não-Super.
//
// Cf. `docs/delivery/phase-02-multi-tenancy/10-fase-2-3-relatorio.md` §Patch 2.3.1.

const KEY = "impersonate_tenant_id";
const listeners = new Set<() => void>();

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getImpersonationTenantId(): string | null {
  const s = safeStorage();
  if (!s) return null;
  try {
    const v = s.getItem(KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setImpersonationTenantId(tenantId: string): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(KEY, tenantId);
  } catch {
    /* noop */
  }
  emit();
}

export function clearImpersonationTenantId(): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    /* noop */
  }
  emit();
}

/** useSyncExternalStore-compatible subscription. */
export function subscribeImpersonation(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function emit() {
  for (const cb of Array.from(listeners)) {
    try {
      cb();
    } catch {
      /* noop */
    }
  }
}

/**
 * Regra 4 — heurística para reconhecer erros server-side de impersonação
 * que justificam limpar o estado local (evita loops de header inválido).
 * Conservadora: só limpa em casos determinísticos e seguros.
 */
export function isImpersonationRejection(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  if (!msg) return false;
  return /forbidden|invalid tenant|tenant not found|impersonation not allowed/i.test(
    msg,
  );
}

/** Regra 4 — limpeza segura quando o server rejeitou a impersonação. */
export function clearImpersonationOnServerRejection(err: unknown): boolean {
  if (!isImpersonationRejection(err)) return false;
  if (!getImpersonationTenantId()) return false;
  clearImpersonationTenantId();
  return true;
}

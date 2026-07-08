// F3.4 — Tenant Selection Local State
//
// Estado local de seleção de tenant para USUÁRIO COMUM (não Super Admin).
// É apenas TRANSPORTE / preferência de UX; qualquer autoridade sobre o
// tenant permanece server-side (F3.2/F3.3 — `requireTenant`,
// `get_current_tenant_id`). Segue o mesmo padrão de
// `impersonation-state.ts` (fonte única + useSyncExternalStore).
//
// Contrato (Hard Gate §3.2, §3.3, §8):
//   • Persistimos APENAS o tenantId escolhido — nunca a lista de
//     tenants (que não é autoridade);
//   • a lista é sempre buscada via `listSelectableTenants` server-side
//     (active-only);
//   • seleção é limpa em: logout, SIGNED_OUT, troca de usuário,
//     rejeição server-side, ou quando o tenantId deixa de constar na
//     lista active-only;
//   • NÃO é fonte para Super Admin — SA usa `impersonation-state`.

const KEY = "selected_tenant_id";
const listeners = new Set<() => void>();

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSelectedTenantId(): string | null {
  const s = safeStorage();
  if (!s) return null;
  try {
    const v = s.getItem(KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setSelectedTenantId(tenantId: string): void {
  if (!tenantId || tenantId.length === 0) return;
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(KEY, tenantId);
  } catch {
    /* noop */
  }
  emit();
}

export function clearSelectedTenantId(): void {
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
export function subscribeTenantSelection(cb: () => void): () => void {
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
 * Heurística conservadora — reconhece rejeições server-side que
 * justificam limpar o estado local para evitar loops de header
 * inválido. Alinhado com as mensagens do middleware server-side
 * (`resolveTenantContext`) e da RPC `get_current_tenant_id`.
 */
export function isTenantSelectionRejection(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  if (!msg) return false;
  return /invalid tenant selection|tenant access denied|forbidden: no tenant membership|no active tenant membership|tenant selection required/i.test(
    msg,
  );
}

/** Limpa o estado local se o erro server-side indicar seleção inválida. */
export function clearTenantSelectionOnServerRejection(err: unknown): boolean {
  if (!isTenantSelectionRejection(err)) return false;
  if (!getSelectedTenantId()) return false;
  clearSelectedTenantId();
  return true;
}

/**
 * Reconcilia a seleção local contra a lista active-only vinda do
 * server. Se o tenantId persistido não estiver mais na lista, limpa.
 * Retorna a seleção efetiva pós-reconciliação.
 */
export function reconcileSelection(
  activeTenantIds: readonly string[],
): string | null {
  const current = getSelectedTenantId();
  if (!current) return null;
  if (!activeTenantIds.includes(current)) {
    clearSelectedTenantId();
    return null;
  }
  return current;
}

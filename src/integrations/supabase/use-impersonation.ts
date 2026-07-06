// React hook — consome o estado local de impersonação como fonte reativa.
// Patch 2.3.1: garante sincronização entre estado persistido e UI.
import { useSyncExternalStore } from "react";
import {
  getImpersonationTenantId,
  subscribeImpersonation,
} from "@/integrations/supabase/impersonation-state";

export function useImpersonation(): string | null {
  return useSyncExternalStore(
    subscribeImpersonation,
    getImpersonationTenantId,
    () => null, // SSR: sem estado local
  );
}

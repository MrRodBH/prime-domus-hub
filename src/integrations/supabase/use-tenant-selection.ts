// F3.4 — React hook para o estado local de seleção de tenant.
// Segue o padrão de `use-impersonation.ts`.
import { useSyncExternalStore } from "react";
import {
  getSelectedTenantId,
  subscribeTenantSelection,
} from "@/integrations/supabase/tenant-selection-state";

export function useSelectedTenantId(): string | null {
  return useSyncExternalStore(
    subscribeTenantSelection,
    getSelectedTenantId,
    () => null, // SSR: sem estado local
  );
}

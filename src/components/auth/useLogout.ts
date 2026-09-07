import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearImpersonationTenantId } from "@/integrations/supabase/impersonation-state";
import { clearSelectedTenantId } from "@/integrations/supabase/tenant-selection-state";
import { setCurrentTenantId } from "@/lib/tenant-cache";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
      clearImpersonationTenantId();
      clearSelectedTenantId();
      setCurrentTenantId(null);
      await queryClient.cancelQueries();
      queryClient.clear();
      await navigate({ to: "/auth", replace: true });
      return true;
    } catch {
      setError("Não foi possível concluir a saída. Tente novamente.");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { logout, busy, error };
}

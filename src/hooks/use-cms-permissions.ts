import { useQuery } from "@tanstack/react-query";
import { meusModulos, type RbacAction } from "@/lib/api/rbac.functions";
import { meusPapeis } from "@/lib/api/admin.functions";

export type CmsModuleCode =
  | "cms.paginas" | "cms.campanhas" | "cms.formularios" | "cms.midias"
  | "cms.menu" | "cms.branding" | "cms.versoes" | "cms.configuracoes";

/**
 * Hook cliente para checar permissões CMS por módulo + ação.
 * Admin sempre passa. Para outros papéis, valida a permissão explícita.
 */
export function useCmsPermissions() {
  const { data: roles } = useQuery({ queryKey: ["meus-papeis"], queryFn: () => meusPapeis(), staleTime: 60_000 });
  const { data: perms, isLoading } = useQuery({
    queryKey: ["meus-modulos-cms"],
    queryFn: () => meusModulos(),
    staleTime: 60_000,
  });
  const isAdmin = Array.isArray(roles) && roles.includes("admin");

  function can(modulo: CmsModuleCode, action: RbacAction | "publicar"): boolean {
    if (isAdmin) return true;
    if (!Array.isArray(perms)) return false;
    return perms.some(
      (p) => p.modulo === modulo && (p.action as string) === action,
    );
  }

  function canAny(modulo: CmsModuleCode): boolean {
    if (isAdmin) return true;
    if (!Array.isArray(perms)) return false;
    return perms.some((p) => p.modulo === modulo);
  }

  return { can, canAny, isAdmin, isLoading };
}

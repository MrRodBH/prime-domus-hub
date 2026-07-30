import { useQuery } from "@tanstack/react-query";
import { meusModulos, type RbacAction } from "@/lib/api/rbac.functions";

export type CmsModuleCode =
  | "cms.paginas"
  | "cms.campanhas"
  | "cms.formularios"
  | "cms.midias"
  | "cms.menu"
  | "cms.branding"
  | "cms.versoes"
  | "cms.configuracoes";

/**
 * Projeção exclusivamente visual das permissões já resolvidas pelo servidor.
 * O client não consulta roles globais nem cria bypass local para "admin".
 * Toda operação permanece reautorizada pelo boundary server-side correspondente.
 */
export function useCmsPermissions() {
  const { data: perms, isLoading } = useQuery({
    queryKey: ["meus-modulos-cms"],
    queryFn: () => meusModulos(),
    staleTime: 60_000,
  });

  function can(module: CmsModuleCode, action: RbacAction | "publicar"): boolean {
    if (!Array.isArray(perms)) return false;
    return perms.some(
      (permission) =>
        permission.modulo === module &&
        (permission.action as string) === action,
    );
  }

  function canAny(module: CmsModuleCode): boolean {
    if (!Array.isArray(perms)) return false;
    return perms.some((permission) => permission.modulo === module);
  }

  return {
    can,
    canAny,
    isAdmin: false,
    isLoading,
  };
}

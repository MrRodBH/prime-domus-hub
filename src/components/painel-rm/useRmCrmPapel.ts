import { useQuery } from "@tanstack/react-query";
import { meuPerfilNoTenant } from "@/lib/api/tenant.functions";

/** Equivalente ao useAuth().ehAdminOuGestor do RM Prime, usando o papel do usuário no tenant. */
export function useRmCrmPapel() {
  const { data } = useQuery({ queryKey: ["painel-perfil-crm"], queryFn: () => meuPerfilNoTenant(), staleTime: 5 * 60_000 });
  const papel = data?.papel ?? null;
  return { ehAdminOuGestor: papel === "owner" || papel === "admin" || papel === "manager" };
}

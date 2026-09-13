import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customizeTenantAccessProfile, listarModulos, obterPerfilComPermissoes, togglePermissao, type RbacAction, type RbacScope } from "@/lib/api/rbac.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ACTIONS: RbacAction[] = ["visualizar", "criar", "editar", "excluir", "publicar", "exportar", "importar", "aprovar", "gerenciar"];
const ACTION_LABEL: Record<RbacAction, string> = {
  visualizar: "Ver",
  criar: "Criar",
  editar: "Editar",
  excluir: "Excluir",
  publicar: "Publicar",
  exportar: "Exportar",
  importar: "Importar",
  aprovar: "Aprovar",
  gerenciar: "Gerenciar",
};
const SCOPE_LABEL: Record<RbacScope, string> = { proprio: "Próprios", equipe: "Equipe", global: "Toda a empresa" };

export function TenantPermissionMatrix({ profileId, onClose, onCustomized }: { profileId: string; onClose: () => void; onCustomized?: (id: string) => void }) {
  const qc = useQueryClient();
  const [effectiveId, setEffectiveId] = useState(profileId);
  profileId = effectiveId;
  const customize = useMutation({mutationFn: () => customizeTenantAccessProfile({data:{sourceId:profileId}}),onSuccess: result => { setEffectiveId(result.id); onCustomized?.(result.id); void qc.invalidateQueries({queryKey:["rbac"]}); },onError:(error:Error)=>toast.error(error.message)});
  const modulos = useQuery({ queryKey: ["rbac", "modulos"], queryFn: () => listarModulos() });
  const perfil = useQuery({ queryKey: ["rbac", "perfil", profileId], queryFn: () => obterPerfilComPermissoes({ data: { id: profileId } }) });
  const immutable = perfil.data?.perfil.sistema === true;

  const permission = useMutation({
    mutationFn: (value: { module_id: string; action: RbacAction; scope: RbacScope; enabled: boolean }) =>
      togglePermissao({ data: { profile_id: profileId, ...value } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rbac", "perfil", profileId] });
      void qc.invalidateQueries({ queryKey: ["rbac", "perfis"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const permissions = perfil.data?.permissoes ?? [];
  const get = (moduleId: string, action: RbacAction) => permissions.find((item) => item.module_id === moduleId && item.action === action);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-6xl overflow-auto">
        <DialogHeader>
          <DialogTitle>Permissões — {perfil.data?.perfil.nome ?? "carregando"}</DialogTitle>
          <DialogDescription>Configure as ações e o alcance do acesso dentro da empresa.</DialogDescription>
        </DialogHeader>
        {immutable ? <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">Modelo de referência. Personalize uma cópia para sua empresa.</div> : null}
        {perfil.isError || modulos.isError ? <div className="rounded-md border border-destructive/40 p-4 text-sm">Falha ao carregar a matriz. Feche e tente novamente.</div> : null}
        {immutable ? <Button disabled={customize.isPending} onClick={() => customize.mutate()}>Personalizar para a empresa</Button> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="sticky left-0 bg-card p-2 text-left">Módulo</th>{ACTIONS.map((action) => <th key={action} className="min-w-[96px] p-2 text-center">{ACTION_LABEL[action]}</th>)}</tr></thead>
            <tbody>
              {modulos.data?.map((module) => (
                <tr key={module.id} className="border-b hover:bg-muted/20">
                  <td className="sticky left-0 bg-card p-2 font-medium">{module.name}</td>
                  {ACTIONS.map((action) => {
                    const current = get(module.id, action);
                    const enabled = Boolean(current);
                    return (
                      <td key={action} className="p-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="checkbox"
                            aria-label={`${module.name}: ${ACTION_LABEL[action]}`}
                            checked={enabled}
                            disabled={immutable || permission.isPending || perfil.isPending || perfil.isError || modulos.isError}
                            className="size-4 cursor-pointer accent-petroleum disabled:cursor-not-allowed"
                            onChange={(event) => permission.mutate({ module_id: module.id, action, scope: current?.scope ?? "proprio", enabled: event.target.checked })}
                          />
                          {enabled ? (
                            <Select
                              value={current?.scope ?? "proprio"}
                              disabled={immutable || permission.isPending || perfil.isPending || perfil.isError || modulos.isError}
                              onValueChange={(scope: RbacScope) => permission.mutate({ module_id: module.id, action, scope, enabled: true })}
                            >
                              <SelectTrigger className="h-7 w-[86px] px-1 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{(["proprio", "equipe", "global"] as RbacScope[]).map((scope) => <SelectItem key={scope} value={scope}>{SCOPE_LABEL[scope]}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Precedência efetiva: <strong>Toda a empresa &gt; Equipe &gt; Próprios</strong>. A resolução ocorre no servidor sobre todas as associações do usuário.</p>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarPerfis,
  listarModulos,
  obterPerfilComPermissoes,
  salvarPerfil,
  excluirPerfil,
  togglePermissao,
  type RbacAction,
  type RbacScope,
} from "@/lib/api/rbac.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/perfis")({ component: PerfisPage });

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
const SCOPE_LABEL: Record<RbacScope, string> = { proprio: "Próprios", equipe: "Equipe", global: "Global" };

function PerfisPage() {
  const qc = useQueryClient();
  const perfis = useQuery({ queryKey: ["rbac", "perfis"], queryFn: () => listarPerfis() });
  const [openForm, setOpenForm] = useState(false);
  const [edit, setEdit] = useState<{ id?: string; nome: string; descricao?: string } | null>(null);
  const [matrizId, setMatrizId] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: (data: { id?: string; nome: string; descricao?: string }) => salvarPerfil({ data }),
    onSuccess: () => {
      toast.success("Perfil tenant-scoped salvo.");
      void qc.invalidateQueries({ queryKey: ["rbac", "perfis"] });
      setOpenForm(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirPerfil({ data: { id } }),
    onSuccess: () => {
      toast.success("Perfil excluído.");
      void qc.invalidateQueries({ queryKey: ["rbac", "perfis"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AdminPageHeader eyebrow="Controle de acesso" title="Perfis & Permissões" />
          <p className="mt-1 text-sm text-muted-foreground">
            Templates de sistema são globais e imutáveis. Perfis customizados pertencem exclusivamente ao tenant atual.
          </p>
        </div>
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit({ nome: "", descricao: "" })}><Plus className="mr-1 size-4" /> Novo perfil</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit?.id ? "Editar perfil do tenant" : "Novo perfil do tenant"}</DialogTitle></DialogHeader>
            {edit ? (
              <form onSubmit={(event) => { event.preventDefault(); salvar.mutate(edit); }} className="space-y-3">
                <div><Label>Nome *</Label><Input required value={edit.nome} onChange={(event) => setEdit({ ...edit, nome: event.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={edit.descricao ?? ""} onChange={(event) => setEdit({ ...edit, descricao: event.target.value })} /></div>
                <Button type="submit" disabled={salvar.isPending}>Salvar</Button>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      {perfis.isPending ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">Carregando perfis…</div>
      ) : perfis.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p>Não foi possível carregar os perfis.</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void perfis.refetch()}><RefreshCw className="mr-2 size-4" /> Tentar novamente</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Perfil</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Membros</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {perfis.data?.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted-foreground" />{profile.nome}</div></TableCell>
                  <TableCell>{profile.sistema ? <Badge variant="secondary">template de sistema</Badge> : <Badge variant="outline">tenant</Badge>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{profile.descricao ?? "—"}</TableCell>
                  <TableCell>{profile.total_usuarios}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setMatrizId(profile.id)}>Permissões</Button>
                      {!profile.sistema ? (
                        <Button size="icon" variant="ghost" onClick={() => { setEdit({ id: profile.id, nome: profile.nome, descricao: profile.descricao ?? "" }); setOpenForm(true); }}><Pencil className="size-4" /></Button>
                      ) : null}
                      {!profile.sistema && profile.can_delete ? (
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir perfil "${profile.nome}"?`)) excluir.mutate(profile.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!perfis.data?.length ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum perfil disponível.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      )}

      {matrizId ? <MatrizDialog profileId={matrizId} onClose={() => setMatrizId(null)} /> : null}
    </div>
  );
}

function MatrizDialog({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const qc = useQueryClient();
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
        </DialogHeader>
        {immutable ? <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">Template de sistema: consulta permitida, edição bloqueada.</div> : null}
        {perfil.isError || modulos.isError ? <div className="rounded-md border border-destructive/40 p-4 text-sm">Falha ao carregar a matriz. Feche e tente novamente.</div> : null}
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
                            checked={enabled}
                            disabled={immutable || permission.isPending}
                            className="size-4 cursor-pointer accent-petroleum disabled:cursor-not-allowed"
                            onChange={(event) => permission.mutate({ module_id: module.id, action, scope: current?.scope ?? "proprio", enabled: event.target.checked })}
                          />
                          {enabled ? (
                            <Select
                              value={current?.scope ?? "proprio"}
                              disabled={immutable || permission.isPending}
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
        <p className="text-xs text-muted-foreground">Precedência efetiva: <strong>Global &gt; Equipe &gt; Próprios</strong>. A resolução ocorre no servidor sobre todas as associações do usuário.</p>
      </DialogContent>
    </Dialog>
  );
}

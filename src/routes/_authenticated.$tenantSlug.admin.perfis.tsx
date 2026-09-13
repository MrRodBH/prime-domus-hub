import { TenantPermissionMatrix } from "@/components/admin/TenantPermissionMatrix";
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

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/perfis")({ component: PerfisPage });

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
            Escolha um modelo e use “Personalizar para a empresa” para ajustar as permissões. Atribua o perfil personalizado aos usuários.
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

      {matrizId ? <TenantPermissionMatrix profileId={matrizId} onClose={() => setMatrizId(null)} /> : null}
    </div>
  );
}

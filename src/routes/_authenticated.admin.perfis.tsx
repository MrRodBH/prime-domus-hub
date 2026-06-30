import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarPerfis, listarModulos, obterPerfilComPermissoes,
  salvarPerfil, excluirPerfil, togglePermissao, atualizarEscopo,
  type RbacAction, type RbacScope,
} from "@/lib/api/rbac.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/perfis")({
  component: PerfisPage,
});

const ACTIONS: RbacAction[] = ["visualizar","criar","editar","excluir","exportar","importar","aprovar","gerenciar"];
const ACTION_LABEL: Record<RbacAction,string> = {
  visualizar:"Ver", criar:"Criar", editar:"Editar", excluir:"Excluir",
  exportar:"Exportar", importar:"Importar", aprovar:"Aprovar", gerenciar:"Gerenciar",
};
const SCOPE_LABEL: Record<RbacScope,string> = { proprio:"Próprios", equipe:"Equipe", global:"Global" };

function PerfisPage() {
  const qc = useQueryClient();
  const perfis = useQuery({ queryKey: ["rbac","perfis"], queryFn: () => listarPerfis() });

  const [openForm, setOpenForm] = useState(false);
  const [edit, setEdit] = useState<{ id?: string; nome: string; descricao?: string } | null>(null);
  const [matrizId, setMatrizId] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: (d: { id?: string; nome: string; descricao?: string }) => salvarPerfil({ data: d }),
    onSuccess: () => { toast.success("Perfil salvo"); qc.invalidateQueries({ queryKey:["rbac","perfis"] }); setOpenForm(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const excluir = useMutation({
    mutationFn: (id: string) => excluirPerfil({ data: { id } }),
    onSuccess: () => { toast.success("Perfil excluído"); qc.invalidateQueries({ queryKey:["rbac","perfis"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><ShieldCheck className="size-7"/> Perfis & Permissões</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie perfis e configure permissões por módulo, ação e escopo de visibilidade.</p>
        </div>
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit({ nome: "", descricao: "" })}><Plus className="size-4 mr-1"/> Novo perfil</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit?.id ? "Editar perfil" : "Novo perfil"}</DialogTitle></DialogHeader>
            {edit && (
              <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(edit); }} className="space-y-3">
                <div><Label>Nome *</Label><Input required value={edit.nome} onChange={(e) => setEdit({...edit, nome: e.target.value})}/></div>
                <div><Label>Descrição</Label><Textarea value={edit.descricao ?? ""} onChange={(e) => setEdit({...edit, descricao: e.target.value})}/></div>
                <Button type="submit" disabled={salvar.isPending}>Salvar</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Perfil</TableHead><TableHead>Descrição</TableHead><TableHead>Usuários</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {perfis.data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {p.nome}
                  {p.sistema && <Badge variant="secondary" className="text-[10px]">sistema</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.descricao ?? "—"}</TableCell>
                <TableCell>{p.total_usuarios}</TableCell>
                <TableCell className="flex gap-1 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setMatrizId(p.id)}>Permissões</Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEdit({ id: p.id, nome: p.nome, descricao: p.descricao ?? "" }); setOpenForm(true); }}>
                    <Pencil className="size-4"/>
                  </Button>
                  {!p.sistema && (
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir perfil "${p.nome}"?`)) excluir.mutate(p.id); }}>
                      <Trash2 className="size-4 text-destructive"/>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!perfis.data?.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum perfil.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {matrizId && <MatrizDialog profileId={matrizId} onClose={() => setMatrizId(null)} />}
    </div>
  );
}

function MatrizDialog({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const modulos = useQuery({ queryKey: ["rbac","modulos"], queryFn: () => listarModulos() });
  const perfil = useQuery({ queryKey: ["rbac","perfil",profileId], queryFn: () => obterPerfilComPermissoes({ data: { id: profileId } }) });

  const toggle = useMutation({
    mutationFn: (v: { module_id: string; action: RbacAction; scope: RbacScope; enabled: boolean }) =>
      togglePermissao({ data: { profile_id: profileId, ...v } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["rbac","perfil",profileId] }); qc.invalidateQueries({ queryKey:["rbac","perfis"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setScope = useMutation({
    mutationFn: (v: { module_id: string; action: RbacAction; scope: RbacScope }) =>
      atualizarEscopo({ data: { profile_id: profileId, ...v } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["rbac","perfil",profileId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perms = (perfil.data?.permissoes ?? []) as Array<any>;
  const get = (module_id: string, action: RbacAction) =>
    perms.find((p) => p.module_id === module_id && p.action === action);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Permissões — {perfil.data?.perfil.nome}</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 sticky left-0 bg-card">Módulo</th>
                {ACTIONS.map((a) => <th key={a} className="p-2 text-center min-w-[90px]">{ACTION_LABEL[a]}</th>)}
              </tr>
            </thead>
            <tbody>
              {modulos.data?.map((m) => (
                <tr key={m.id} className="border-b hover:bg-foreground/[0.02]">
                  <td className="p-2 sticky left-0 bg-card font-medium">{m.nome}</td>
                  {ACTIONS.map((a) => {
                    const cur = get(m.id, a);
                    const enabled = !!cur;
                    return (
                      <td key={a} className="p-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <input type="checkbox" checked={enabled} className="size-4 accent-petroleum cursor-pointer"
                            onChange={(e) => toggle.mutate({ module_id: m.id, action: a, scope: cur?.scope ?? "global", enabled: e.target.checked })}/>
                          {enabled && (
                            <Select value={cur.scope} onValueChange={(v) => setScope.mutate({ module_id: m.id, action: a, scope: v as RbacScope })}>
                              <SelectTrigger className="h-6 text-[10px] px-1 w-[80px]"><SelectValue/></SelectTrigger>
                              <SelectContent>
                                {(["proprio","equipe","global"] as RbacScope[]).map((s) => (
                                  <SelectItem key={s} value={s}>{SCOPE_LABEL[s]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Escopo: <b>Próprios</b> (só os dados do usuário) · <b>Equipe</b> (toda a equipe do usuário) · <b>Global</b> (todos os dados).</p>
      </DialogContent>
    </Dialog>
  );
}

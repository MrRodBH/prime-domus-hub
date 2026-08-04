import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarEquipes, salvarEquipe, excluirEquipe, obterEquipe } from "@/lib/api/rbac.functions";
import { listTenantMemberships } from "@/lib/api/tenant-lifecycle.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/equipes")({ component: EquipesPage });

type FormState = {
  id?: string;
  nome: string;
  descricao: string;
  lider_user_id: string | null;
  ativo: boolean;
  member_ids: string[];
};

function EquipesPage() {
  const qc = useQueryClient();
  const equipes = useQuery({ queryKey: ["rbac", "equipes"], queryFn: () => listarEquipes() });
  const memberships = useQuery({ queryKey: ["tenant-memberships"], queryFn: () => listTenantMemberships() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const salvar = useMutation({
    mutationFn: (data: FormState) => salvarEquipe({ data }),
    onSuccess: () => {
      toast.success("Equipe tenant-scoped salva.");
      void qc.invalidateQueries({ queryKey: ["rbac", "equipes"] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirEquipe({ data: { id } }),
    onSuccess: () => {
      toast.success("Equipe excluída.");
      void qc.invalidateQueries({ queryKey: ["rbac", "equipes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function abrirEdicao(id: string) {
    try {
      const team = await obterEquipe({ data: { id } });
      setForm({
        id: team.id,
        nome: team.nome,
        descricao: team.descricao ?? "",
        lider_user_id: team.lider_user_id,
        ativo: team.ativo,
        member_ids: (team.team_members ?? []).map((member) => member.user_id),
      });
      setOpen(true);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const activeMembers = (memberships.data ?? []).filter((member) => member.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AdminPageHeader eyebrow="Controle de acesso" title="Equipes" />
          <p className="mt-1 text-sm text-muted-foreground">
            Líderes e membros são validados contra memberships ativas do tenant. A substituição de membros ocorre atomicamente.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm({ nome: "", descricao: "", lider_user_id: null, ativo: true, member_ids: [] })}><Plus className="mr-1 size-4" /> Nova equipe</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{form?.id ? "Editar equipe" : "Nova equipe"}</DialogTitle></DialogHeader>
            {form ? (
              <form onSubmit={(event) => { event.preventDefault(); salvar.mutate(form); }} className="space-y-4">
                <div><Label>Nome *</Label><Input required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Líder</Label>
                    <Select value={form.lider_user_id ?? "__none__"} onValueChange={(value) => setForm({ ...form, lider_user_id: value === "__none__" ? null : value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem líder</SelectItem>
                        {activeMembers.map((member) => <SelectItem key={member.userId} value={member.userId}>{member.email ?? member.userId}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.ativo ? "active" : "inactive"} onValueChange={(value) => setForm({ ...form, ativo: value === "active" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Ativa</SelectItem><SelectItem value="inactive">Inativa</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Membros</Label>
                  <div className="mt-1 max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                    {activeMembers.map((member) => {
                      const checked = form.member_ids.includes(member.userId);
                      return (
                        <label key={member.userId} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => setForm({
                              ...form,
                              member_ids: value
                                ? [...new Set([...form.member_ids, member.userId])]
                                : form.member_ids.filter((id) => id !== member.userId),
                            })}
                          />
                          <span>{member.email ?? member.userId}</span>
                          <Badge variant="outline">{member.role}</Badge>
                        </label>
                      );
                    })}
                    {activeMembers.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum membro ativo disponível.</p> : null}
                  </div>
                </div>
                <Button type="submit" disabled={salvar.isPending}>Salvar equipe</Button>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      {equipes.isPending ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">Carregando equipes…</div>
      ) : equipes.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p>Não foi possível carregar as equipes.</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void equipes.refetch()}><RefreshCw className="mr-2 size-4" /> Tentar novamente</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Status</TableHead><TableHead>Líder</TableHead><TableHead>Membros</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {equipes.data?.map((team) => (
                <TableRow key={team.id}>
                  <TableCell><div className="font-medium">{team.nome}</div><div className="text-xs text-muted-foreground">{team.descricao ?? "—"}</div></TableCell>
                  <TableCell><Badge variant={team.ativo ? "default" : "secondary"}>{team.ativo ? "ativa" : "inativa"}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{team.lider_user_id ?? "—"}</TableCell>
                  <TableCell>{team.total_membros}</TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => void abrirEdicao(team.id)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir equipe "${team.nome}"?`)) excluir.mutate(team.id); }}><Trash2 className="size-4 text-destructive" /></Button></div></TableCell>
                </TableRow>
              ))}
              {!equipes.data?.length ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhuma equipe.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

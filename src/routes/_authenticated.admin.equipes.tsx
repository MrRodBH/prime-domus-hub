import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarEquipes, salvarEquipe, excluirEquipe, obterEquipe } from "@/lib/api/rbac.functions";
import { adminListarCorretores } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/equipes")({
  component: EquipesPage,
});

type FormState = {
  id?: string; nome: string; descricao: string;
  lider_user_id: string | null; ativo: boolean; member_ids: string[];
};

function EquipesPage() {
  const qc = useQueryClient();
  const equipes = useQuery({ queryKey: ["rbac","equipes"], queryFn: () => listarEquipes() });
  const corretores = useQuery({ queryKey: ["admin","corretores"], queryFn: () => adminListarCorretores() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const salvar = useMutation({
    mutationFn: (d: FormState) => salvarEquipe({ data: d }),
    onSuccess: () => { toast.success("Equipe salva"); qc.invalidateQueries({ queryKey:["rbac","equipes"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const excluir = useMutation({
    mutationFn: (id: string) => excluirEquipe({ data: { id } }),
    onSuccess: () => { toast.success("Equipe excluída"); qc.invalidateQueries({ queryKey:["rbac","equipes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function abrirEdicao(id: string) {
    const eq = await obterEquipe({ data: { id } });
    setForm({
      id: eq.id, nome: eq.nome, descricao: eq.descricao ?? "",
      lider_user_id: eq.lider_user_id, ativo: eq.ativo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      member_ids: (eq.team_members ?? []).map((m: any) => m.user_id),
    });
    setOpen(true);
  }

  const usuariosComLogin = (corretores.data ?? []).filter((c) => c.user_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <AdminPageHeader
            eyebrow="Sistema"
            title="Equipes"
          />
<p className="text-sm text-muted-foreground mt-1">Agrupe usuários em equipes para escopos de visibilidade.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm({ nome: "", descricao: "", lider_user_id: null, ativo: true, member_ids: [] })}>
              <Plus className="size-4 mr-1"/> Nova equipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{form?.id ? "Editar equipe" : "Nova equipe"}</DialogTitle></DialogHeader>
            {form && (
              <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(form); }} className="space-y-3">
                <div><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})}/></div>
                <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value})}/></div>
                <div>
                  <Label>Líder</Label>
                  <Select value={form.lider_user_id ?? "__none__"} onValueChange={(v) => setForm({...form, lider_user_id: v === "__none__" ? null : v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione…"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— sem líder —</SelectItem>
                      {usuariosComLogin.map((c) => (
                        <SelectItem key={c.user_id!} value={c.user_id!}>{c.nome} {c.sobrenome ?? ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Membros</Label>
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-1.5 mt-1">
                    {usuariosComLogin.map((c) => {
                      const checked = form.member_ids.includes(c.user_id!);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={checked} onCheckedChange={(v) => setForm({
                            ...form,
                            member_ids: v ? [...form.member_ids, c.user_id!] : form.member_ids.filter((x) => x !== c.user_id),
                          })}/>
                          {c.nome} {c.sobrenome ?? ""} <span className="text-muted-foreground text-xs">— {c.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <Button type="submit" disabled={salvar.isPending}>Salvar</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Membros</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {equipes.data?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{t.descricao ?? "—"}</TableCell>
                <TableCell>{t.total_membros}</TableCell>
                <TableCell className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => abrirEdicao(t.id)}><Pencil className="size-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir "${t.nome}"?`)) excluir.mutate(t.id); }}>
                    <Trash2 className="size-4 text-destructive"/>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!equipes.data?.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma equipe.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

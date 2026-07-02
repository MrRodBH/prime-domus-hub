import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListarBairros, adminSalvarBairro, adminExcluirBairro, adminListarCidades } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/bairros")({
  component: AdminBairros,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bairro = any;

function novo(): Bairro { return { nome: "", slug: "", cidade_id: null, descricao: "", imagem_url: "", destaque: false }; }

function AdminBairros() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "bairros"], queryFn: () => adminListarBairros() });
  const { data: cidades } = useQuery({ queryKey: ["admin", "cidades"], queryFn: () => adminListarCidades() });
  const [editing, setEditing] = useState<Bairro | null>(null);
  const [open, setOpen] = useState(false);
  const LIMITE_DESTAQUE = 4;
  const destaquesAtuais = (data ?? []).filter((b: Bairro) => b.destaque && b.id !== editing?.id).length;
  const limiteAtingido = destaquesAtuais >= LIMITE_DESTAQUE;

  const salvar = useMutation({
    mutationFn: (b: Bairro) => adminSalvarBairro({ data: b }),
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["admin", "bairros"] });
      qc.invalidateQueries({ queryKey: ["bairros"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const excluir = useMutation({
    mutationFn: (id: string) => adminExcluirBairro({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["admin", "bairros"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminPageHeader
          eyebrow="Cadastros"
          title="Bairros"
        />
<Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing(novo())}><Plus className="size-4 mr-1" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Editar bairro" : "Novo bairro"}</DialogTitle></DialogHeader>
            {editing && (
              <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(editing); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nome *</Label><Input required value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
                  <div><Label>Slug *</Label><Input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
                  <div className="col-span-2">
                    <Label>Cidade *</Label>
                    <Select value={editing.cidade_id ?? ""} onValueChange={(v) => setEditing({ ...editing, cidade_id: v || null })}>
                      <SelectTrigger><SelectValue placeholder="Selecione a cidade…" /></SelectTrigger>
                      <SelectContent>
                        {cidades?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}/{c.estado}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {(!cidades || cidades.length === 0) && (
                      <p className="text-xs text-muted-foreground mt-1">Cadastre uma cidade primeiro em <strong>Cidades</strong>.</p>
                    )}
                  </div>
                  <div className="col-span-2"><Label>Imagem (URL)</Label><Input value={editing.imagem_url ?? ""} onChange={(e) => setEditing({ ...editing, imagem_url: e.target.value })} /></div>
                </div>
                <div><Label>Descrição</Label><Textarea value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Switch checked={editing.destaque} disabled={limiteAtingido && !editing.destaque} onCheckedChange={(v) => setEditing({ ...editing, destaque: v })} /><Label>Destaque na home {limiteAtingido && !editing.destaque && <span className="text-xs text-muted-foreground">(limite de {LIMITE_DESTAQUE} atingido)</span>}</Label></div>
                <Button type="submit" disabled={!editing.cidade_id}>Salvar</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cidade</TableHead><TableHead>Destaque</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((b) => {
              const cidade = (b as { cidade?: { nome?: string; estado?: string } | null }).cidade;
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.nome}</TableCell>
                  <TableCell>{cidade ? `${cidade.nome}/${cidade.estado}` : "—"}</TableCell>
                  <TableCell>{b.destaque ? "Sim" : "—"}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) excluir.mutate(b.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

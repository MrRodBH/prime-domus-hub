import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListarCidades, adminSalvarCidade, adminExcluirCidade } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cidades")({
  component: AdminCidades,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cidade = any;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function novo(): Cidade { return { nome: "", slug: "", estado: "MG" }; }

function AdminCidades() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "cidades"], queryFn: () => adminListarCidades() });
  const [editing, setEditing] = useState<Cidade | null>(null);
  const [open, setOpen] = useState(false);

  const salvar = useMutation({
    mutationFn: (c: Cidade) => adminSalvarCidade({ data: c }),
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["admin", "cidades"] });
      qc.invalidateQueries({ queryKey: ["cidades"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const excluir = useMutation({
    mutationFn: (id: string) => adminExcluirCidade({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["admin", "cidades"] });
      qc.invalidateQueries({ queryKey: ["cidades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Cidades</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(novo())}><Plus className="size-4 mr-1" /> Nova</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Editar cidade" : "Nova cidade"}</DialogTitle></DialogHeader>
            {editing && (
              <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(editing); }} className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    required
                    value={editing.nome}
                    onChange={(e) => {
                      const nome = e.target.value;
                      setEditing({ ...editing, nome, slug: editing.id ? editing.slug : slugify(nome) });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Slug *</Label><Input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
                  <div><Label>Estado (UF)</Label><Input maxLength={2} value={editing.estado} onChange={(e) => setEditing({ ...editing, estado: e.target.value.toUpperCase() })} /></div>
                </div>
                <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? "Salvando…" : "Salvar"}</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>UF</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                <TableCell>{c.estado}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir cidade? Bairros vinculados ficarão sem cidade.")) excluir.mutate(c.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

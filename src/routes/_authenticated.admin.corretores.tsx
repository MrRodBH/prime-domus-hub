import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListarCorretores,
  adminSalvarCorretor,
  adminExcluirCorretor,
  adminAssinarUrl,
} from "@/lib/api/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/corretores")({
  component: AdminCorretores,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Corretor = any;

function emptyCorretor(): Corretor {
  return { nome: "", slug: "", creci: "", email: "", telefone: "", whatsapp: "", cargo: "", bio: "", foto_url: "", ativo: true };
}

function AdminCorretores() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "corretores"], queryFn: () => adminListarCorretores() });
  const [editing, setEditing] = useState<Corretor | null>(null);
  const [open, setOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const salvar = useMutation({
    mutationFn: (c: Corretor) => adminSalvarCorretor({ data: c }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["admin", "corretores"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const excluir = useMutation({
    mutationFn: (id: string) => adminExcluirCorretor({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["admin", "corretores"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const sanitized = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `corretores/${crypto.randomUUID().slice(0, 8)}-${sanitized}`;
      const { error: upErr } = await supabase.storage.from("site").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path, width: 600, quality: 85 } });
      setEditing({ ...editing, foto_url: url });
      toast.success("Foto enviada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Corretores</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(emptyCorretor())}><Plus className="size-4 mr-1" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing?.id ? "Editar corretor" : "Novo corretor"}</DialogTitle></DialogHeader>
            {editing && (
              <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(editing); }} className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Nome *</Label><Input required value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
                  <div><Label>Slug *</Label><Input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
                  <div><Label>CRECI</Label><Input value={editing.creci ?? ""} onChange={(e) => setEditing({ ...editing, creci: e.target.value })} /></div>
                  <div><Label>Cargo</Label><Input value={editing.cargo ?? ""} onChange={(e) => setEditing({ ...editing, cargo: e.target.value })} /></div>
                  <div><Label>E-mail</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={editing.telefone ?? ""} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} /></div>
                  <div><Label>WhatsApp</Label><Input value={editing.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} placeholder="5531999990000" /></div>
                  <div><Label>Foto (URL)</Label><Input value={editing.foto_url ?? ""} onChange={(e) => setEditing({ ...editing, foto_url: e.target.value })} /></div>
                </div>
                <div><Label>Bio</Label><Textarea value={editing.bio ?? ""} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} /></div>
                <Button type="submit" disabled={salvar.isPending}>Salvar</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CRECI</TableHead><TableHead>E-mail</TableHead><TableHead>WhatsApp</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.creci}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.whatsapp}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) excluir.mutate(c.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

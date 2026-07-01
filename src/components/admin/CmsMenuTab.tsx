import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarMenuAdmin, salvarMenuItem, excluirMenuItem, reordenarMenu, type MenuItem } from "@/lib/api/menu.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

const emptyItem = {
  id: undefined as string | undefined,
  location: "header" as "header" | "footer",
  label: "",
  url: "",
  ordem: 0,
  visivel: true,
  target: "_self" as "_self" | "_blank",
  tipo: "internal" as "internal" | "external",
};

export function CmsMenuTab() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["menu-admin"], queryFn: () => listarMenuAdmin() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyItem>(emptyItem);

  const save = useMutation({
    mutationFn: () => salvarMenuItem({ data: form }),
    onSuccess: () => {
      toast.success("Item salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["menu-admin"] });
      qc.invalidateQueries({ queryKey: ["menu-header"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => excluirMenuItem({ data: { id } }),
    onSuccess: () => {
      toast.success("Item removido");
      qc.invalidateQueries({ queryKey: ["menu-admin"] });
      qc.invalidateQueries({ queryKey: ["menu-header"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reorder = useMutation({
    mutationFn: (payload: { items: { id: string; ordem: number }[] }) => reordenarMenu({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-admin"] });
      qc.invalidateQueries({ queryKey: ["menu-header"] });
    },
  });

  function move(location: "header" | "footer", index: number, dir: -1 | 1) {
    const list = items.filter((i) => i.location === location).sort((a, b) => a.ordem - b.ordem);
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index], b = list[target];
    reorder.mutate({ items: [{ id: a.id, ordem: b.ordem }, { id: b.id, ordem: a.ordem }] });
  }

  function toggleVisible(item: MenuItem) {
    setForm({ ...item, id: item.id, visivel: !item.visivel });
    setTimeout(() => save.mutate(), 0);
  }

  function openNew(location: "header" | "footer") {
    const list = items.filter((i) => i.location === location);
    const next = (list.reduce((m, x) => Math.max(m, x.ordem), 0) || 0) + 10;
    setForm({ ...emptyItem, location, ordem: next });
    setOpen(true);
  }

  function openEdit(item: MenuItem) {
    setForm({
      id: item.id, location: item.location, label: item.label, url: item.url,
      ordem: item.ordem, visivel: item.visivel, target: item.target, tipo: item.tipo,
    });
    setOpen(true);
  }

  const renderList = (location: "header" | "footer") => {
    const list = items.filter((i) => i.location === location).sort((a, b) => a.ordem - b.ordem);
    return (
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}
        {list.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 border border-foreground/10 rounded p-3">
            <div className="flex flex-col gap-1">
              <button onClick={() => move(location, i, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button onClick={() => move(location, i, +1)} disabled={i === list.length - 1} className="text-muted-foreground disabled:opacity-30"><ArrowDown className="size-4" /></button>
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.url} · {item.tipo} · {item.target}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => toggleVisible(item)} title={item.visivel ? "Ocultar" : "Exibir"}>
              {item.visivel ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Remover "${item.label}"?`)) del.mutate(item.id); }}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl">Menu do Cabeçalho</h3>
            <p className="text-xs text-muted-foreground mt-1">Itens exibidos no topo do site. Reordene com as setas.</p>
          </div>
          <Button size="sm" onClick={() => openNew("header")}><Plus className="size-4 mr-1" />Novo item</Button>
        </div>
        {renderList("header")}
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl">Menu do Rodapé (opcional)</h3>
            <p className="text-xs text-muted-foreground mt-1">Itens adicionais aparecerão em bloco lateral do rodapé (uso futuro).</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openNew("footer")}><Plus className="size-4 mr-1" />Novo item</Button>
        </div>
        {renderList("footer")}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Editar item" : "Novo item de menu"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Rótulo</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="/imoveis ou https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "internal" | "external" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interno (rota do site)</SelectItem>
                    <SelectItem value="external">Externo (URL completa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Abrir em</Label>
                <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v as "_self" | "_blank" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_self">Mesma janela</SelectItem>
                    <SelectItem value="_blank">Nova aba</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) || 0 })} />
              </div>
              <label className="flex items-end gap-2 text-sm mb-2">
                <input type="checkbox" checked={form.visivel} onChange={(e) => setForm({ ...form, visivel: e.target.checked })} />
                Visível no site
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.label || !form.url}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

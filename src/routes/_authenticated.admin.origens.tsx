import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listarOrigens, salvarOrigem, excluirOrigem } from "@/lib/api/origens.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/origens")({
  component: AdminOrigens,
});

type Origem = {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  ativo: boolean;
  ordem: number;
};

function AdminOrigens() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "origens"],
    queryFn: () => listarOrigens(),
  });
  const [editing, setEditing] = useState<Origem | null>(null);
  const [open, setOpen] = useState(false);

  const excluir = useMutation({
    mutationFn: (id: string) => excluirOrigem({ data: { id } }),
    onSuccess: () => {
      toast.success("Origem excluída.");
      qc.invalidateQueries({ queryKey: ["admin", "origens"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Origens de Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e gerencie as origens que aparecem nos formulários e relatórios.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" /> Nova Origem
        </Button>
      </div>

      <div className="rounded-lg border border-foreground/5 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
            <tr>
              <th className="text-left py-2.5 px-4">Nome</th>
              <th className="text-left py-2.5 px-4">Descrição</th>
              <th className="text-center py-2.5 px-4">Ordem</th>
              <th className="text-center py-2.5 px-4">Ativo</th>
              <th className="text-right py-2.5 px-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Carregando…</td></tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma origem cadastrada.</td></tr>
            )}
            {((data ?? []) as Origem[]).map((o) => (
              <tr key={o.id} className="border-t border-foreground/5">
                <td className="py-2.5 px-4 font-medium flex items-center gap-2">
                  {o.cor && (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: o.cor }}
                    />
                  )}
                  {o.nome}
                </td>
                <td className="py-2.5 px-4 text-muted-foreground">{o.descricao || "—"}</td>
                <td className="py-2.5 px-4 text-center">{o.ordem}</td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.ativo ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {o.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(o);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir origem "{o.nome}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Leads existentes manterão o nome da origem como texto.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => excluir.mutate(o.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OrigemDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["admin", "origens"] });
        }}
      />
    </div>
  );
}

function OrigemDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Origem | null;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [descricao, setDescricao] = useState(editing?.descricao ?? "");
  const [cor, setCor] = useState(editing?.cor ?? "#3b82f6");
  const [ativo, setAtivo] = useState(editing?.ativo ?? true);
  const [ordem, setOrdem] = useState(String(editing?.ordem ?? 0));

  // Re-sync when target changes or dialog opens
  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setDescricao(editing?.descricao ?? "");
    setCor(editing?.cor ?? "#3b82f6");
    setAtivo(editing?.ativo ?? true);
    setOrdem(String(editing?.ordem ?? 0));
  }, [editing, open]);


  const salvar = useMutation({
    mutationFn: () =>
      salvarOrigem({
        data: {
          id: editing?.id,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cor: cor || null,
          ativo,
          ordem: Number(ordem) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "Origem atualizada." : "Origem criada.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setNome("");
          setDescricao("");
          setCor("#3b82f6");
          setAtivo(true);
          setOrdem("0");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar origem" : "Nova origem"}</DialogTitle>
          <DialogDescription>
            Estas origens aparecem nos formulários e nos relatórios de captação.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim()) return toast.error("Informe o nome.");
            salvar.mutate();
          }}
        >
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={60} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-14 p-1 h-9"
                />
                <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="#3b82f6" />
              </div>
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={ativo} onCheckedChange={setAtivo} id="ativo" />
            <Label htmlFor="ativo">Ativo</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={salvar.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

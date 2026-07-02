import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  atualizarMotivo,
  criarMotivo,
  excluirMotivo,
  listarMotivos,
} from "@/lib/api/lead-reasons.functions";

export const Route = createFileRoute("/_authenticated/admin/motivos")({
  component: AdminMotivos,
});

type Kind = "discard" | "lost";

function AdminMotivos() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <AdminPageHeader
        eyebrow="Cadastros"
        title="Motivos de CRM"
        description={<>Configure os motivos de <strong>Descarte</strong> (lead desqualificado) e de <strong>Perda</strong> (negócio perdido após proposta).</>}
      />

      <Tabs defaultValue="discard" className="w-full">
        <TabsList>
          <TabsTrigger value="discard">Motivos de Descarte</TabsTrigger>
          <TabsTrigger value="lost">Motivos de Perda</TabsTrigger>
        </TabsList>
        <TabsContent value="discard" className="pt-4">
          <ReasonList kind="discard" />
        </TabsContent>
        <TabsContent value="lost" className="pt-4">
          <ReasonList kind="lost" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Reason = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  padrao: boolean;
};

function ReasonList({ kind }: { kind: Kind }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["motivos", kind],
    queryFn: () => listarMotivos({ data: { kind } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => excluirMotivo({ data: { kind, id } }),
    onSuccess: () => {
      toast.success("Motivo excluído.");
      qc.invalidateQueries({ queryKey: ["motivos", kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (r: Reason) => atualizarMotivo({ data: { kind, id: r.id, ativo: !r.ativo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["motivos", kind] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ReasonDialog kind={kind} trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo motivo</Button>} />
      </div>

      <div className="rounded-lg border border-foreground/10 divide-y divide-foreground/10">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Carregando…</div>}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Nenhum motivo cadastrado.</div>
        )}
        {(data ?? []).map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{r.nome}</span>
                {r.padrao && (
                  <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                    padrão
                  </span>
                )}
              </div>
              {r.descricao && <p className="text-xs text-muted-foreground truncate">{r.descricao}</p>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={r.ativo} onCheckedChange={() => toggle.mutate(r)} />
                <span className="text-xs text-muted-foreground w-12">
                  {r.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <ReasonDialog
                kind={kind}
                existing={r}
                trigger={
                  <Button size="icon" variant="ghost">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir “{r.nome}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Leads que já utilizam este motivo mantêm o registro histórico.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(r.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReasonDialog({
  kind,
  trigger,
  existing,
}: {
  kind: Kind;
  trigger: React.ReactNode;
  existing?: Reason;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(existing?.nome ?? "");
  const [descricao, setDescricao] = useState(existing?.descricao ?? "");
  const [ordem, setOrdem] = useState<number>(existing?.ordem ?? 100);
  const [ativo, setAtivo] = useState<boolean>(existing?.ativo ?? true);

  const save = useMutation({
    mutationFn: () =>
      existing
        ? atualizarMotivo({ data: { kind, id: existing.id, nome, descricao, ordem, ativo } })
        : criarMotivo({ data: { kind, nome, descricao, ordem, ativo } }),
    onSuccess: () => {
      toast.success("Motivo salvo.");
      qc.invalidateQueries({ queryKey: ["motivos", kind] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !existing) {
          setNome("");
          setDescricao("");
          setOrdem(100);
          setAtivo(true);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Editar motivo" : "Novo motivo"}</DialogTitle>
          <DialogDescription>
            {kind === "discard"
              ? "Motivo pelo qual o lead foi desqualificado antes da proposta."
              : "Motivo pelo qual o negócio foi perdido após a apresentação da proposta."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim()) return toast.error("Informe o nome.");
            save.mutate();
          }}
        >
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao ?? ""}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              maxLength={400}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <span className="text-sm">{ativo ? "Ativo" : "Inativo"}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarCampanhas,
  salvarCampanha,
  excluirCampanha,
} from "@/lib/api/campaigns.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/campanhas/")({
  component: CampanhasList,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado.</div>,
});

const TIPO_LABEL: Record<string, string> = {
  banner_top: "Banner (topo)",
  banner_bottom: "Banner (rodapé)",
  popup_center: "Popup",
  modal: "Modal",
  floating: "Flutuante",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/15 text-green-800",
  paused: "bg-amber-500/15 text-amber-800",
  archived: "bg-slate-500/15 text-slate-700",
};

function CampanhasList() {
  const listFn = useServerFn(listarCampanhas);
  const salvarFn = useServerFn(salvarCampanha);
  const excluirFn = useServerFn(excluirCampanha);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({ queryKey: ["campanhas"], queryFn: () => listFn() });

  const createMut = useMutation({
    mutationFn: () =>
      salvarFn({
        data: {
          nome: "Nova campanha",
          tipo: "banner_top",
          status: "draft",
          prioridade: 0,
          conteudo: { titulo: "", mensagem: "", dismissible: true, cor_fundo: "#0b3a3a", cor_texto: "#ffffff" },
          segmentacao: { rotas_incluir: [], rotas_excluir: [], dispositivo: "all" },
          frequencia: { max_por_sessao: 1, cooldown_horas: 24 },
        },
      }),
    onSuccess: ({ id }) => navigate({ to: "/admin/campanhas/$id", params: { id } }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => excluirFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Excluída");
      qc.invalidateQueries({ queryKey: ["campanhas"] });
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Banners & Popups</h1>
          <p className="text-sm text-muted-foreground">Campanhas com segmentação por rota e frequência.</p>
        </div>
        <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
          {createMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
          Nova campanha
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Agendamento</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma campanha.</TableCell></TableRow>
              ) : (data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{TIPO_LABEL[c.tipo] ?? c.tipo}</TableCell>
                  <TableCell><Badge className={STATUS_STYLE[c.status]}>{c.status}</Badge></TableCell>
                  <TableCell>{c.prioridade}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.start_at ? new Date(c.start_at).toLocaleDateString("pt-BR") : "—"}
                    {" → "}
                    {c.end_at ? new Date(c.end_at).toLocaleDateString("pt-BR") : "∞"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to="/admin/campanhas/$id" params={{ id: c.id }}>
                      <Button size="sm" variant="ghost"><Pencil className="size-4" /></Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { if (confirm("Excluir esta campanha?")) deleteMut.mutate(c.id); }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

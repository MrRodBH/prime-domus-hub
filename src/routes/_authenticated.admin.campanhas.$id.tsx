import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { obterCampanha, salvarCampanha, metricasCampanha } from "@/lib/api/campaigns.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/campanhas/$id")({
  component: Editor,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado.</div>,
});

type Form = {
  id: string;
  nome: string;
  tipo: "banner_top" | "banner_bottom" | "popup_center" | "modal" | "floating";
  status: "draft" | "active" | "paused" | "archived";
  prioridade: number;
  conteudo: {
    titulo?: string;
    mensagem?: string;
    imagem_url?: string;
    cta_label?: string;
    cta_url?: string;
    cor_fundo?: string;
    cor_texto?: string;
    dismissible?: boolean;
  };
  segmentacao: { rotas_incluir: string[]; rotas_excluir: string[]; dispositivo: "all" | "desktop" | "mobile" };
  frequencia: { max_por_sessao: number; cooldown_horas: number };
  start_at: string | null;
  end_at: string | null;
};

function Editor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const obterFn = useServerFn(obterCampanha);
  const salvarFn = useServerFn(salvarCampanha);
  const metricasFn = useServerFn(metricasCampanha);

  const { data, isLoading } = useQuery({
    queryKey: ["campanha", id],
    queryFn: () => obterFn({ data: { id } }),
  });
  const { data: metricas } = useQuery({
    queryKey: ["campanha-metricas", id],
    queryFn: () => metricasFn({ data: { id } }),
    staleTime: 30_000,
  });

  const [form, setForm] = useState<Form | null>(null);
  useEffect(() => {
    if (data) {
      setForm({
        id: data.id,
        nome: data.nome,
        tipo: data.tipo,
        status: data.status,
        prioridade: data.prioridade ?? 0,
        conteudo: (data.conteudo as Form["conteudo"]) ?? {},
        segmentacao: (data.segmentacao as Form["segmentacao"]) ?? {
          rotas_incluir: [], rotas_excluir: [], dispositivo: "all",
        },
        frequencia: (data.frequencia as Form["frequencia"]) ?? { max_por_sessao: 1, cooldown_horas: 24 },
        start_at: data.start_at,
        end_at: data.end_at,
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (payload: Form) =>
      salvarFn({
        data: {
          id: payload.id,
          nome: payload.nome,
          tipo: payload.tipo,
          status: payload.status,
          prioridade: payload.prioridade,
          conteudo: payload.conteudo,
          segmentacao: payload.segmentacao,
          frequencia: payload.frequencia,
          start_at: payload.start_at,
          end_at: payload.end_at,
        },
      }),
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["campanhas"] });
      qc.invalidateQueries({ queryKey: ["campanha", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  const update = (patch: Partial<Form>) => setForm({ ...form, ...patch });
  const updateConteudo = (patch: Partial<Form["conteudo"]>) => setForm({ ...form, conteudo: { ...form.conteudo, ...patch } });
  const updateSeg = (patch: Partial<Form["segmentacao"]>) => setForm({ ...form, segmentacao: { ...form.segmentacao, ...patch } });
  const updateFreq = (patch: Partial<Form["frequencia"]>) => setForm({ ...form, frequencia: { ...form.frequencia, ...patch } });

  const rotasIncluir = form.segmentacao.rotas_incluir.join("\n");
  const rotasExcluir = form.segmentacao.rotas_excluir.join("\n");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/campanhas"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-semibold">{form.nome || "Campanha"}</h1>
            <p className="text-xs text-muted-foreground">
              Impressões: {metricas?.impression ?? 0} · Cliques: {metricas?.click ?? 0} · Fechamentos: {metricas?.dismiss ?? 0}
            </p>
          </div>
        </div>
        <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="segmentacao">Segmentação</TabsTrigger>
          <TabsTrigger value="agendamento">Agendamento & Frequência</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados gerais</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Nome (interno)</Label>
                <Input value={form.nome} onChange={(e) => update({ nome: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => update({ tipo: v as Form["tipo"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner_top">Banner (topo)</SelectItem>
                    <SelectItem value="banner_bottom">Banner (rodapé)</SelectItem>
                    <SelectItem value="popup_center">Popup (centro)</SelectItem>
                    <SelectItem value="modal">Modal</SelectItem>
                    <SelectItem value="floating">Flutuante (canto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => update({ status: v as Form["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade (maior = exibe primeiro)</Label>
                <Input type="number" value={form.prioridade} onChange={(e) => update({ prioridade: Number(e.target.value) || 0 })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conteudo">
          <Card>
            <CardHeader><CardTitle className="text-base">Conteúdo</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Título</Label>
                <Input value={form.conteudo.titulo ?? ""} onChange={(e) => updateConteudo({ titulo: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Mensagem</Label>
                <Textarea rows={3} value={form.conteudo.mensagem ?? ""} onChange={(e) => updateConteudo({ mensagem: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Imagem (popup/modal)</Label>
                <MediaPicker
                  value={form.conteudo.imagem_url ?? null}
                  onChange={(v) => updateConteudo({ imagem_url: v?.url })}
                />
              </div>
              <div>
                <Label>Botão — texto</Label>
                <Input value={form.conteudo.cta_label ?? ""} onChange={(e) => updateConteudo({ cta_label: e.target.value })} />
              </div>
              <div>
                <Label>Botão — URL</Label>
                <Input value={form.conteudo.cta_url ?? ""} onChange={(e) => updateConteudo({ cta_url: e.target.value })} />
              </div>
              <div>
                <Label>Cor de fundo</Label>
                <Input type="color" value={form.conteudo.cor_fundo ?? "#0b3a3a"} onChange={(e) => updateConteudo({ cor_fundo: e.target.value })} />
              </div>
              <div>
                <Label>Cor do texto</Label>
                <Input type="color" value={form.conteudo.cor_texto ?? "#ffffff"} onChange={(e) => updateConteudo({ cor_texto: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Switch checked={form.conteudo.dismissible !== false} onCheckedChange={(v) => updateConteudo({ dismissible: v })} />
                <Label>Permitir fechar (X)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segmentacao">
          <Card>
            <CardHeader><CardTitle className="text-base">Segmentação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dispositivo</Label>
                <Select value={form.segmentacao.dispositivo} onValueChange={(v) => updateSeg({ dispositivo: v as "all" | "desktop" | "mobile" })}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="desktop">Somente desktop</SelectItem>
                    <SelectItem value="mobile">Somente mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rotas incluídas (uma por linha; vazio = todas)</Label>
                <Textarea
                  rows={4}
                  placeholder="Ex.:&#10;/&#10;/imoveis&#10;/lancamentos/*"
                  value={rotasIncluir}
                  onChange={(e) => updateSeg({ rotas_incluir: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                />
                <p className="text-xs text-muted-foreground mt-1">Suporta prefixo com <code>/*</code> (ex: <code>/imovel/*</code>) e <code>*</code> para todas.</p>
              </div>
              <div>
                <Label>Rotas excluídas</Label>
                <Textarea
                  rows={3}
                  placeholder="/admin/*"
                  value={rotasExcluir}
                  onChange={(e) => updateSeg({ rotas_excluir: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendamento">
          <Card>
            <CardHeader><CardTitle className="text-base">Agendamento & Frequência</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={form.start_at ? form.start_at.slice(0, 16) : ""}
                  onChange={(e) => update({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={form.end_at ? form.end_at.slice(0, 16) : ""}
                  onChange={(e) => update({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
              <div>
                <Label>Máximo por sessão (0 = ilimitado)</Label>
                <Input type="number" min={0} value={form.frequencia.max_por_sessao}
                  onChange={(e) => updateFreq({ max_por_sessao: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Cooldown (horas)</Label>
                <Input type="number" min={0} value={form.frequencia.cooldown_horas}
                  onChange={(e) => updateFreq({ cooldown_horas: Number(e.target.value) || 0 })} />
              </div>
              <p className="md:col-span-2 text-xs text-muted-foreground">
                Após atingir o máximo, a campanha só reaparece depois do cooldown. Fechar no X oculta pelo tempo da sessão.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
          {saveMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
          Salvar
        </Button>
      </div>
      <div className="text-xs text-muted-foreground text-right">
        <button className="underline" onClick={() => navigate({ to: "/admin/campanhas" })}>Voltar para a lista</button>
      </div>
    </div>
  );
}

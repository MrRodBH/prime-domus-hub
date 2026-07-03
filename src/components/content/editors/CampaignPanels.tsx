// CampaignPanels — Segmentação e Métricas (Bloco 3.1).
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { metricasCampanha } from "@/lib/api/campaigns.functions";
import { useContentSession } from "../session";

type Seg = { rotas_incluir: string[]; rotas_excluir: string[]; dispositivo: "all" | "desktop" | "mobile" };
type Freq = { max_por_sessao: number; cooldown_horas: number };

export function CampaignSegmentacaoPanel() {
  const s = useContentSession();
  const d = s.draft.data as { segmentacao?: Seg; frequencia?: Freq; start_at?: string | null; end_at?: string | null };
  const seg = d.segmentacao ?? { rotas_incluir: [], rotas_excluir: [], dispositivo: "all" as const };
  const freq = d.frequencia ?? { max_por_sessao: 1, cooldown_horas: 24 };

  const patchSeg = (p: Partial<Seg>) => s.updateData({ segmentacao: { ...seg, ...p } });
  const patchFreq = (p: Partial<Freq>) => s.updateData({ frequencia: { ...freq, ...p } });

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Label>Rotas para incluir (uma por linha)</Label>
        <Textarea rows={3} value={seg.rotas_incluir.join("\n")} onChange={(e) => patchSeg({ rotas_incluir: e.target.value.split("\n").filter(Boolean) })} placeholder="/&#10;/imoveis" />
      </div>
      <div>
        <Label>Rotas para excluir (uma por linha)</Label>
        <Textarea rows={3} value={seg.rotas_excluir.join("\n")} onChange={(e) => patchSeg({ rotas_excluir: e.target.value.split("\n").filter(Boolean) })} />
      </div>
      <div>
        <Label>Dispositivo</Label>
        <Select value={seg.dispositivo} onValueChange={(v) => patchSeg({ dispositivo: v as Seg["dispositivo"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="desktop">Somente desktop</SelectItem>
            <SelectItem value="mobile">Somente mobile</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Máx. por sessão</Label><Input type="number" value={freq.max_por_sessao} onChange={(e) => patchFreq({ max_por_sessao: Number(e.target.value) })} /></div>
        <div><Label>Cooldown (horas)</Label><Input type="number" value={freq.cooldown_horas} onChange={(e) => patchFreq({ cooldown_horas: Number(e.target.value) })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Início</Label><Input type="datetime-local" value={d.start_at ?? ""} onChange={(e) => s.updateData({ start_at: e.target.value || null })} /></div>
        <div><Label>Fim</Label><Input type="datetime-local" value={d.end_at ?? ""} onChange={(e) => s.updateData({ end_at: e.target.value || null })} /></div>
      </div>
    </div>
  );
}

export function CampaignMetricasPanel() {
  const s = useContentSession();
  const fn = useServerFn(metricasCampanha);
  const { data } = useQuery({
    queryKey: ["campanha-metricas", s.entityId],
    queryFn: () => fn({ data: { id: s.entityId! } }),
    enabled: !!s.entityId,
  });
  const totals = data ?? { impression: 0, click: 0, dismiss: 0 };
  return (
    <div className="grid grid-cols-3 gap-3 max-w-2xl">
      <MetricCard label="Impressões" value={totals.impression} />
      <MetricCard label="Cliques" value={totals.click} />
      <MetricCard label="Dispensadas" value={totals.dismiss} />
    </div>
  );
}
function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-foreground/10 p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

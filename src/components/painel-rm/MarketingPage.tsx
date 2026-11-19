// Tela de Marketing (pixels e tags) no padrão RM Prime, alimentada pelas funções de rastreamento do tenant.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Power } from "lucide-react";
import { toast } from "sonner";

import { PainelLayout } from "@/components/painel-rm/PainelLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  disableTenantTrackingConnector,
  listTenantTrackingConnectors,
  publishTenantTrackingConnector,
} from "@/lib/api/tenant-tracking.functions";

type Provider = "META_PIXEL" | "GOOGLE_ANALYTICS" | "GOOGLE_TAG_MANAGER";
const INFO: Record<Provider, { titulo: string; ajuda: string; exemplo: string; categoria: "MARKETING" | "ANALYTICS" }> = {
  META_PIXEL: { titulo: "Meta Pixel (Facebook/Instagram)", ajuda: "Somente os números do ID do pixel.", exemplo: "985976432441241", categoria: "MARKETING" },
  GOOGLE_TAG_MANAGER: { titulo: "Google Tag Manager", ajuda: "ID do contêiner, começando com GTM-.", exemplo: "GTM-XXXXXXX", categoria: "ANALYTICS" },
  GOOGLE_ANALYTICS: { titulo: "Google Analytics 4", ajuda: "ID de medição, começando com G-.", exemplo: "G-XXXXXXXXXX", categoria: "ANALYTICS" },
};
const ORDEM: Provider[] = ["META_PIXEL", "GOOGLE_TAG_MANAGER", "GOOGLE_ANALYTICS"];

function mensagem(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  if (m.includes("identifier")) return "Código inválido. Confira o formato indicado.";
  if (m.includes("version") || m.includes("conflict")) return "Outra pessoa alterou este item. Atualize a página.";
  return "Não foi possível salvar. Tente novamente.";
}

type Conn = { id: string; providerKey: string; providerIdentifier: string | null; enabled: boolean; rowVersion: number; updatedAt?: string | null };

function CartaoPixel({ conn }: { conn: Conn }) {
  const p = conn.providerKey as Provider;
  const info = INFO[p];
  const qc = useQueryClient();
  const publicar = useServerFn(publishTenantTrackingConnector);
  const desativar = useServerFn(disableTenantTrackingConnector);
  const [valor, setValor] = useState(conn.providerIdentifier ?? "");
  useEffect(() => setValor(conn.providerIdentifier ?? ""), [conn.providerIdentifier]);
  const atualizar = () => qc.invalidateQueries({ queryKey: ["painel", "marketing"] });

  const salvarM = useMutation({
    mutationFn: () => publicar({ data: { connectorId: conn.id, expectedRowVersion: conn.rowVersion, config: { providerKey: p, providerIdentifier: valor.trim(), schemaVersion: 1, enabled: true, consentCategory: info.categoria } } }),
    onSuccess: () => { toast.success("Salvo e ativo no site."); void atualizar(); },
    onError: (e) => toast.error(mensagem(e)),
  });
  const desativarM = useMutation({
    mutationFn: () => desativar({ data: { connectorId: conn.id, expectedRowVersion: conn.rowVersion } }),
    onSuccess: () => { toast.success("Desativado."); void atualizar(); },
    onError: (e) => toast.error(mensagem(e)),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{info.titulo}</CardTitle>
          <CardDescription>{info.ajuda}</CardDescription>
        </div>
        {conn.enabled ? <Badge className="bg-primary text-primary-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`px-${p}`}>Código</Label>
          <Input id={`px-${p}`} value={valor} placeholder={info.exemplo} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => salvarM.mutate()} disabled={!valor.trim() || salvarM.isPending}>
            {salvarM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar e ativar
          </Button>
          {conn.enabled && (
            <Button variant="outline" onClick={() => desativarM.mutate()} disabled={desativarM.isPending}>
              <Power className="mr-2 h-4 w-4" />Desativar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketingPage() {
  const listar = useServerFn(listTenantTrackingConnectors);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["painel", "marketing"], queryFn: () => listar() });
  const conns = ORDEM.map((p) => (data as Conn[]).find((c) => c.providerKey === p)).filter(Boolean) as Conn[];
  return (
    <PainelLayout titulo="Marketing" descricao="Configure os pixels e tags de rastreamento do site. As alterações valem para todas as páginas públicas.">
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="text-sm text-destructive">Não foi possível carregar as configurações de marketing.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {conns.map((c) => <CartaoPixel key={c.id} conn={c} />)}
        </div>
      )}
      <p className="mt-6 text-xs text-muted-foreground">Os pixels só disparam depois que o visitante aceita os cookies de marketing ou análise no site.</p>
    </PainelLayout>
  );
}

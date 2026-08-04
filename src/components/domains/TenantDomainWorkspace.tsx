import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Copy, Globe2, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getTenantDomainState,
  requestDomainOperationRetry,
  requestDomainRemoval,
  requestDomainReplacement,
  requestDomainVerificationCheck,
  requestTenantDomain,
  rotateDomainOwnershipChallenge,
} from "@/lib/api/tenant-domain.functions";
import type {
  DomainActivationStatus,
  DomainExecutionMode,
  DomainHostnameKind,
  TenantDomainRecord,
} from "@/lib/domains/domain-contracts";

type ProofView = {
  recordName: string;
  proofValue: string;
  expiresAt: string;
  challengeVersion: number;
};

type DomainAction =
  | { kind: "verify"; domainId: string }
  | { kind: "retry"; domainId: string }
  | { kind: "remove"; domainId: string }
  | { kind: "rotate"; domainId: string };

const STATUS_LABELS: Record<DomainActivationStatus, string> = {
  draft: "Rascunho",
  pending_ownership_verification: "Aguardando prova de propriedade",
  ownership_verified: "Propriedade verificada",
  pending_dns_configuration: "Aguardando DNS",
  pending_cloudflare_provisioning: "Provisionando Cloudflare",
  pending_ssl: "Aguardando SSL",
  active: "Ativo",
  degraded: "Degradado",
  replacement_pending: "Substituição em preparação",
  removal_pending: "Remoção em andamento",
  failed: "Falhou",
  revoked: "Revogado",
};

function statusVariant(status: DomainActivationStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "failed" || status === "degraded") return "destructive";
  if (status === "revoked" || status === "removal_pending") return "outline";
  return "secondary";
}

export function TenantDomainWorkspace() {
  const queryClient = useQueryClient();
  const [hostname, setHostname] = useState("");
  const [executionMode, setExecutionMode] = useState<DomainExecutionMode>("manual_assisted");
  const [hostnameKind, setHostnameKind] = useState<DomainHostnameKind>("canonical");
  const [replacementHostname, setReplacementHostname] = useState("");
  const [proof, setProof] = useState<ProofView | null>(null);

  const stateQuery = useQuery({
    queryKey: ["tenant-domains"],
    queryFn: () => getTenantDomainState(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tenant-domains"] });

  const createMutation = useMutation({
    mutationFn: () => requestTenantDomain({ data: { hostname, executionMode, hostnameKind } }),
    onSuccess: (result) => {
      setProof(result.challenge);
      setHostname("");
      toast.success("Solicitação de domínio criada. Publique o TXT exibido abaixo.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const replacementMutation = useMutation({
    mutationFn: (incumbentDomainId: string) => requestDomainReplacement({
      data: { hostname: replacementHostname, executionMode, incumbentDomainId },
    }),
    onSuccess: (result) => {
      setProof(result.challenge);
      setReplacementHostname("");
      toast.success("Candidato de substituição criado. O domínio atual permanece autoritativo.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: DomainAction) => {
      if (action.kind === "verify") return requestDomainVerificationCheck({ data: { domainId: action.domainId } });
      if (action.kind === "retry") return requestDomainOperationRetry({ data: { domainId: action.domainId } });
      if (action.kind === "remove") return requestDomainRemoval({ data: { domainId: action.domainId } });
      return rotateDomainOwnershipChallenge({ data: { domainId: action.domainId } });
    },
    onSuccess: (result, action) => {
      if (action.kind === "rotate" && "challenge" in result) setProof(result.challenge);
      toast.success(action.kind === "remove" ? "Autoridade pública encerrada; cleanup enfileirado." : "Operação enfileirada com autoridade do servidor.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const domains = stateQuery.data?.domains ?? [];
  const activeCanonical = useMemo(
    () => domains.find((domain) => domain.status === "active" && domain.enabled && domain.hostnameKind === "canonical") ?? null,
    [domains],
  );
  const busy = createMutation.isPending || replacementMutation.isPending || actionMutation.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="DCA-01"
        title="Domínios personalizados"
        description="Lifecycle server-authoritative. Solicitações do operador nunca afirmam propriedade, DNS, Cloudflare, SSL ou ativação."
        actions={<Button variant="outline" onClick={() => void stateQuery.refetch()} disabled={stateQuery.isFetching}><RefreshCw className="mr-2 size-4" />Atualizar</Button>}
      />

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <div className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" /><p>Os modos <strong>manual_assisted</strong> e <strong>api_automated</strong> são explícitos. Falha da API não muda o modo silenciosamente.</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div><h2 className="font-semibold">Solicitar domínio</h2><p className="text-sm text-muted-foreground">Informe somente hostname, sem URL, porta ou path.</p></div>
          <div className="space-y-2"><Label htmlFor="domain-hostname">Hostname</Label><Input id="domain-hostname" value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="www.suaimobiliaria.com.br" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Modo</Label><Select value={executionMode} onValueChange={(value: DomainExecutionMode) => setExecutionMode(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual_assisted">manual_assisted</SelectItem><SelectItem value="api_automated">api_automated</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Binding</Label><Select value={hostnameKind} onValueChange={(value: DomainHostnameKind) => setHostnameKind(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="canonical">canonical</SelectItem><SelectItem value="alias">alias</SelectItem></SelectContent></Select></div>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={busy || hostname.trim().length < 3}><Globe2 className="mr-2 size-4" />Criar solicitação</Button>
        </Card>

        <Card className="space-y-4 p-6">
          <div><h2 className="font-semibold">Substituir canonical ativo</h2><p className="text-sm text-muted-foreground">O incumbent permanece ativo até o swap atômico do candidato plenamente verificado.</p></div>
          {activeCanonical ? <><div className="rounded-md bg-muted p-3 text-sm"><span className="text-muted-foreground">Incumbent:</span> <span className="font-mono">{activeCanonical.normalizedHostname}</span></div><div className="space-y-2"><Label htmlFor="replacement-hostname">Novo hostname</Label><Input id="replacement-hostname" value={replacementHostname} onChange={(event) => setReplacementHostname(event.target.value)} placeholder="novo.suaimobiliaria.com.br" /></div><Button variant="secondary" onClick={() => replacementMutation.mutate(activeCanonical.id)} disabled={busy || replacementHostname.trim().length < 3}><RotateCcw className="mr-2 size-4" />Preparar substituição</Button></> : <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">Nenhum canonical ativo disponível para substituição.</p>}
        </Card>
      </div>

      {proof ? <Card className="space-y-3 border-primary/30 p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Prova TXT — exibida uma única vez</h2><p className="text-sm text-muted-foreground">Versão {proof.challengeVersion}; expira em {new Date(proof.expiresAt).toLocaleString("pt-BR")}.</p></div><ShieldCheck className="size-5 text-primary" /></div><ProofRow label="Nome" value={proof.recordName} /><ProofRow label="Valor" value={proof.proofValue} /></Card> : null}

      {stateQuery.isPending ? <Card className="p-10 text-center text-sm text-muted-foreground">Carregando autoridade de domínios…</Card> : stateQuery.isError ? <Card className="border-destructive/40 p-6 text-sm text-destructive">{stateQuery.error.message}</Card> : (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Bindings e gerações</h2><span className="text-sm text-muted-foreground">{domains.length} registro(s)</span></div>
          {domains.length === 0 ? <Card className="p-10 text-center text-sm text-muted-foreground">Nenhum domínio solicitado.</Card> : domains.map((domain) => <DomainCard key={domain.id} domain={domain} challenge={stateQuery.data?.challenges[domain.id] ?? null} busy={busy} onAction={(action) => actionMutation.mutate(action)} />)}
        </div>
      )}
    </div>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-2 sm:grid-cols-[90px_1fr_auto] sm:items-center"><span className="text-sm text-muted-foreground">{label}</span><code className="overflow-x-auto rounded bg-muted px-3 py-2 text-xs">{value}</code><Button size="icon" variant="outline" aria-label={`Copiar ${label}`} onClick={() => { void navigator.clipboard.writeText(value); toast.success(`${label} copiado.`); }}><Copy className="size-4" /></Button></div>;
}

function DomainCard({ domain, challenge, busy, onAction }: {
  domain: TenantDomainRecord;
  challenge: { recordName: string; status: string; expiresAt: string; challengeVersion: number } | null;
  busy: boolean;
  onAction: (action: DomainAction) => void;
}) {
  const canVerify = domain.status === "pending_ownership_verification";
  const canRetry = !["draft", "replacement_pending", "revoked", "removal_pending"].includes(domain.status);
  const canRemove = !["revoked", "removal_pending"].includes(domain.status);
  return <Card className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="break-all font-mono font-medium">{domain.normalizedHostname}</span><Badge variant={statusVariant(domain.status)}>{STATUS_LABELS[domain.status]}</Badge><Badge variant="outline">{domain.hostnameKind}</Badge><Badge variant="outline">gen {domain.generation}</Badge></div><div className="grid gap-x-8 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2"><span>Modo: <strong>{domain.executionMode}</strong></span><span>Lock version: {domain.lockVersion}</span><span>Registrável: {domain.registrableDomain}</span><span>Autoridade pública: {domain.status === "active" && domain.enabled ? "sim" : "não"}</span>{domain.failureCode ? <span className="text-destructive">Falha: {domain.failureCode}</span> : null}{challenge ? <span>Challenge v{challenge.challengeVersion}: {challenge.status}</span> : null}</div></div><div className="flex shrink-0 flex-wrap gap-2">{canVerify ? <><Button size="sm" variant="outline" disabled={busy} onClick={() => onAction({ kind: "verify", domainId: domain.id })}>Verificar DNS</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => onAction({ kind: "rotate", domainId: domain.id })}>Rotacionar TXT</Button></> : null}{canRetry ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction({ kind: "retry", domainId: domain.id })}><RefreshCw className="mr-1 size-3" />Retry</Button> : null}{canRemove ? <Button size="sm" variant="destructive" disabled={busy} onClick={() => onAction({ kind: "remove", domainId: domain.id })}><Trash2 className="mr-1 size-3" />Remover</Button> : null}</div></div></Card>;
}
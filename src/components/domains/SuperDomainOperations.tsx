import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Cloud, Plus, RefreshCw, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDomainPlatformDiagnostics,
  getProviderAccountHealth,
  listDomainOperationFailuresForSuper,
  prepareAuthoritativeDomainCutover,
  registerCloudflareProviderAccount,
  rotateProviderCredentialReference,
  setProviderAccountAvailability,
} from "@/lib/api/super-domain.functions";

type GlobalAction =
  | { kind: "register"; accountIdentifier: string; credentialReference: string; zones: Record<string, string> }
  | { kind: "availability"; providerAccountId: string; enabled: boolean }
  | { kind: "rotate"; providerAccountId: string; credentialReference: string }
  | { kind: "preflight" };

const PROPAGATING = ["pending_ownership_verification", "ownership_verified", "pending_dns_configuration", "pending_cloudflare_provisioning", "replacement_pending"];
const FAILED = ["failed", "degraded", "revoked"];

const OPERATION_LABEL: Record<string, string> = {
  issue_ownership_challenge: "Gerar verificação de propriedade",
  observe_ownership_dns: "Conferir verificação no DNS",
  prepare_dns_configuration: "Preparar configuração DNS",
  observe_required_dns: "Conferir apontamento DNS",
  provision_provider_binding: "Conectar domínio na Cloudflare",
  observe_ssl_lifecycle: "Emitir certificado de segurança",
  activate_domain_generation: "Ativar domínio",
  reconcile_domain: "Revisar domínio",
  replace_domain: "Trocar domínio",
  remove_domain: "Remover domínio",
  cleanup_domain: "Limpeza",
  activate_authoritative_domain_resolution: "Ativar resolução de domínios",
};

function friendlyError(code: string | null | undefined) {
  const c = (code ?? "").toLowerCase();
  if (!c) return "Falha sem detalhe informado";
  if (c.includes("dns")) return "Apontamento DNS não encontrado";
  if (c.includes("ssl") || c.includes("cert")) return "Certificado de segurança não emitido";
  if (c.includes("auth") || c.includes("credential") || c.includes("token")) return "Credencial da Cloudflare recusada";
  if (c.includes("timeout") || c.includes("network")) return "Cloudflare não respondeu a tempo";
  if (c.includes("conflict") || c.includes("exists")) return "Domínio já usado em outro lugar";
  return "Falha na conexão com a Cloudflare";
}

export function SuperDomainOperations() {
  const queryClient = useQueryClient();
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [credentialReference, setCredentialReference] = useState("env:CLOUDFLARE_API_TOKEN");
  const [zones, setZones] = useState<{ domain: string; zoneId: string }[]>([{ domain: "", zoneId: "" }]);
  const [rotationReferences, setRotationReferences] = useState<Record<string, string>>({});
  const [preflightResult, setPreflightResult] = useState<Record<string, unknown> | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const diagnosticsQuery = useQuery({ queryKey: ["domain-platform-diagnostics"], queryFn: () => getDomainPlatformDiagnostics() });
  const providersQuery = useQuery({ queryKey: ["domain-provider-health"], queryFn: () => getProviderAccountHealth() });
  const failuresQuery = useQuery({ queryKey: ["domain-operation-failures"], queryFn: () => listDomainOperationFailuresForSuper({ data: { limit: 100 } }) });

  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["domain-platform-diagnostics"] }),
    queryClient.invalidateQueries({ queryKey: ["domain-provider-health"] }),
    queryClient.invalidateQueries({ queryKey: ["domain-operation-failures"] }),
  ]);

  const mutation = useMutation({
    mutationFn: async (action: GlobalAction) => {
      if (action.kind === "register") return registerCloudflareProviderAccount({ data: action });
      if (action.kind === "availability") return setProviderAccountAvailability({ data: action });
      if (action.kind === "rotate") return rotateProviderCredentialReference({ data: action });
      return prepareAuthoritativeDomainCutover();
    },
    onSuccess: (result, action) => {
      if (action.kind === "preflight") setPreflightResult(result as unknown as Record<string, unknown>);
      toast.success(action.kind === "preflight" ? "Verificação concluída. Nada foi alterado." : "Alteração salva.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const register = () => {
    const normalized: Record<string, string> = {};
    for (const row of zones) {
      if (!row.domain.trim() && !row.zoneId.trim()) continue;
      if (!row.domain.trim() || !row.zoneId.trim()) { toast.error("Preencha domínio e Zone ID em cada linha."); return; }
      normalized[row.domain.trim().toLowerCase()] = row.zoneId.trim();
    }
    if (!Object.keys(normalized).length) { toast.error("Informe ao menos um domínio."); return; }
    mutation.mutate({ kind: "register", accountIdentifier, credentialReference, zones: normalized });
  };

  const refreshAll = () => { void diagnosticsQuery.refetch(); void providersQuery.refetch(); void failuresQuery.refetch(); };
  const counts = diagnosticsQuery.data?.countsByStatus ?? {};
  const sum = (keys: string[]) => keys.reduce((total, key) => total + ((counts as Record<string, number>)[key] ?? 0), 0);
  const providers = providersQuery.data ?? [];
  const failures = failuresQuery.data ?? [];
  const busy = diagnosticsQuery.isFetching || providersQuery.isFetching || failuresQuery.isFetching;
  const pendingJobs = (diagnosticsQuery.data?.dueJobs ?? 0) + (diagnosticsQuery.data?.staleLeases ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Serviços da plataforma"
        title="Infraestrutura e conectividade de domínios"
        description="Acompanhe os sites das empresas no ar, os domínios em configuração e o que precisa de atenção."
        actions={<Button variant="outline" onClick={refreshAll} disabled={busy}><RefreshCw className={`mr-2 size-4 ${busy ? "animate-spin" : ""}`} />Atualizar</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Health label="Domínios ativos" value={sum(["active"])} tone="ok" icon={<CheckCircle2 className="size-5" />} hint="Sites no ar com segurança" />
        <Health label="Em propagação" value={sum(PROPAGATING)} tone="info" icon={<Clock className="size-5" />} hint="Aguardando DNS ou Cloudflare" />
        <Health label="Aguardando SSL" value={sum(["pending_ssl"])} tone="warn" icon={<ShieldCheck className="size-5" />} hint="Certificado em emissão" />
        <Health label="Com falha" value={sum(FAILED)} tone="bad" icon={<XCircle className="size-5" />} hint="Precisa de revisão" />
      </div>

      {pendingJobs > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>{pendingJobs} tarefa(s) de domínio estão atrasadas na fila. O processador automático tenta novamente a cada minuto.</p>
        </div>
      )}

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Conta Cloudflare</h2><p className="text-sm text-muted-foreground">Conta usada para colocar os domínios das empresas no ar.</p></div>
          <Button size="sm" variant="outline" onClick={() => setShowRegister(v => !v)}><Plus className="mr-2 size-4" />Conectar conta</Button>
        </div>
        {providersQuery.isPending ? <p className="text-sm text-muted-foreground">Carregando…</p> : providers.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma conta conectada.</p> : (
          <div className="space-y-3">{providers.map((provider) => (
            <div key={provider.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Cloud className="size-5 text-primary" />
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">Cloudflare</span>
                    <Badge variant={provider.enabled ? "default" : "outline"}>{provider.enabled ? "Ligada" : "Desligada"}</Badge>
                    <Badge variant="secondary">{provider.healthStatus === "healthy" ? "Saudável" : provider.healthStatus}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Conta ••••{provider.accountIdentifier.slice(-4)}</p>
                </div>
              </div>
              <Button size="sm" variant={provider.enabled ? "outline" : "secondary"} disabled={mutation.isPending} onClick={() => mutation.mutate({ kind: "availability", providerAccountId: provider.id, enabled: !provider.enabled })}>{provider.enabled ? "Desligar" : "Ligar"}</Button>
            </div>
          ))}</div>
        )}

        {showRegister && (
          <div className="mt-6 space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="cf-account">ID da conta Cloudflare</Label><Input id="cf-account" value={accountIdentifier} onChange={(e) => setAccountIdentifier(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="cf-reference">Nome do segredo do token</Label><Input id="cf-reference" value={credentialReference} onChange={(e) => setCredentialReference(e.target.value)} /><p className="text-xs text-muted-foreground">Somente o nome (ex.: env:CLOUDFLARE_API_TOKEN). O token nunca é digitado aqui.</p></div>
            </div>
            <div className="space-y-2">
              <Label>Domínios principais</Label>
              {zones.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <Input placeholder="exemplo.com.br" value={row.domain} onChange={(e) => setZones(z => z.map((r, i) => i === index ? { ...r, domain: e.target.value } : r))} />
                  <Input placeholder="Zone ID" value={row.zoneId} onChange={(e) => setZones(z => z.map((r, i) => i === index ? { ...r, zoneId: e.target.value } : r))} />
                  <Button size="icon" variant="ghost" aria-label="Remover linha" onClick={() => setZones(z => z.length > 1 ? z.filter((_, i) => i !== index) : [{ domain: "", zoneId: "" }])}><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setZones(z => [...z, { domain: "", zoneId: "" }])}><Plus className="mr-1 size-4" />Adicionar domínio</Button>
            </div>
            <Button onClick={register} disabled={mutation.isPending || accountIdentifier.length < 8 || credentialReference.length < 7}>Salvar conta</Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-4"><h2 className="font-semibold">O que precisa de atenção</h2><p className="text-sm text-muted-foreground">Tentativas de configuração que não deram certo.</p></div>
        {failuresQuery.isPending ? <p className="text-sm text-muted-foreground">Carregando…</p> : failures.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" />Tudo certo. Nenhuma falha registrada.</div>
        ) : (
          <div className="divide-y rounded-lg border">{failures.slice(0, 20).map((job) => (
            <div key={job.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="size-2.5 rounded-full bg-destructive" />
                  <div>
                    <p className="font-medium">{OPERATION_LABEL[job.operationType] ?? "Configuração de domínio"}</p>
                    <p className="text-sm text-muted-foreground">{friendlyError(job.terminalErrorCode)} · {job.attemptCount} tentativa(s) · {new Date(job.updatedAt).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === job.id ? null : job.id)}>Detalhes<ChevronDown className="ml-1 size-4" /></Button>
              </div>
              {expanded === job.id && <p className="mt-2 break-all rounded bg-muted p-2 font-mono text-xs text-muted-foreground">Código: {job.terminalErrorCode ?? "—"} · Empresa {job.tenantId.slice(0, 8)} · Domínio {job.domainId.slice(0, 8)}</p>}
            </div>
          ))}
          {failures.length > 20 && <p className="p-3 text-center text-xs text-muted-foreground">Mostrando as 20 mais recentes de {failures.length}.</p>}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <button className="flex w-full items-center justify-between text-left" onClick={() => setShowAdvanced(v => !v)}>
          <div><h2 className="font-semibold">Ferramentas avançadas</h2><p className="text-sm text-muted-foreground">Uso técnico: troca do segredo e verificação de prontidão.</p></div>
          <ChevronDown className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {providers.map((provider) => {
              const draft = rotationReferences[provider.id] ?? "";
              return <div key={provider.id} className="flex flex-wrap items-center gap-2"><Input className="w-64" placeholder="env:NOVO_SEGREDO" value={draft} onChange={(e) => setRotationReferences(c => ({ ...c, [provider.id]: e.target.value }))} /><Button size="sm" variant="outline" disabled={mutation.isPending || draft.length < 7} onClick={() => mutation.mutate({ kind: "rotate", providerAccountId: provider.id, credentialReference: draft })}>Trocar segredo da conta ••••{provider.accountIdentifier.slice(-4)}</Button></div>;
            })}
            <Button variant="secondary" onClick={() => mutation.mutate({ kind: "preflight" })} disabled={mutation.isPending}><ShieldCheck className="mr-2 size-4" />Verificar prontidão (não altera nada)</Button>
            {preflightResult ? <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(preflightResult, null, 2)}</pre> : null}
          </div>
        )}
      </Card>
    </div>
  );
}

function Health({ label, value, icon, hint, tone }: { label: string; value: number; icon: React.ReactNode; hint: string; tone: "ok" | "info" | "warn" | "bad" }) {
  const toneClass = { ok: "text-success bg-success/10", info: "text-primary bg-primary/10", warn: "text-warning bg-warning/10", bad: "text-destructive bg-destructive/10" }[tone];
  return <Card className="p-5"><div className="flex items-center gap-3"><div className={`rounded-lg p-2 ${toneClass}`}>{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-semibold">{value}</p></div></div><p className="mt-2 text-xs text-muted-foreground">{hint}</p></Card>;
}

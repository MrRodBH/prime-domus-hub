import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, AlertTriangle, Cloud, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
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

export function SuperDomainOperations() {
  const queryClient = useQueryClient();
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [credentialReference, setCredentialReference] = useState("env:CLOUDFLARE_API_TOKEN");
  const [zonesJson, setZonesJson] = useState("{\n  \"example.com.br\": \"zone_id_here\"\n}");
  const [rotationReferences, setRotationReferences] = useState<Record<string, string>>({});
  const [preflightResult, setPreflightResult] = useState<Record<string, unknown> | null>(null);

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
      toast.success(action.kind === "preflight" ? "Preflight concluído sem executar cutover." : "Operação global auditada concluída.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const register = () => {
    let zones: unknown;
    try { zones = JSON.parse(zonesJson); } catch { toast.error("O mapa de zones deve ser JSON válido."); return; }
    if (!zones || typeof zones !== "object" || Array.isArray(zones)) { toast.error("O mapa de zones deve ser um objeto JSON."); return; }
    const normalized: Record<string, string> = {};
    for (const [hostname, zoneId] of Object.entries(zones)) {
      if (typeof zoneId !== "string") { toast.error(`Zone ID inválido para ${hostname}.`); return; }
      normalized[hostname] = zoneId;
    }
    mutation.mutate({ kind: "register", accountIdentifier, credentialReference, zones: normalized });
  };

  const refreshAll = () => { void diagnosticsQuery.refetch(); void providersQuery.refetch(); void failuresQuery.refetch(); };
  const diagnostics = diagnosticsQuery.data;
  const providers = providersQuery.data ?? [];
  const failures = failuresQuery.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="DCA-01 · Global platform operations"
        title="Domínios e Cloudflare"
        description="Operações globais não concedem autoridade tenant-scoped. Retry ou observação de um tenant exige impersonação explícita."
        actions={<Button variant="outline" onClick={refreshAll} disabled={diagnosticsQuery.isFetching || providersQuery.isFetching || failuresQuery.isFetching}><RefreshCw className="mr-2 size-4" />Atualizar</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Domínios" value={Object.values(diagnostics?.countsByStatus ?? {}).reduce((sum, value) => sum + value, 0)} icon={<Cloud className="size-4" />} />
        <Metric label="Jobs" value={Object.values(diagnostics?.jobsByStatus ?? {}).reduce((sum, value) => sum + value, 0)} icon={<Activity className="size-4" />} />
        <Metric label="Jobs vencidos" value={diagnostics?.dueJobs ?? 0} tone={(diagnostics?.dueJobs ?? 0) > 0 ? "warn" : "ok"} />
        <Metric label="Leases stale" value={diagnostics?.staleLeases ?? 0} tone={(diagnostics?.staleLeases ?? 0) > 0 ? "warn" : "ok"} />
        <Metric label="Ambiguidades" value={diagnostics?.activeCanonicalAmbiguities ?? 0} tone={(diagnostics?.activeCanonicalAmbiguities ?? 0) > 0 ? "warn" : "ok"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div><h2 className="font-semibold">Registrar conta Cloudflare</h2><p className="text-sm text-muted-foreground">A referência é opaca e deve usar <code>env:VARIAVEL</code>. O token real não entra no payload.</p></div>
          <div className="space-y-2"><Label htmlFor="cf-account">Account identifier</Label><Input id="cf-account" value={accountIdentifier} onChange={(event) => setAccountIdentifier(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="cf-reference">Credential reference</Label><Input id="cf-reference" value={credentialReference} onChange={(event) => setCredentialReference(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="cf-zones">Registrable domain → Zone ID</Label><textarea id="cf-zones" className="min-h-36 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs" value={zonesJson} onChange={(event) => setZonesJson(event.target.value)} /></div>
          <Button onClick={register} disabled={mutation.isPending || accountIdentifier.length < 8 || credentialReference.length < 7}><KeyRound className="mr-2 size-4" />Registrar por RPC auditada</Button>
        </Card>

        <Card className="space-y-4 p-6">
          <div><h2 className="font-semibold">Preflight de cutover</h2><p className="text-sm text-muted-foreground">Verifica cardinalidade legada e o predicado composto de todas as gerações ativas. Não executa deploy nem cutover.</p></div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm"><div className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" /><p>Produção permanece não autorizada. O resultado apenas informa prontidão do schema atual.</p></div></div>
          <Button variant="secondary" onClick={() => mutation.mutate({ kind: "preflight" })} disabled={mutation.isPending}><ShieldCheck className="mr-2 size-4" />Executar preflight read-only</Button>
          {preflightResult ? <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(preflightResult, null, 2)}</pre> : null}
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4"><h2 className="font-semibold">Contas de provider</h2><p className="text-sm text-muted-foreground">Credential reference permanece sempre redigida.</p></div>
        {providersQuery.isPending ? <p className="text-sm text-muted-foreground">Carregando…</p> : providers.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma conta registrada.</p> : <div className="space-y-3">{providers.map((provider) => {
          const draft = rotationReferences[provider.id] ?? "";
          return <div key={provider.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm">{provider.accountIdentifier}</span><Badge variant={provider.enabled ? "default" : "outline"}>{provider.enabled ? "enabled" : "disabled"}</Badge><Badge variant="secondary">{provider.healthStatus}</Badge></div><p className="text-xs text-muted-foreground">{provider.providerCode} · {provider.credentialReference}</p></div><div className="flex flex-wrap gap-2"><Input className="w-64" placeholder="env:NOVA_VARIAVEL" value={draft} onChange={(event) => setRotationReferences((current) => ({ ...current, [provider.id]: event.target.value }))} /><Button size="sm" variant="outline" disabled={mutation.isPending || draft.length < 7} onClick={() => mutation.mutate({ kind: "rotate", providerAccountId: provider.id, credentialReference: draft })}>Rotacionar referência</Button><Button size="sm" variant={provider.enabled ? "destructive" : "secondary"} disabled={mutation.isPending} onClick={() => mutation.mutate({ kind: "availability", providerAccountId: provider.id, enabled: !provider.enabled })}>{provider.enabled ? "Desabilitar" : "Habilitar"}</Button></div></div></div>;
        })}</div>}
      </Card>

      <Card className="p-6">
        <div className="mb-4"><h2 className="font-semibold">Falhas terminais de jobs</h2><p className="text-sm text-muted-foreground">Dados sanitizados; nenhuma credencial é exibida.</p></div>
        {failuresQuery.isPending ? <p className="text-sm text-muted-foreground">Carregando…</p> : failures.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma falha terminal registrada.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="pb-3">Tenant / domínio</th><th className="pb-3">Operação</th><th className="pb-3">Tentativas</th><th className="pb-3">Erro</th><th className="pb-3">Atualizado</th></tr></thead><tbody>{failures.map((job) => <tr key={job.id} className="border-t"><td className="py-3 font-mono text-xs">{job.tenantId}<br />{job.domainId}</td><td className="py-3">{job.operationType}</td><td className="py-3">{job.attemptCount}/{job.maxAttempts}</td><td className="py-3 text-destructive">{job.terminalErrorCode ?? "unknown"}</td><td className="py-3 text-xs">{new Date(job.updatedAt).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>}
      </Card>
    </div>
  );
}

function Metric({ label, value, icon, tone = "neutral" }: { label: string; value: number; icon?: React.ReactNode; tone?: "neutral" | "ok" | "warn" }) {
  return <Card className="p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span>{icon}</div><div className={`mt-2 text-2xl font-semibold ${tone === "warn" ? "text-destructive" : tone === "ok" ? "text-emerald-600" : ""}`}>{value}</div></Card>;
}
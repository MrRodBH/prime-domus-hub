import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getImpersonationTenantId } from "@/integrations/supabase/impersonation-state";
import { getSelectedTenantId } from "@/integrations/supabase/tenant-selection-state";
import { resolveTenantTransportHeader } from "@/integrations/supabase/tenant-attacher";
import {
  getTenantBillingHealth,
  getTenantCommercialSummary,
} from "@/lib/api/commercial/commercial.functions";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: TenantBillingPage,
});

async function billingMutation<T>(
  path: "/api/internal/billing-portal" | "/api/internal/billing-reconcile",
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("bcr01_unauthorized");

  const impersonationTenantId = getImpersonationTenantId();
  const selectedTenantId = impersonationTenantId
    ? null
    : getSelectedTenantId();
  const tenantHeaders = resolveTenantTransportHeader({
    impersonationTenantId,
    selectedTenantId,
  });

  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...tenantHeaders,
    },
    body: "{}",
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("bcr01_response_not_json");
  }

  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("ok" in payload) ||
    payload.ok !== true
  ) {
    const code =
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      "code" in payload &&
      typeof payload.code === "string"
        ? payload.code
        : "bcr01_request_failed";
    throw new Error(code);
  }

  return payload as T;
}

function TenantBillingPage() {
  const summary = useQuery({
    queryKey: ["tenant-commercial-summary", "bcr-01"],
    queryFn: () => getTenantCommercialSummary(),
    staleTime: 15_000,
    retry: false,
  });
  const health = useQuery({
    queryKey: ["tenant-billing-health", "bcr-01"],
    queryFn: () => getTenantBillingHealth(),
    staleTime: 15_000,
    retry: false,
  });

  const portal = useMutation({
    mutationFn: () =>
      billingMutation<{ ok: true; redirectUrl: string }>(
        "/api/internal/billing-portal",
      ),
    onSuccess: (data) => window.location.assign(data.redirectUrl),
  });

  const reconcile = useMutation({
    mutationFn: () =>
      billingMutation<{ ok: true; applied: boolean; eventStatus: string }>(
        "/api/internal/billing-reconcile",
      ),
    onSuccess: () => {
      void summary.refetch();
      void health.refetch();
    },
  });

  if (summary.isLoading || health.isLoading) {
    return (
      <StateCard
        icon={<Loader2 className="size-5 animate-spin" />}
        title="Carregando billing"
        description="Resolvendo tenant e estado comercial pelo servidor."
      />
    );
  }

  if (summary.isError || health.isError || !summary.data || !health.data) {
    return (
      <StateCard
        icon={<AlertTriangle className="size-5" />}
        title="Billing indisponível"
        description={safeErrorCode(summary.error ?? health.error)}
        action={
          <Button
            variant="outline"
            onClick={() => {
              void summary.refetch();
              void health.refetch();
            }}
          >
            <RefreshCw className="mr-2 size-4" />
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const commercial = summary.data;
  const billing = health.data;
  const providerConfigured = commercial.billingProvider.configured;
  const providerLinked = commercial.billingProvider.status === "linked";
  const operationError = portal.error ?? reconcile.error;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold">Plano e billing</h1>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Estado comercial sanitizado e operações de billing com autoridade
            exclusivamente server-side.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Stripe · test mode</Badge>
          <Badge variant="outline">Sem cobrança real</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void summary.refetch();
              void health.refetch();
            }}
            disabled={summary.isFetching || health.isFetching}
          >
            <RefreshCw className="mr-2 size-4" />
            Atualizar
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <StatusCard
          label="Assinatura"
          value={commercial.subscription.status ?? "sem assinatura"}
          helper={
            commercial.subscription.currentPeriodEnd
              ? `Período até ${formatDate(commercial.subscription.currentPeriodEnd)}`
              : "Nenhum período comercial ativo."
          }
        />
        <StatusCard
          label="Plano atual"
          value={commercial.plan.name ?? "não definido"}
          helper={commercial.plan.code ?? "Nenhum plano comercial associado."}
        />
        <StatusCard
          label="Provider"
          value={commercial.billingProvider.status ?? "não vinculado"}
          helper={
            providerConfigured
              ? `Provider ${commercial.billingProvider.providerCode ?? "configurado"}.`
              : "Nenhum mapping de provider para este tenant."
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium">Checkout de teste</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O client só pode expressar uma identidade interna de preço. Nesta
                homologação ainda não existe preço comercial ativo no catálogo,
                portanto nenhuma identidade de preço é inventada pela interface.
              </p>
            </div>
            <ShieldCheck className="size-5 text-muted-foreground" />
          </div>
          <Button className="mt-4" disabled>
            Checkout indisponível sem preço ativo
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-medium">Customer Portal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A identidade do customer é resolvida somente pelo mapping persistido
            no servidor; nenhuma referência externa é aceita do client.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => portal.mutate()}
            disabled={!providerConfigured || portal.isPending}
          >
            {portal.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 size-4" />
            )}
            Abrir Customer Portal
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-medium">Lifecycle e health</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KeyValue label="Health" value={billing.status} />
            <KeyValue
              label="Último evento"
              value={billing.lastBillingEventAt ? formatDate(billing.lastBillingEventAt) : "nenhum"}
            />
            <KeyValue
              label="Mapping persistido"
              value={billing.hasProviderMapping ? "sim" : "não"}
            />
            <KeyValue
              label="Plano"
              value={commercial.plan.status ?? "não configurado"}
            />
          </div>
          <div className="mt-4 rounded-md border bg-muted/20 p-3">
            <div className="text-xs font-medium">Diagnóstico sanitizado</div>
            <div className="mt-2 font-mono text-xs text-muted-foreground">
              {billing.reasons.length > 0
                ? billing.reasons.join(" · ")
                : "sem alertas de billing"}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-medium">Reconciliação controlada</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Só é liberada após mapping linked. A leitura do provider retorna ao
            mesmo lifecycle canônico utilizado pelo webhook.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => reconcile.mutate()}
            disabled={!providerLinked || reconcile.isPending}
          >
            {reconcile.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 size-4" />
            )}
            Reconciliar estado de teste
          </Button>
        </div>
      </section>

      {operationError ? (
        <div className="rounded-lg border p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" />
            Operação não concluída
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {safeErrorCode(operationError)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "data inválida"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

function safeErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return "bcr01_request_failed";
  const match = error.message.match(/bcr01_[a-z0-9_]+/i);
  return match ? match[0].toLowerCase() : "bcr01_request_failed";
}

function StatusCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StateCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-20 max-w-xl rounded-lg border bg-card p-8 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

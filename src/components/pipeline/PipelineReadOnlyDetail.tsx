import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { WorkspaceState } from "@/components/workspace";
import { cn } from "@/lib/utils";
import {
  formatPipelineCurrency,
  formatPipelineDate,
  PIPELINE_STATUS_META,
  type PipelineLeadReadModel,
} from "./pipeline-read-model";

type PipelineReadOnlyDetailProps = {
  lead?: PipelineLeadReadModel;
};

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-workspace-surface p-3.5">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function PipelineReadOnlyDetail({ lead }: PipelineReadOnlyDetailProps) {
  if (!lead) {
    return (
      <WorkspaceState
        kind="empty"
        compact
        title="Selecione uma oportunidade"
        description="Escolha um lead na lista para consultar seu resumo autorizado, sem alterar o pipeline."
        className="min-h-[22rem] rounded-2xl"
      />
    );
  }

  const status = PIPELINE_STATUS_META[lead.status];

  return (
    <article
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-workspace-elevated shadow-soft"
      aria-labelledby="pipeline-detail-title"
      aria-live="polite"
    >
      <header className="relative overflow-hidden border-b border-border px-5 py-5 sm:px-6">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_58%)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                  status.tone,
                )}
              >
                {status.label}
              </span>
              {lead.origem ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                  <MapPin className="size-3" aria-hidden="true" />
                  {lead.origem}
                </span>
              ) : null}
            </div>
            <h2
              id="pipeline-detail-title"
              className="truncate text-xl font-semibold text-foreground"
            >
              {lead.nome}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão consolidada pelo servidor para consulta comercial.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-state-success/20 bg-state-success/10 px-3 py-2 text-xs font-medium text-state-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Autoridade preservada
          </div>
        </div>
      </header>

      <div className="space-y-5 p-5 sm:p-6">
        <section aria-labelledby="pipeline-contact-title">
          <h3 id="pipeline-contact-title" className="mb-3 text-sm font-semibold text-foreground">
            Contato e oportunidade
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField icon={Mail} label="E-mail" value={lead.email ?? "Não informado"} />
            <DetailField icon={Phone} label="Telefone" value={lead.telefone ?? "Não informado"} />
            <DetailField
              icon={CircleDollarSign}
              label="Valor estimado"
              value={formatPipelineCurrency(lead.valor_estimado)}
            />
            <DetailField
              icon={CalendarDays}
              label="Entrada no pipeline"
              value={formatPipelineDate(lead.created_at)}
            />
          </div>
        </section>

        <section
          className="rounded-xl border border-border bg-workspace-surface p-4"
          aria-labelledby="pipeline-property-title"
        >
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Building2 className="size-4" aria-hidden="true" />
            <h3
              id="pipeline-property-title"
              className="text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Interesse imobiliário
            </h3>
          </div>
          <p className="font-medium text-foreground">
            {lead.imovel?.titulo ?? "Imóvel não vinculado"}
          </p>
          {lead.imovel?.preco !== null && lead.imovel?.preco !== undefined ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {lead.imovel.preco_sob_consulta
                ? "Valor sob consulta"
                : formatPipelineCurrency(lead.imovel.preco)}
            </p>
          ) : null}
        </section>

        <section
          className="rounded-xl border border-border bg-workspace-surface p-4"
          aria-labelledby="pipeline-message-title"
        >
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <MessageSquareText className="size-4" aria-hidden="true" />
            <h3
              id="pipeline-message-title"
              className="text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Mensagem original
            </h3>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/85">
            {lead.mensagem?.trim() || "Nenhuma mensagem foi registrada para este lead."}
          </p>
        </section>

        <p className="text-xs leading-5 text-muted-foreground">
          Esta visualização não oferece ações de atualização, atribuição, qualificação ou mudança de
          etapa.
        </p>
      </div>
    </article>
  );
}

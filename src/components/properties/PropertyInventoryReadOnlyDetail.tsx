import {
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  CircleDollarSign,
  Expand,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceState } from "@/components/workspace";
import { cn } from "@/lib/utils";
import {
  formatPropertyCurrency,
  formatPropertyDate,
  propertyStatusMeta,
  type PropertyDetailReadModel,
  type PropertyReadErrorKind,
} from "./property-inventory-read-model";

type PropertyInventoryReadOnlyDetailProps = {
  property?: PropertyDetailReadModel;
  state?: "idle" | "loading" | PropertyReadErrorKind;
  onRetry?: () => void;
};

function PropertyMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-workspace-surface p-3">
      <Icon className="mb-2 size-4 text-primary" aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function PropertyInventoryReadOnlyDetail({
  property,
  state = "idle",
  onRetry,
}: PropertyInventoryReadOnlyDetailProps) {
  if (!property) {
    const copy = {
      idle: {
        kind: "empty" as const,
        title: "Selecione um imóvel",
        description: "Escolha um item do portfólio para consultar seu detalhe autorizado.",
      },
      loading: {
        kind: "loading" as const,
        title: "Carregando detalhe",
        description: "Consultando o read model do imóvel selecionado.",
      },
      denied: {
        kind: "denied" as const,
        title: "Detalhe não autorizado",
        description: "Seu perfil não possui a autorização server-side necessária.",
      },
      unavailable: {
        kind: "unavailable" as const,
        title: "Detalhe indisponível",
        description: "Selecione um workspace elegível para consultar este imóvel.",
      },
      error: {
        kind: "error" as const,
        title: "Não foi possível carregar o detalhe",
        description: "A consulta falhou sem alterar dados. Tente novamente.",
      },
    }[state];

    return (
      <WorkspaceState
        kind={copy.kind}
        compact
        title={copy.title}
        description={copy.description}
        className="min-h-[28rem] rounded-2xl"
        action={
          state === "error" && onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : undefined
        }
      />
    );
  }

  const status = propertyStatusMeta(property.status);
  const location = [property.bairro, property.cidade, property.estado].filter(Boolean).join(" · ");

  return (
    <article
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-workspace-elevated shadow-soft"
      aria-labelledby="property-detail-title"
      aria-live="polite"
      data-property-detail-mode="read-only"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/16 via-workspace-surface to-workspace-elevated">
        {property.imageUrl ? (
          <img
            src={property.imageUrl}
            alt={property.imageAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center"
            data-image-fallback="true"
            aria-label="Imagem não disponível"
          >
            <Building2 className="size-16 text-foreground/16" aria-hidden="true" />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset backdrop-blur-sm",
                status.tone,
              )}
            >
              {status.label}
            </span>
            {property.destaque ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur-sm">
                <Sparkles className="size-3" aria-hidden="true" /> Destaque
              </span>
            ) : null}
            {property.exclusivo ? (
              <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-sm">
                Exclusivo
              </span>
            ) : null}
          </div>
          <span className="rounded-full bg-background/90 px-2.5 py-1 font-mono text-[10px] text-foreground backdrop-blur-sm">
            {property.codigo}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {property.tipo} · {property.finalidade}
            </p>
            <h2
              id="property-detail-title"
              className="text-xl font-semibold text-foreground sm:text-2xl"
            >
              {property.titulo}
            </h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span>{location || property.endereco || "Localização não informada"}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-state-success/20 bg-state-success/10 px-3 py-2 text-xs font-medium text-state-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Consulta segura
          </div>
        </header>

        <section
          className="rounded-xl border border-primary/15 bg-primary/[0.06] p-4"
          aria-label="Condição comercial informativa"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CircleDollarSign className="size-4 text-primary" aria-hidden="true" />
            Preço informado pelo servidor
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {formatPropertyCurrency(property.preco, property.preco_sob_consulta)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Esta visualização não estabelece nem altera condição comercial.
          </p>
        </section>

        <section
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-label="Características principais"
        >
          <PropertyMetric
            icon={BedDouble}
            label="Quartos"
            value={String(property.quartos ?? "—")}
          />
          <PropertyMetric icon={Bath} label="Banheiros" value={String(property.banheiros ?? "—")} />
          <PropertyMetric icon={Car} label="Vagas" value={String(property.vagas ?? "—")} />
          <PropertyMetric
            icon={Expand}
            label="Área útil"
            value={property.area_util ? `${property.area_util} m²` : "—"}
          />
        </section>

        <section className="space-y-3" aria-labelledby="property-description-title">
          <h3 id="property-description-title" className="text-sm font-semibold text-foreground">
            Visão geral
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/85">
            {property.descricao || "Nenhuma descrição foi informada para este imóvel."}
          </p>
          {property.caracteristicas.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Características do imóvel">
              {property.caracteristicas.slice(0, 12).map((feature) => (
                <li
                  key={feature}
                  className="rounded-full border border-border bg-workspace-surface px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {feature}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2" aria-label="Informações complementares">
          <PropertyMetric
            icon={CircleDollarSign}
            label="Condomínio"
            value={formatPropertyCurrency(property.condominio)}
          />
          <PropertyMetric
            icon={CalendarDays}
            label="Atualização"
            value={formatPropertyDate(property.updated_at)}
          />
        </section>

        <p className="text-xs leading-5 text-muted-foreground">
          Criar, editar, excluir e publicar permanecem indisponíveis nesta fatia. Todo conteúdo é
          derivado exclusivamente dos read models autorizados pelo servidor.
        </p>
      </div>
    </article>
  );
}

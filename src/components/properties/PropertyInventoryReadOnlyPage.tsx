import { Building2, CircleDollarSign, Filter, Search, Sparkles, Star } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceState } from "@/components/workspace";
import { cn } from "@/lib/utils";
import { PropertyInventoryReadOnlyDetail } from "./PropertyInventoryReadOnlyDetail";
import { PropertyInventoryReadOnlyGrid } from "./PropertyInventoryReadOnlyGrid";
import {
  formatPropertyCurrency,
  PROPERTY_PURPOSE_KEYS,
  PROPERTY_PURPOSE_META,
  PROPERTY_STATUS_KEYS,
  PROPERTY_STATUS_META,
} from "./property-inventory-read-model";
import {
  usePropertyDetailReadModel,
  usePropertyInventoryReadModel,
} from "./hooks/usePropertyInventoryReadModel";
import type { PropertyInventorySearch } from "./search-schema";

type PropertyInventoryReadOnlyPageProps = {
  search: PropertyInventorySearch;
};

export function PropertyInventoryReadOnlyPage({ search }: PropertyInventoryReadOnlyPageProps) {
  const navigate = useNavigate();
  const inventory = usePropertyInventoryReadModel(search);
  const detail = usePropertyDetailReadModel(search.item);

  function updateSearch(patch: Partial<PropertyInventorySearch>) {
    navigate({
      to: "/admin/imoveis",
      search: { ...search, ...patch },
      replace: true,
      resetScroll: false,
    });
  }

  if (inventory.query.isPending) {
    return (
      <WorkspaceState
        kind="loading"
        title="Carregando inventário"
        description="Consultando o catálogo autorizado para este workspace."
      />
    );
  }

  if (inventory.query.isError) {
    const kind = inventory.errorKind ?? "error";
    return (
      <WorkspaceState
        kind={kind}
        title={
          kind === "denied"
            ? "Inventário não autorizado"
            : kind === "unavailable"
              ? "Inventário indisponível"
              : "Não foi possível carregar o inventário"
        }
        description={
          kind === "denied"
            ? "Seu perfil não possui autorização server-side para consultar estes imóveis."
            : kind === "unavailable"
              ? "Selecione um workspace elegível para consultar o portfólio com segurança."
              : "A consulta read-only falhou sem alterar nenhum dado. Tente novamente."
        }
        action={
          kind === "error" ? (
            <Button type="button" variant="outline" onClick={() => inventory.query.refetch()}>
              Tentar novamente
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (inventory.properties.length === 0) {
    return (
      <WorkspaceState
        kind="empty"
        title="Inventário pronto para receber imóveis"
        description="Nenhum imóvel autorizado foi retornado para este workspace."
      />
    );
  }

  const filtersActive = Boolean(search.q || search.status || search.finalidade);
  const detailState = !search.item
    ? "idle"
    : detail.query.isPending
      ? "loading"
      : detail.query.isError
        ? (detail.errorKind ?? "error")
        : "idle";

  return (
    <div
      className="mx-auto w-full max-w-[var(--workspace-content-max)] space-y-6"
      data-property-inventory-mode="read-only"
    >
      <header className="relative overflow-hidden rounded-2xl border border-border bg-workspace-elevated p-5 shadow-soft sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_31%),linear-gradient(140deg,color-mix(in_oklab,var(--workspace-surface)_88%,transparent),transparent)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3" aria-hidden="true" />
                Curadoria imobiliária
              </span>
              <span className="rounded-full border border-border bg-background/65 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Read models server-owned
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Inventário de imóveis
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Explore o portfólio do workspace em uma experiência visual segura, sem criar, editar,
              excluir ou publicar registros.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[34rem]"
            aria-label="Resumo do inventário"
          >
            {[
              { label: "Imóveis", value: String(inventory.summary.total), icon: Building2 },
              { label: "Ativos", value: String(inventory.summary.active), icon: Filter },
              { label: "Destaques", value: String(inventory.summary.featured), icon: Star },
              {
                label: "Ticket médio",
                value: formatPropertyCurrency(inventory.summary.averagePrice),
                icon: CircleDollarSign,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="min-w-0 rounded-xl border border-border bg-background/70 p-3 backdrop-blur-sm"
              >
                <Icon className="mb-2 size-4 text-primary" aria-hidden="true" />
                <p className="truncate text-base font-semibold text-foreground" title={value}>
                  {value}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="space-y-3" aria-label="Filtros locais do inventário">
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filtrar por status"
        >
          <button
            type="button"
            aria-pressed={!search.status}
            onClick={() => updateSearch({ status: undefined, item: undefined })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus",
              !search.status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-workspace-elevated text-muted-foreground hover:text-foreground",
            )}
          >
            Todos · {inventory.summary.total}
          </button>
          {PROPERTY_STATUS_KEYS.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={search.status === status}
              onClick={() => updateSearch({ status, item: undefined })}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus",
                search.status === status
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-workspace-elevated text-muted-foreground hover:text-foreground",
              )}
            >
              {PROPERTY_STATUS_META[status].label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-workspace-elevated p-3 shadow-soft sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.35fr)_auto]">
          <label className="relative min-w-0">
            <span className="sr-only">Buscar imóveis</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search.q ?? ""}
              onChange={(event) =>
                updateSearch({ q: event.currentTarget.value || undefined, item: undefined })
              }
              placeholder="Buscar por código, título, tipo ou bairro"
              aria-label="Buscar imóveis"
              className="pl-9"
            />
          </label>

          <label className="min-w-0">
            <span className="sr-only">Filtrar por finalidade</span>
            <select
              value={search.finalidade ?? ""}
              onChange={(event) =>
                updateSearch({
                  finalidade: (event.currentTarget.value ||
                    undefined) as PropertyInventorySearch["finalidade"],
                  item: undefined,
                })
              }
              aria-label="Filtrar por finalidade"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-focus"
            >
              <option value="">Todas as finalidades</option>
              {PROPERTY_PURPOSE_KEYS.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {PROPERTY_PURPOSE_META[purpose]}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="ghost"
            disabled={!filtersActive}
            onClick={() =>
              updateSearch({
                q: undefined,
                status: undefined,
                finalidade: undefined,
                item: undefined,
              })
            }
          >
            Limpar filtros
          </Button>
        </div>
      </section>

      {inventory.filtered.length === 0 ? (
        <WorkspaceState
          kind="empty"
          compact
          title="Nenhum imóvel corresponde aos filtros"
          description="Ajuste a busca, status ou finalidade para ampliar os resultados locais."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                updateSearch({
                  q: undefined,
                  status: undefined,
                  finalidade: undefined,
                  item: undefined,
                })
              }
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.36fr)_minmax(23rem,0.64fr)] 2xl:items-start">
          <PropertyInventoryReadOnlyGrid
            properties={inventory.filtered}
            selectedId={search.item}
            onSelect={(item) => updateSearch({ item })}
          />
          <PropertyInventoryReadOnlyDetail
            property={detail.property}
            state={detailState}
            onRetry={() => detail.query.refetch()}
          />
        </div>
      )}
    </div>
  );
}

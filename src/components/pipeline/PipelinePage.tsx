// PipelinePage — split view (lista 40% / detalhe 60%) — Bloco 2.
import { useEffect, useMemo } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutList, LayoutGrid, Rows3, Rows2, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { NovoLeadDialog, Column, Card, COLUMNS, DescartadosPanel, FunilChart, PerformanceComercialPanel } from "@/adapters/pipeline-legacy";
import type { Status } from "@/adapters/pipeline-legacy";
import { usePipelineData } from "./hooks/usePipelineData";
import { LeadsList } from "./LeadsList";
import { LeadDetail, LeadDetailEmpty } from "./LeadDetail";
import type { PipelineSearch } from "./search-schema";
import { useState } from "react";

export function PipelinePage({ search }: { search: PipelineSearch }) {
  const navigate = useNavigate();
  const view = search.view ?? "list";
  const density = search.density ?? "compact";
  const tab = search.tab ?? "ativos";

  const { filtered, byStatus, corretores, descartesTotal, updateStatus } = usePipelineData(search);

  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selected = search.item ? filtered.find((l) => l.id === search.item) ?? null : null;

  // Se o item selecionado sumiu (mudou filtro), limpa da URL
  useEffect(() => {
    if (search.item && !filtered.find((l) => l.id === search.item)) {
      navigate({ to: "/admin/pipeline", search: { ...search, item: undefined }, replace: true, resetScroll: false });
    }
  }, [search.item, filtered, navigate, search]);

  function patchSearch(patch: Partial<PipelineSearch>) {
    navigate({ to: "/admin/pipeline", search: { ...search, ...patch }, replace: true, resetScroll: false });
  }

  function closeDetail() {
    patchSearch({ item: undefined });
  }

  const chips = useMemo(() => {
    const c: { key: keyof PipelineSearch | "periodo"; label: string }[] = [];
    if (search.status) c.push({ key: "status", label: `Status: ${search.status}` });
    if (search.origem) c.push({ key: "origem", label: `Origem: ${search.origem}` });
    if (search.corretor && search.corretor !== "__all__") c.push({ key: "corretor", label: `Corretor: ${search.corretor === "__none__" ? "sem corretor" : "atribuído"}` });
    if (search.inicio || search.fim) c.push({ key: "periodo", label: `Período: ${search.inicio ?? "…"} → ${search.fim ?? "…"}` });
    if (search.alerta) c.push({ key: "alerta", label: `Alerta: ${search.alerta.replace(/_/g, " ")}` });
    return c;
  }, [search]);

  function clearChip(key: string) {
    const next = { ...search } as Record<string, unknown>;
    if (key === "periodo") { delete next.inicio; delete next.fim; }
    else delete next[key];
    navigate({ to: "/admin/pipeline", search: next as PipelineSearch, replace: true, resetScroll: false });
  }

  // Novo lead controlado por ?new=1
  const newOpen = search.new === "1";
  function setNewOpen(o: boolean) {
    patchSearch({ new: o ? "1" : undefined });
  }

  // Kanban DnD
  function handleDragStart(e: DragStartEvent) { setDragId(String(e.active.id)); }
  function handleDragEnd(e: DragEndEvent) {
    setDragId(null);
    const id = String(e.active.id);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    const lead = filtered.find((l) => l.id === id);
    if (!lead || lead.status === over) return;
    if (over === "perdido" && lead.status !== "proposta") {
      toast.error("Só é possível marcar Perdido a partir de Proposta. Use Descartar.");
      return;
    }
    updateStatus.mutate({ id, status: over as Status });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px-48px-24px)] min-h-[520px] gap-3">
      {/* Header + filtros */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <AdminPageHeader eyebrow="CRM" title="Pipeline" />
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setNewOpen(true)}>+ Novo lead</Button>

          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button size="sm" variant={tab === "ativos" ? "secondary" : "ghost"} className="h-7" onClick={() => patchSearch({ tab: "ativos" })}>Ativos</Button>
            <Button size="sm" variant={tab === "descartados" ? "secondary" : "ghost"} className="h-7" onClick={() => patchSearch({ tab: "descartados", item: undefined })}>Descartados</Button>
            <Button size="sm" variant={tab === "analise" ? "secondary" : "ghost"} className="h-7" onClick={() => patchSearch({ tab: "analise", item: undefined })}>Análise</Button>
          </div>

          {tab === "ativos" && (
            <>
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} className="h-7" onClick={() => patchSearch({ view: "list" })} title="Lista">
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} className="h-7" onClick={() => patchSearch({ view: "kanban", item: undefined })} title="Kanban">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              {view === "list" && (
                <div className="flex items-center gap-1 border rounded-md p-0.5">
                  <Button size="sm" variant={density === "compact" ? "secondary" : "ghost"} className="h-7" onClick={() => patchSearch({ density: "compact" })} title="Denso">
                    <Rows3 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant={density === "comfortable" ? "secondary" : "ghost"} className="h-7" onClick={() => patchSearch({ density: "comfortable" })} title="Confortável">
                    <Rows2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          <Select value={search.corretor ?? "__all__"} onValueChange={(v) => patchSearch({ corretor: v === "__all__" ? undefined : v })}>
            <SelectTrigger className="h-8 min-w-[180px]"><SelectValue placeholder="Corretor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos corretores</SelectItem>
              <SelectItem value="__none__">Sem corretor</SelectItem>
              {corretores.filter((c) => !!c.user_id).map((c) => (
                <SelectItem key={c.id} value={c.user_id!}>{c.nome}{c.sobrenome ? ` ${c.sobrenome}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-md border border-foreground/10 bg-muted/30 px-3 py-1.5 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">Filtros:</span>
          {chips.map((c) => (
            <button key={c.key} onClick={() => clearChip(c.key as string)} className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 hover:bg-primary/25">
              {c.label} <X className="h-3 w-3" />
            </button>
          ))}
          <button onClick={() => navigate({ to: "/admin/pipeline", search: { view, density, tab }, replace: true })} className="text-muted-foreground underline ml-1">Limpar todos</button>
        </div>
      )}

      {/* Corpo */}
      {tab === "descartados" && (
        <div className="flex-1 overflow-auto">
          <DescartadosPanel onOpen={(id) => patchSearch({ tab: "ativos", item: id })} />
        </div>
      )}

      {tab === "analise" && (
        <div className="flex-1 overflow-auto space-y-4">
          <FunilChart byStatus={byStatus} descartesTotal={descartesTotal} />
          <PerformanceComercialPanel />
        </div>
      )}

      {tab === "ativos" && view === "kanban" && (
        <div className="flex-1 overflow-hidden">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid gap-3 [grid-template-columns:repeat(6,minmax(220px,1fr))] overflow-x-auto pb-4 h-full">
              {COLUMNS.map((col) => (
                <Column key={col.id} col={col} leads={byStatus[col.id]} onOpen={(id) => patchSearch({ view: "list", item: id })} />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragId ? (() => { const l = filtered.find((x) => x.id === dragId); return l ? <Card lead={l} /> : null; })() : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {tab === "ativos" && view === "list" && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(280px,40%)_minmax(0,1fr)] rounded-lg border border-foreground/10 bg-card overflow-hidden">
          {/* Left: list */}
          <div className="border-b lg:border-b-0 lg:border-r border-foreground/5 min-h-0 flex flex-col">
            <LeadsList leads={filtered} selectedId={selected?.id ?? null} density={density} search={search} />
          </div>
          {/* Right: inline detail (Bloco 2 §1 — Pipeline INLINE ONLY) */}
          <div className="min-h-0 flex flex-col">
            {selected ? <LeadDetail lead={selected} onClose={closeDetail} /> : <LeadDetailEmpty />}
          </div>
        </div>
      )}

      <NovoLeadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        corretores={corretores}
        onCreated={(id) => { if (id) patchSearch({ item: id, new: undefined, tab: "ativos", view: "list" }); }}
      />
    </div>
  );
}

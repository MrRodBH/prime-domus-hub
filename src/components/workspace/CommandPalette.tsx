// Command Palette (⌘K) — Bloco 1 + Bloco 2 (busca de leads).
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUI } from "./ui-store";
import { CONTEXTS } from "./contexts";
import { adminListarLeads } from "@/lib/api/admin.functions";
import { Plus, Compass, Sparkles, User } from "lucide-react";

const CREATIONS: { label: string; to: string; search?: Record<string, string>; keywords?: string }[] = [
  { label: "Novo lead", to: "/admin/pipeline", search: { new: "1" }, keywords: "criar lead pipeline" },
  { label: "Novo imóvel", to: "/admin/imoveis/novo", keywords: "cadastrar imóvel catálogo" },
  { label: "Novo lançamento", to: "/admin/lancamentos/novo", keywords: "cadastrar lançamento" },
  { label: "Nova página", to: "/admin/paginas", keywords: "criar página cms" },
  { label: "Nova campanha", to: "/admin/campanhas", keywords: "criar campanha" },
  { label: "Novo post do blog", to: "/admin/blog/novo", keywords: "criar post artigo" },
];

export function CommandPalette({ isSuper }: { isSuper?: boolean }) {
  const { paletteOpen, closePalette, togglePalette, openAi } = useUI();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  // Leads carregados só quando a palette está aberta.
  const { data: leads } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: () => adminListarLeads(),
    enabled: paletteOpen,
    staleTime: 30_000,
  });

  const leadMatches = (() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return (leads ?? [])
      .filter((l) => {
        const hay = `${l.nome} ${l.email ?? ""} ${l.telefone ?? ""}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 8);
  })();

  const go = (to: string, search?: Record<string, string>) => {
    closePalette();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: to as any, search: search as any });
  };

  const openLead = (id: string) => {
    closePalette();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: "/admin/pipeline" as any, search: { item: id, view: "list", tab: "ativos" } as any });
  };

  const contexts = CONTEXTS.filter((c) => !c.superOnly || isSuper);

  return (
    <CommandDialog open={paletteOpen} onOpenChange={(o) => (o ? togglePalette() : closePalette())}>
      <CommandInput placeholder="Buscar lead, navegar ou criar…  (⌘K)" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>

        {leadMatches.length > 0 && (
          <>
            <CommandGroup heading="Leads">
              {leadMatches.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`lead ${l.nome} ${l.email ?? ""} ${l.telefone ?? ""}`}
                  onSelect={() => openLead(l.id)}
                >
                  <User className="size-4 mr-2" />
                  <span className="truncate">{l.nome}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">{l.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navegar">
          {contexts.map((c) => {
            const Icon = c.icon;
            return (
              <CommandItem key={c.id} value={`nav ${c.label} ${c.id}`} onSelect={() => go(c.root)}>
                <Icon className="size-4 mr-2" /> Ir para {c.label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Criar">
          {CREATIONS.map((c) => (
            <CommandItem
              key={c.to + c.label}
              value={`criar ${c.label} ${c.keywords ?? ""}`}
              onSelect={() => go(c.to, c.search)}
            >
              <Plus className="size-4 mr-2" /> {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações">
          <CommandItem value="ia assistente perguntar" onSelect={() => { closePalette(); openAi(); }}>
            <Sparkles className="size-4 mr-2" /> Perguntar ao assistente
          </CommandItem>
          <CommandItem value="site publico" onSelect={() => go("/")}>
            <Compass className="size-4 mr-2" /> Ver site público
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

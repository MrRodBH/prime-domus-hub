// Command Palette (⌘K) — Bloco 1 + Bloco 2 + Bloco 3 (ações CMS).
import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useUI } from "./ui-store";
import { CONTEXTS } from "./contexts";
import { adminListarLeads } from "@/lib/api/admin.functions";
import { listarPaginas } from "@/lib/api/pages.functions";
import { Plus, Compass, Sparkles, User, FileText, Rocket, EyeOff, Monitor, Tablet, Smartphone, Copy } from "lucide-react";

const CREATIONS: { label: string; to: string; search?: Record<string, string>; keywords?: string }[] = [
  { label: "Novo lead", to: "/admin/pipeline", search: { new: "1" }, keywords: "criar lead" },
  { label: "Novo imóvel", to: "/admin/imoveis/novo", keywords: "cadastrar imóvel" },
  { label: "Novo lançamento", to: "/admin/lancamentos/novo", keywords: "cadastrar lançamento" },
  { label: "Nova página", to: "/admin/paginas", search: { new: "1" }, keywords: "criar página cms" },
  { label: "Nova campanha", to: "/admin/campanhas", keywords: "criar campanha" },
  { label: "Novo post do blog", to: "/admin/blog/novo", keywords: "criar post" },
];

export function CommandPalette({ isSuper }: { isSuper?: boolean }) {
  const { paletteOpen, closePalette, togglePalette, openAi, setPreviewDevice } = useUI();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchState = useRouterState({ select: (s) => s.location.search as any });
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); togglePalette(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  const inContent = path.startsWith("/admin/paginas") || path.startsWith("/admin/blog")
    || path.startsWith("/admin/formularios") || path.startsWith("/admin/campanhas");
  const activeItemId: string | undefined = inContent ? searchState?.item : undefined;

  const { data: leads } = useQuery({
    queryKey: ["admin", "leads"], queryFn: () => adminListarLeads(),
    enabled: paletteOpen, staleTime: 30_000,
  });
  const { data: pages } = useQuery({
    queryKey: ["pages-admin"], queryFn: () => listarPaginas(),
    enabled: paletteOpen, staleTime: 30_000,
  });

  const needle = q.trim().toLowerCase();
  const leadMatches = !needle ? [] : (leads ?? [])
    .filter((l) => `${l.nome} ${l.email ?? ""} ${l.telefone ?? ""}`.toLowerCase().includes(needle))
    .slice(0, 6);
  const pageMatches = !needle ? [] : (pages ?? [])
    .filter((p) => `${p.titulo} ${p.slug ?? ""}`.toLowerCase().includes(needle))
    .slice(0, 6);

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
  const openPage = (id: string) => {
    closePalette();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: "/admin/paginas" as any, search: { item: id } as any });
  };

  // Ações contextuais quando um item de conteúdo está aberto
  const contentActions = activeItemId ? [
    { label: "Abrir preview", icon: Compass, onSelect: () => { closePalette(); navigate({ to: path as never, search: { ...searchState, tab: "preview" } as never, replace: true }); } },
    { label: "Publicar (abrir workflow)", icon: Rocket, onSelect: () => { closePalette(); navigate({ to: path as never, search: { ...searchState, tab: "publicacao" } as never, replace: true }); } },
    { label: "Despublicar (abrir workflow)", icon: EyeOff, onSelect: () => { closePalette(); navigate({ to: path as never, search: { ...searchState, tab: "publicacao" } as never, replace: true }); } },
    { label: "Restaurar última versão", icon: Copy, onSelect: () => { closePalette(); navigate({ to: path as never, search: { ...searchState, tab: "versoes" } as never, replace: true }); } },
    { label: "Duplicar (em breve)", icon: Copy, onSelect: () => closePalette(), disabled: true },
  ] : [];

  const deviceActions = activeItemId ? [
    { label: "Preview: Desktop", icon: Monitor, onSelect: () => { closePalette(); setPreviewDevice("desktop"); } },
    { label: "Preview: Tablet", icon: Tablet, onSelect: () => { closePalette(); setPreviewDevice("tablet"); } },
    { label: "Preview: Mobile", icon: Smartphone, onSelect: () => { closePalette(); setPreviewDevice("mobile"); } },
  ] : [];

  const contexts = CONTEXTS.filter((c) => !c.superOnly || isSuper);
  void qc;

  return (
    <CommandDialog open={paletteOpen} onOpenChange={(o) => (o ? togglePalette() : closePalette())}>
      <CommandInput placeholder="Buscar lead, página, navegar ou criar…  (⌘K)" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>

        {leadMatches.length > 0 && (<>
          <CommandGroup heading="Leads">
            {leadMatches.map((l) => (
              <CommandItem key={l.id} value={`lead ${l.nome} ${l.email ?? ""}`} onSelect={() => openLead(l.id)}>
                <User className="size-4 mr-2" />
                <span className="truncate">{l.nome}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">{l.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </>)}

        {pageMatches.length > 0 && (<>
          <CommandGroup heading="Páginas">
            {pageMatches.map((p) => (
              <CommandItem key={p.id} value={`pagina ${p.titulo} ${p.slug ?? ""}`} onSelect={() => openPage(p.id)}>
                <FileText className="size-4 mr-2" />
                <span className="truncate">{p.titulo}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">{p.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </>)}

        {contentActions.length > 0 && (<>
          <CommandGroup heading="Conteúdo (contexto atual)">
            {contentActions.map((a) => (
              <CommandItem key={a.label} value={`acao ${a.label}`} onSelect={a.onSelect} disabled={a.disabled}>
                <a.icon className="size-4 mr-2" /> {a.label}
              </CommandItem>
            ))}
            {deviceActions.map((a) => (
              <CommandItem key={a.label} value={`preview ${a.label}`} onSelect={a.onSelect}>
                <a.icon className="size-4 mr-2" /> {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </>)}

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
            <CommandItem key={c.to + c.label} value={`criar ${c.label} ${c.keywords ?? ""}`} onSelect={() => go(c.to, c.search)}>
              <Plus className="size-4 mr-2" /> {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações">
          <CommandItem value="ia assistente" onSelect={() => { closePalette(); openAi(); }}>
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

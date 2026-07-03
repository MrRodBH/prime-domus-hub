// Command Palette (⌘K) — inventário mínimo do Bloco 1 (Doc 06 §5).
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { Plus, Compass, Sparkles, Search as SearchIcon } from "lucide-react";

const CREATIONS: { label: string; to: string; keywords?: string }[] = [
  { label: "Novo lead", to: "/admin/leads", keywords: "criar lead pipeline" },
  { label: "Novo imóvel", to: "/admin/imoveis/novo", keywords: "cadastrar imóvel catálogo" },
  { label: "Novo lançamento", to: "/admin/lancamentos/novo", keywords: "cadastrar lançamento" },
  { label: "Nova página", to: "/admin/paginas", keywords: "criar página cms" },
  { label: "Nova campanha", to: "/admin/campanhas", keywords: "criar campanha" },
  { label: "Novo post do blog", to: "/admin/blog/novo", keywords: "criar post artigo" },
];

export function CommandPalette({ isSuper }: { isSuper?: boolean }) {
  const { paletteOpen, closePalette, togglePalette, openAi } = useUI();
  const navigate = useNavigate();

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

  const go = (to: string) => {
    closePalette();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: to as any });
  };

  const contexts = CONTEXTS.filter((c) => !c.superOnly || isSuper);

  return (
    <CommandDialog open={paletteOpen} onOpenChange={(o) => (o ? togglePalette() : closePalette())}>
      <CommandInput placeholder="Buscar, navegar ou criar…  (⌘K)" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>

        <CommandGroup heading="Navegar">
          {contexts.map((c) => {
            const Icon = c.icon;
            return (
              <CommandItem
                key={c.id}
                value={`nav ${c.label} ${c.id}`}
                onSelect={() => go(c.root)}
              >
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
              onSelect={() => go(c.to)}
            >
              <Plus className="size-4 mr-2" /> {c.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações">
          <CommandItem
            value="ia assistente perguntar"
            onSelect={() => {
              closePalette();
              openAi();
            }}
          >
            <Sparkles className="size-4 mr-2" /> Perguntar ao assistente
          </CommandItem>
          <CommandItem
            value="busca site publico"
            onSelect={() => go("/")}
          >
            <Compass className="size-4 mr-2" /> Ver site público
          </CommandItem>
          <CommandItem value="buscar entidades" disabled>
            <SearchIcon className="size-4 mr-2" /> Buscar entidades (em breve)
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

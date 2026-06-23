import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, Sparkles } from "lucide-react";
import { listarAmenities } from "@/lib/api/lancamentos.functions";

type Props = {
  /** "id": value/onChange devolvem amenity ids. "nome": devolvem amenity nomes. */
  by?: "id" | "nome";
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
};

/**
 * Picker compartilhado de itens de Lazer. Mesma lista para Pronto para Morar e Lançamentos.
 * Botão "Selecionar lazer" abre o diálogo com checkboxes.
 */
export function LazerPicker({ by = "id", value, onChange, label = "Lazer" }: Props) {
  const { data: amenities } = useQuery({ queryKey: ["launch-amenities"], queryFn: () => listarAmenities() });
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [draft, setDraft] = useState<string[]>(value);

  const filtradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    const list = amenities ?? [];
    if (!term) return list;
    return list.filter((a) => a.nome.toLowerCase().includes(term));
  }, [amenities, busca]);

  const selecionadasObj = useMemo(() => {
    const list = amenities ?? [];
    const set = new Set(value);
    return list.filter((a) => set.has(by === "id" ? a.id : a.nome));
  }, [amenities, value, by]);

  function toggle(key: string) {
    setDraft((d) => (d.includes(key) ? d.filter((x) => x !== key) : [...d, key]));
  }

  function abrir() {
    setDraft(value);
    setBusca("");
    setOpen(true);
  }

  function confirmar() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={(o) => (o ? abrir() : setOpen(false))}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-md border border-foreground/10 bg-background hover:bg-foreground/5 text-left"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-gold" />
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">
                ({selecionadasObj.length} selecionado{selecionadasObj.length === 1 ? "" : "s"})
              </span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar itens de lazer</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar item…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 overflow-y-auto pr-1">
            {filtradas.map((a) => {
              const key = by === "id" ? a.id : a.nome;
              const checked = draft.includes(key);
              return (
                <label
                  key={a.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-sm cursor-pointer transition ${
                    checked ? "border-gold bg-gold/5" : "border-foreground/10 hover:bg-foreground/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    className="accent-gold"
                  />
                  {a.nome}
                </label>
              );
            })}
            {filtradas.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground py-6 text-center">
                Nenhum item encontrado.
              </p>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-foreground/10 sm:justify-between">
            <span className="text-xs text-muted-foreground">{draft.length} selecionado(s)</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setDraft([])} disabled={draft.length === 0}>
                Limpar
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmar}>
                Confirmar seleção
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selecionadasObj.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selecionadasObj.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gold/10 text-petroleum text-xs border border-gold/30"
            >
              {a.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

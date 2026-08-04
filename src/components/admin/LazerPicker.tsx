import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, Sparkles } from "lucide-react";
import { listarTenantLaunchAmenities } from "@/lib/api/tenant-launch-catalog.functions";

type Props = {
  /** "id": value/onChange devolvem amenity ids. "nome": devolvem amenity nomes. */
  by?: "id" | "nome";
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
};

/**
 * Picker administrativo de itens de lazer. O catálogo é resolvido pelo tenant
 * efetivo no servidor; Host e client não participam da autoridade.
 */
export function LazerPicker({ by = "id", value, onChange, label = "Lazer" }: Props) {
  const { data: amenities } = useQuery({
    queryKey: ["tenant-launch-amenities"],
    queryFn: () => listarTenantLaunchAmenities(),
  });
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
    setDraft((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
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
      <Dialog open={open} onOpenChange={(next) => (next ? abrir() : setOpen(false))}>
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
          <DialogHeader><DialogTitle>Selecionar itens de lazer</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar item…"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 overflow-y-auto pr-1">
            {filtradas.map((amenity) => {
              const key = by === "id" ? amenity.id : amenity.nome;
              const checked = draft.includes(key);
              return (
                <label
                  key={amenity.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-sm cursor-pointer transition ${checked ? "border-gold bg-gold/5" : "border-foreground/10 hover:bg-foreground/5"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    className="accent-gold"
                  />
                  {amenity.nome}
                </label>
              );
            })}
            {filtradas.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground py-6 text-center">Nenhum item encontrado.</p>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-foreground/10 sm:justify-between">
            <span className="text-xs text-muted-foreground">{draft.length} selecionado(s)</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setDraft([])} disabled={draft.length === 0}>Limpar</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="button" onClick={confirmar}>Confirmar seleção</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selecionadasObj.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selecionadasObj.map((amenity) => (
            <span
              key={amenity.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gold/10 text-petroleum text-xs border border-gold/30"
            >
              {amenity.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// VersionsPanel — arquitetura de versões preparada p/ comparação A↔B (Bloco 3 §6).
// Nesta iteração: comparação textual (JSON diff) — não uma tabela pura.
// Escopo entidade "pagina": fonte é o próprio rascunho vs versão publicada; histórico
// completo por página virá quando cms_pages tiver tabela de versões dedicada.
import { useMemo, useState } from "react";
import { useContentSession } from "./session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type VersionRow = {
  id: string;
  label: string;
  status: "draft" | "published";
  createdAt: string;
  payload: unknown;
};

export function VersionsPanel() {
  const s = useContentSession();

  const versions: VersionRow[] = useMemo(() => {
    const rows: VersionRow[] = [];
    if (s.detail) {
      rows.push({
        id: "current-published",
        label: s.detail.status === "published" ? "Publicada (atual)" : "Última versão salva",
        status: s.detail.status === "published" ? "published" : "draft",
        createdAt: s.detail.published_at ?? s.detail.updated_at,
        payload: { titulo: s.detail.titulo, blocks: s.detail.blocks, seo: s.detail.seo },
      });
    }
    rows.push({
      id: "current-draft",
      label: "Rascunho em edição",
      status: "draft",
      createdAt: new Date().toISOString(),
      payload: { titulo: s.draft.titulo, blocks: s.draft.blocks, seo: s.draft.seo },
    });
    return rows;
  }, [s.detail, s.draft]);

  const [a, setA] = useState<string>(versions[0]?.id ?? "");
  const [b, setB] = useState<string>(versions[versions.length - 1]?.id ?? "");

  const va = versions.find((v) => v.id === a);
  const vb = versions.find((v) => v.id === b);

  const diff = useMemo(() => {
    if (!va || !vb) return null;
    const A = JSON.stringify(va.payload, null, 2).split("\n");
    const B = JSON.stringify(vb.payload, null, 2).split("\n");
    const max = Math.max(A.length, B.length);
    const rows: Array<{ a: string; b: string; changed: boolean }> = [];
    for (let i = 0; i < max; i++) {
      const la = A[i] ?? "";
      const lb = B[i] ?? "";
      rows.push({ a: la, b: lb, changed: la !== lb });
    }
    return rows;
  }, [va, vb]);

  return (
    <div className="space-y-4 max-w-full">
      <div className="text-sm text-muted-foreground">
        Comparação lado a lado. Restaurar uma versão gera um rascunho editável — a publicação continua desacoplada.
      </div>

      <div className="grid grid-cols-2 gap-3">
        <VersionColumn label="Versão A" versions={versions} selected={a} onChange={setA} />
        <VersionColumn label="Versão B" versions={versions} selected={b} onChange={setB} />
      </div>

      <div className="rounded-md border border-foreground/10 overflow-hidden">
        <div className="grid grid-cols-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-foreground/5">
          <div className="px-3 py-1.5 border-r border-foreground/5">{va?.label ?? "—"}</div>
          <div className="px-3 py-1.5">{vb?.label ?? "—"}</div>
        </div>
        <div className="max-h-[420px] overflow-auto font-mono text-[11px] leading-relaxed">
          {(diff ?? []).map((r, i) => (
            <div key={i} className="grid grid-cols-2">
              <div className={`px-3 py-0.5 border-r border-foreground/5 whitespace-pre ${r.changed ? "bg-rose-500/10" : ""}`}>{r.a}</div>
              <div className={`px-3 py-0.5 whitespace-pre ${r.changed ? "bg-emerald-500/10" : ""}`}>{r.b}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Histórico completo de revisões por página será populado quando <code>cms_pages</code> receber tabela dedicada de versões — a UI já está pronta.
      </div>
    </div>
  );
}

function VersionColumn({ label, versions, selected, onChange }: {
  label: string; versions: VersionRow[]; selected: string; onChange: (id: string) => void;
}) {
  return (
    <div className="rounded-md border border-foreground/10 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">{label}</div>
      <div className="space-y-1">
        {versions.map((v) => (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={`w-full text-left rounded-md px-2 py-1.5 text-xs border ${selected === v.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{v.label}</span>
              <Badge variant="outline" className="text-[9px]">{v.status}</Badge>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(v.createdAt).toLocaleString("pt-BR")}</div>
          </button>
        ))}
      </div>
      <div className="mt-2">
        <Button size="sm" variant="outline" className="w-full h-7 text-xs" disabled>
          Restaurar (em breve)
        </Button>
      </div>
    </div>
  );
}

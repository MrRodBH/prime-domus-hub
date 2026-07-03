// VersionsPanel — genérico (Bloco 3.1 §6). Nunca conhece "pageId": recebe entityId via session.
import { useEffect, useMemo, useState } from "react";
import { useContentSession } from "./session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { VersionRecord } from "./types";

export function VersionsPanel() {
  const s = useContentSession();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await s.refreshVersions();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.entityId]);

  // Fallback local (adapters que não implementam listVersions):
  const versions: VersionRecord[] = useMemo(() => {
    if (s.versions && s.versions.length) return s.versions;
    const rows: VersionRecord[] = [];
    if (s.detail) {
      rows.push({
        id: "current-published",
        label: (s.detail.status === "published" || s.detail.status === "active") ? "Publicada (atual)" : "Última versão salva",
        status: s.detail.status === "published" || s.detail.status === "active" ? "published" : "draft",
        createdAt: s.detail.published_at ?? s.detail.updated_at,
        payload: { titulo: s.detail.titulo, blocks: s.detail.blocks, seo: s.detail.seo, data: s.detail.data },
      });
    }
    rows.push({
      id: "current-draft",
      label: "Rascunho em edição",
      status: "draft",
      createdAt: new Date().toISOString(),
      payload: { titulo: s.draft.titulo, blocks: s.draft.blocks, seo: s.draft.seo, data: s.draft.data },
    });
    return rows;
  }, [s.versions, s.detail, s.draft]);

  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  useEffect(() => {
    if (versions.length >= 2 && !a) { setA(versions[0].id); setB(versions[versions.length - 1].id); }
    else if (versions.length === 1 && !a) { setA(versions[0].id); setB(versions[0].id); }
  }, [versions, a]);

  const va = versions.find((v) => v.id === a);
  const vb = versions.find((v) => v.id === b);

  const diff = useMemo(() => {
    if (!va || !vb) return null;
    const A = JSON.stringify(va.payload, null, 2).split("\n");
    const B = JSON.stringify(vb.payload, null, 2).split("\n");
    const max = Math.max(A.length, B.length);
    const rows: Array<{ a: string; b: string; changed: boolean }> = [];
    for (let i = 0; i < max; i++) {
      const la = A[i] ?? ""; const lb = B[i] ?? "";
      rows.push({ a: la, b: lb, changed: la !== lb });
    }
    return rows;
  }, [va, vb]);

  const canRestore = !!s.adapter.restoreVersion;

  return (
    <div className="space-y-4 max-w-full">
      <div className="text-sm text-muted-foreground">
        Comparação lado a lado. Restaurar gera um rascunho editável — publicação continua desacoplada.
      </div>
      {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Carregando versões…</div>}

      <div className="grid grid-cols-2 gap-3">
        <VersionColumn label="Versão A" versions={versions} selected={a} onChange={setA} canRestore={canRestore} onRestore={(id) => void s.restoreVersion(id)} />
        <VersionColumn label="Versão B" versions={versions} selected={b} onChange={setB} canRestore={canRestore} onRestore={(id) => void s.restoreVersion(id)} />
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
    </div>
  );
}

function VersionColumn({
  label, versions, selected, onChange, canRestore, onRestore,
}: {
  label: string; versions: VersionRecord[]; selected: string; onChange: (id: string) => void;
  canRestore: boolean; onRestore: (id: string) => void;
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
        <Button
          size="sm" variant="outline" className="w-full h-7 text-xs"
          disabled={!canRestore || !selected || selected.startsWith("current-")}
          onClick={() => selected && onRestore(selected)}
        >
          Restaurar como rascunho
        </Button>
      </div>
    </div>
  );
}

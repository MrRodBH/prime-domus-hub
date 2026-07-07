import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Upload, Trash2, Eye, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import {
  adminListarPdfsLancamento,
  adminAdicionarPdfLancamento,
  adminRemoverPdfLancamento,
} from "@/lib/api/lancamentos.functions";
import { adminAssinarUrl } from "@/lib/api/admin.functions";

type PdfRow = {
  id: string;
  kind: "tabela_precos" | "manual";
  titulo: string | null;
  storage_path: string;
  tamanho_bytes: number | null;
  created_at: string;
};
type Props = { projectId: string; slug: string };

function humanSize(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export function PdfsLancamento({ projectId, slug }: Props) {
  const qc = useQueryClient();

  const { data: pdfs = [] } = useQuery<PdfRow[]>({
    queryKey: ["admin", "lancamento", projectId, "pdfs"],
    queryFn: () => adminListarPdfsLancamento({ data: { project_id: projectId } }),
  });

  const tabelas = pdfs.filter((p) => p.kind === "tabela_precos");
  const manuais = pdfs.filter((p) => p.kind === "manual");

  return (
    <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-6">
      <h2 className="font-medium">Documentos (PDFs)</h2>

      <Bloco
        titulo="Tabela de preços"
        descricao="Máximo 3 versões. O upload mais antigo é excluído automaticamente."
        kind="tabela_precos"
        rows={tabelas}
        projectId={projectId}
        slug={slug}
        onChange={() => qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "pdfs"] })}
      />

      <Bloco
        titulo="Manuais / memorial / apresentação"
        descricao="Aceita memorial descritivo, manual comercial, apresentação institucional, etc."
        kind="manual"
        rows={manuais}
        projectId={projectId}
        slug={slug}
        onChange={() => qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "pdfs"] })}
      />
    </section>
  );
}

function Bloco({ titulo, descricao, kind, rows, projectId, slug, onChange }: {
  titulo: string;
  descricao: string;
  kind: "tabela_precos" | "manual";
  rows: PdfRow[];
  projectId: string;
  slug: string;
  onChange: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tituloNovo, setTituloNovo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const r of rows) {
        try {
          const { url } = await adminAssinarUrl({ data: { bucket: "lancamentos", path: r.storage_path } });
          map[r.id] = url;
        } catch { /* ignore */ }
      }
      if (!cancel) setSigned(map);
    })();
    return () => { cancel = true; };
  }, [rows]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Envie apenas arquivos PDF."); e.target.value = ""; return; }
    setUploading(true);
    try {
      // M3.2 — path server-authoritative; kind vai como `variant` (enum fechado no server).
      const target = await createUploadTarget({
        data: {
          domain: "lancamento-pdf",
          entityId: projectId,
          variant: kind,
          originalFileName: f.name,
          mimeType: f.type,
          size: f.size,
        },
      });
      const { error: upErr } = await supabase.storage.from(target.bucket).upload(target.path, f, {
        upsert: false, contentType: "application/pdf",
      });
      if (upErr) throw upErr;
      await adminAdicionarPdfLancamento({
        data: { project_id: projectId, kind, titulo: tituloNovo || f.name, storage_path: target.path, tamanho_bytes: f.size },
      });
      toast.success("PDF enviado");
      setTituloNovo("");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const remover = useMutation({
    mutationFn: (r: PdfRow) => adminRemoverPdfLancamento({ data: { id: r.id, storage_path: r.storage_path } }),
    onSuccess: () => { toast.success("PDF removido"); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-sm">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Título do documento (opcional)"
            value={tituloNovo}
            onChange={(e) => setTituloNovo(e.target.value)}
          />
        </div>
        <Button type="button" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Upload className="size-4 mr-1" />}
          Enviar PDF
        </Button>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onUpload} />
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-foreground/10 rounded">
          Nenhum documento ainda.
        </p>
      ) : (
        <ul className="divide-y divide-foreground/5 border border-foreground/5 rounded">
          {rows.map((r, idx) => (
            <li key={r.id} className="flex items-center gap-3 p-3">
              <FileText className="size-5 text-gold" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {r.titulo ?? "Documento"}
                  {kind === "tabela_precos" && idx === 0 && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">Atual</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")} • {humanSize(r.tamanho_bytes)}
                </p>
              </div>
              <div className="flex gap-1">
                {signed[r.id] && (
                  <>
                    <Button asChild size="icon" variant="ghost" title="Visualizar">
                      <a href={signed[r.id]} target="_blank" rel="noreferrer"><Eye className="size-4" /></a>
                    </Button>
                    <Button asChild size="icon" variant="ghost" title="Baixar">
                      <a href={signed[r.id]} download><Download className="size-4" /></a>
                    </Button>
                  </>
                )}
                <Button size="icon" variant="ghost" title="Remover" onClick={() => { if (confirm("Remover este PDF?")) remover.mutate(r); }}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

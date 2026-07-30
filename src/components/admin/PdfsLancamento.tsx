import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Eye, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import {
  consumeTenantLaunchPdf,
  signTenantLaunchMedia,
} from "@/lib/api/content-media.functions";
import {
  adminListarPdfsLancamento,
  adminRemoverPdfLancamento,
} from "@/lib/api/lancamentos.functions";

type PdfRow = {
  id: string;
  kind: "tabela_precos" | "manual";
  titulo: string | null;
  storage_path: string;
  tamanho_bytes: number | null;
  created_at: string;
};

type Props = { projectId: string };

function humanSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PdfsLancamento({ projectId }: Props) {
  const queryClient = useQueryClient();
  const { data: pdfs = [] } = useQuery<PdfRow[]>({
    queryKey: ["admin", "lancamento", projectId, "pdfs"],
    queryFn: () => adminListarPdfsLancamento({ data: { project_id: projectId } }),
  });

  return (
    <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-6">
      <h2 className="font-medium">Documentos (PDFs)</h2>
      <PdfBlock
        title="Tabela de preços"
        description="Máximo de três versões persistidas."
        kind="tabela_precos"
        rows={pdfs.filter((row) => row.kind === "tabela_precos")}
        projectId={projectId}
        onChange={() => queryClient.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "pdfs"] })}
      />
      <PdfBlock
        title="Manuais / memorial / apresentação"
        description="Documentos comerciais do empreendimento."
        kind="manual"
        rows={pdfs.filter((row) => row.kind === "manual")}
        projectId={projectId}
        onChange={() => queryClient.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "pdfs"] })}
      />
    </section>
  );
}

function PdfBlock({ title, description, kind, rows, projectId, onChange }: {
  title: string;
  description: string;
  kind: "tabela_precos" | "manual";
  rows: PdfRow[];
  projectId: string;
  onChange: () => Promise<unknown> | unknown;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      const next: Record<string, string> = {};
      for (const row of rows) {
        try {
          const result = await signTenantLaunchMedia({
            data: {
              projectId,
              resource: "pdf",
              resourceId: row.id,
            },
          });
          if (result.url) next[row.id] = result.url;
        } catch {
          // Signed URL is presentation only and never metadata authority.
        }
      }
      if (active) setSigned(next);
    })();
    return () => { active = false; };
  }, [projectId, rows]);

  async function uploadPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Envie apenas arquivos PDF.");
      return;
    }

    setUploading(true);
    try {
      const target = await createUploadTarget({
        data: {
          domain: "lancamento-pdf",
          entityId: projectId,
          variant: kind,
          originalFileName: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });
      const { error } = await supabase.storage
        .from(target.bucket)
        .upload(target.path, file, {
          upsert: false,
          contentType: "application/pdf",
        });
      if (error) throw error;
      await consumeTenantLaunchPdf({
        data: {
          projectId,
          targetId: target.targetId,
          kind,
          title: documentTitle || file.name,
        },
      });
      setDocumentTitle("");
      await onChange();
      toast.success("PDF registrado por provenance.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no upload do PDF.");
    } finally {
      setUploading(false);
    }
  }

  const removeMutation = useMutation({
    mutationFn: (row: PdfRow) => adminRemoverPdfLancamento({ data: { id: row.id } }),
    onSuccess: async () => {
      await onChange();
      toast.success("PDF removido.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Título do documento (opcional)"
            value={documentTitle}
            onChange={(event) => setDocumentTitle(event.target.value)}
          />
        </div>
        <Button type="button" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Upload className="size-4 mr-1" />}
          Enviar PDF
        </Button>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={uploadPdf} />
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-foreground/10 rounded">Nenhum documento ainda.</p>
      ) : (
        <ul className="divide-y divide-foreground/5 border border-foreground/5 rounded">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-3 p-3">
              <FileText className="size-5 text-gold" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {row.titulo ?? "Documento"}
                  {kind === "tabela_precos" && index === 0 && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">Atual</span>}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString("pt-BR")} • {humanSize(row.tamanho_bytes)}</p>
              </div>
              <div className="flex gap-1">
                {signed[row.id] && (
                  <>
                    <Button asChild size="icon" variant="ghost" title="Visualizar"><a href={signed[row.id]} target="_blank" rel="noreferrer"><Eye className="size-4" /></a></Button>
                    <Button asChild size="icon" variant="ghost" title="Baixar"><a href={signed[row.id]} download><Download className="size-4" /></a></Button>
                  </>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  title="Remover"
                  onClick={() => window.confirm("Remover este PDF?") && removeMutation.mutate(row)}
                >
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

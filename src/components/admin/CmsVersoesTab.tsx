import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarVersoes,
  listarRascunhosPendentes,
  restaurarVersao,
  publicarRascunho,
  descartarRascunho,
  type SiteVersionRow,
} from "@/lib/api/site-versions.functions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { History, Undo2, Rocket, Trash2, RefreshCw } from "lucide-react";

const KEYS: { value: string; label: string }[] = [
  { value: "branding", label: "Logo & Marca" },
  { value: "branding_v2", label: "Branding Dinâmico" },
  { value: "empresa", label: "Empresa" },
  { value: "footer", label: "Rodapé" },
  { value: "seo_global", label: "SEO Global" },
  { value: "home_hero", label: "Home — Hero" },
  { value: "home_secoes", label: "Home — Seções" },
  { value: "home_diferenciais", label: "Home — Diferenciais" },
  { value: "home_depoimentos", label: "Home — Depoimentos" },
  { value: "pagina_sobre", label: "Página Sobre" },
  { value: "pagina_contato", label: "Página Contato" },
  { value: "pagina_anuncie", label: "Página Anuncie" },
  { value: "pagina_lancamentos", label: "Página Lançamentos" },
  { value: "contato", label: "Contato (global)" },
];

type Key = typeof KEYS[number]["value"];

const KEY_LABEL = Object.fromEntries(KEYS.map((k) => [k.value, k.label]));

function statusBadge(status: SiteVersionRow["status"]) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Rascunho", className: "bg-amber-100 text-amber-900 border-amber-300" },
    published: { label: "Publicado", className: "bg-emerald-100 text-emerald-900 border-emerald-300" },
    archived: { label: "Arquivado", className: "bg-slate-100 text-slate-700 border-slate-300" },
  };
  const s = map[status] ?? map.archived;
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

export function CmsVersoesTab() {
  const qc = useQueryClient();
  const [key, setKey] = useState<Key>("home_hero");

  const pendentes = useQuery({
    queryKey: ["site-drafts-pendentes"],
    queryFn: () => listarRascunhosPendentes(),
  });

  const versoes = useQuery({
    queryKey: ["site-versoes", key],
    queryFn: () => listarVersoes({ data: { key: key as never } }),
  });

  const publicar = useMutation({
    mutationFn: (k: Key) => publicarRascunho({ data: { key: k as never } }),
    onSuccess: () => {
      toast.success("Rascunho publicado.");
      qc.invalidateQueries({ queryKey: ["site-versoes"] });
      qc.invalidateQueries({ queryKey: ["site-drafts-pendentes"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const descartar = useMutation({
    mutationFn: (k: Key) => descartarRascunho({ data: { key: k as never } }),
    onSuccess: () => {
      toast.success("Rascunho descartado.");
      qc.invalidateQueries({ queryKey: ["site-versoes"] });
      qc.invalidateQueries({ queryKey: ["site-drafts-pendentes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restaurar = useMutation({
    mutationFn: (id: string) => restaurarVersao({ data: { id } }),
    onSuccess: (res) => {
      toast.success("Versão restaurada como rascunho — publique para aplicar.");
      qc.invalidateQueries({ queryKey: ["site-versoes"] });
      qc.invalidateQueries({ queryKey: ["site-drafts-pendentes"] });
      if (res?.key) setKey(res.key as Key);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const drafts = pendentes.data ?? [];

  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-6">
      <div>
        <h3 className="font-display text-xl">Versões e Publicação</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Cada "Salvar" nas abas do CMS publica imediatamente e gera um snapshot histórico automático.
          Você pode restaurar qualquer versão anterior (vira um rascunho) e publicá-la em 1 clique.
        </p>
      </div>

      {/* Rascunhos pendentes */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <History className="size-4 text-amber-700" />
            <span className="font-medium text-amber-900">
              Rascunhos pendentes ({drafts.length})
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => pendentes.refetch()}>
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum rascunho aguardando publicação.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-2 bg-white/70 border border-amber-200 rounded px-3 py-2 text-sm">
                <span>
                  <strong>{KEY_LABEL[d.key] ?? d.key}</strong>{" "}
                  <span className="text-muted-foreground">
                    · criado {new Date(d.created_at).toLocaleString("pt-BR")}
                  </span>
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => publicar.mutate(d.key as Key)}
                    disabled={publicar.isPending}
                  >
                    <Rocket className="size-3.5 mr-1" />
                    Publicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => descartar.mutate(d.key as Key)}
                    disabled={descartar.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Histórico por chave */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Histórico da seção:</span>
          <Select value={key} onValueChange={(v) => setKey(v as Key)}>
            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {KEYS.map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {versoes.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (versoes.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico para esta seção ainda.</p>
        ) : (
          <div className="rounded-lg border border-foreground/10 divide-y divide-foreground/5">
            {(versoes.data ?? []).map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    {statusBadge(v.status)}
                    <span className="text-muted-foreground">
                      {new Date(v.created_at).toLocaleString("pt-BR")}
                    </span>
                    {v.notes && (
                      <span className="text-xs text-muted-foreground italic truncate">
                        — {v.notes}
                      </span>
                    )}
                  </div>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-primary hover:underline">
                      Ver conteúdo
                    </summary>
                    <pre className="mt-2 text-xs bg-muted/50 p-2 rounded max-h-64 overflow-auto">
                      {JSON.stringify(JSON.parse(v.value_json), null, 2)}
                    </pre>
                  </details>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restaurar.mutate(v.id)}
                  disabled={restaurar.isPending || v.status === "draft"}
                  title={v.status === "draft" ? "Já é o rascunho atual" : "Restaurar como rascunho"}
                >
                  <Undo2 className="size-3.5 mr-1" />
                  Restaurar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// LeadsList — lista densa (Bloco 2). Seleção via ?item= (sem navegar de rota).
import { Link, useNavigate } from "@tanstack/react-router";
import { Mail, Phone, MessageCircle } from "lucide-react";
import type { Lead } from "@/adapters/pipeline-legacy";
import type { PipelineSearch } from "./search-schema";

const STATUS_STYLES: Record<string, string> = {
  novo: "bg-red-500/15 text-red-600 dark:text-red-400",
  conversando: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  visita: "bg-lime-500/15 text-lime-600 dark:text-lime-400",
  proposta: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  ganho: "bg-emerald-500/25 text-emerald-700 dark:text-emerald-300",
  perdido: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  descartado: "bg-muted text-muted-foreground",
};

export function LeadsList({
  leads,
  selectedId,
  density,
  search,
}: {
  leads: Lead[];
  selectedId: string | null;
  density: "compact" | "comfortable";
  search: PipelineSearch;
}) {
  const navigate = useNavigate();
  const rowH = density === "compact" ? "py-2" : "py-3";
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-foreground/5 text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-3">
        <span>{leads.length} lead{leads.length === 1 ? "" : "s"}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {leads.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum lead com os filtros atuais.
          </div>
        )}
        <ul className="divide-y divide-foreground/5">
          {leads.map((l) => {
            const active = l.id === selectedId;
            const wa = l.telefone ? `https://wa.me/${l.telefone.replace(/\D/g, "")}` : null;
            return (
              <li key={l.id}>
                <Link
                  to="/admin/pipeline"
                  search={{ ...search, item: l.id }}
                  replace
                  resetScroll={false}
                  preload={false}
                  className={`block px-3 ${rowH} transition-colors hover:bg-muted/50 ${active ? "bg-primary/10 border-l-2 border-primary" : "border-l-2 border-transparent"}`}
                  onClick={(e) => {
                    // navegação síncrona sem reset: também suportar sem <Link>
                    if (e.metaKey || e.ctrlKey) return;
                    e.preventDefault();
                    navigate({ to: "/admin/pipeline", search: { ...search, item: l.id }, replace: true, resetScroll: false });
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{l.nome}</div>
                      {l.imovel?.titulo && (
                        <div className="text-xs text-muted-foreground truncate">🏠 {l.imovel.titulo}</div>
                      )}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${STATUS_STYLES[l.status] ?? STATUS_STYLES.novo}`}>
                      {l.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    {l.email && <Mail className="h-3 w-3" />}
                    {l.telefone && <Phone className="h-3 w-3" />}
                    {wa && <MessageCircle className="h-3 w-3" />}
                    <span className="ml-auto text-[10px] tabular-nums">
                      {new Date(l.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    {l.origem && (
                      <span className="text-[10px] uppercase tracking-wide">{l.origem}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

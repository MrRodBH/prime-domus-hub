import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListarImoveis, adminListarLeads, adminListarCorretores } from "@/lib/api/admin.functions";
import { Building2, Users, Inbox, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const imoveis = useQuery({ queryKey: ["admin", "imoveis"], queryFn: () => adminListarImoveis() });
  const leads = useQuery({ queryKey: ["admin", "leads"], queryFn: () => adminListarLeads() });
  const corretores = useQuery({ queryKey: ["admin", "corretores"], queryFn: () => adminListarCorretores() });

  const novos = leads.data?.filter((l) => l.status === "novo").length ?? 0;
  const ativos = imoveis.data?.filter((i) => i.status === "ativo").length ?? 0;
  const destaques = imoveis.data?.filter((i) => i.destaque).length ?? 0;

  const cards = [
    { label: "Imóveis ativos", value: ativos, icon: Building2, to: "/admin/imoveis" },
    { label: "Em destaque", value: destaques, icon: TrendingUp, to: "/admin/imoveis" },
    { label: "Leads novos", value: novos, icon: Inbox, to: "/admin/leads" },
    { label: "Corretores", value: corretores.data?.length ?? 0, icon: Users, to: "/admin/corretores" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do portfólio e dos leads recebidos.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to} className="bg-card border border-foreground/5 rounded-lg p-5 hover:border-gold transition-colors">
              <Icon className="size-5 text-gold mb-3" strokeWidth={1.5} />
              <p className="text-3xl font-display">{c.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{c.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg p-6">
        <h2 className="font-display text-xl mb-4">Últimos leads</h2>
        <div className="space-y-3">
          {(leads.data ?? []).slice(0, 5).map((l) => (
            <div key={l.id} className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0">
              <div>
                <p className="font-medium text-sm">{l.nome}</p>
                <p className="text-xs text-muted-foreground">{l.email || l.telefone} · {l.origem}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-secondary">{l.status}</span>
            </div>
          ))}
          {leads.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lead ainda.</p>}
        </div>
      </div>
    </div>
  );
}

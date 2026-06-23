import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Building2, Sparkles, ArrowRight } from "lucide-react";
import { ImovelForm } from "@/components/admin/ImovelForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/imoveis/novo")({
  component: NovoImovel,
});

function NovoImovel() {
  const nav = useNavigate();
  const [tipo, setTipo] = useState<"pronto" | null>(null);

  if (tipo === "pronto") return <ImovelForm />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Novo imóvel</h1>
        <p className="text-sm text-muted-foreground mt-1">Selecione o tipo de cadastro</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setTipo("pronto")}
          className="text-left bg-card border border-foreground/10 rounded-lg p-6 hover:border-gold hover:shadow-md transition group"
        >
          <Building2 className="size-8 text-gold mb-4" strokeWidth={1.5} />
          <h2 className="font-display text-xl mb-1">Pronto para Morar</h2>
          <p className="text-sm text-muted-foreground mb-4">Imóvel de venda ou aluguel, cadastro tradicional.</p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gold group-hover:gap-2 transition-all">
            Continuar <ArrowRight className="size-3" />
          </span>
        </button>

        <Link
          to="/admin/lancamentos/novo"
          className="text-left bg-card border border-foreground/10 rounded-lg p-6 hover:border-gold hover:shadow-md transition group"
        >
          <Sparkles className="size-8 text-gold mb-4" strokeWidth={1.5} />
          <h2 className="font-display text-xl mb-1">Lançamento</h2>
          <p className="text-sm text-muted-foreground mb-4">Empreendimento na planta ou em obras, com unidades, tabela de preços e condições.</p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gold group-hover:gap-2 transition-all">
            Continuar <ArrowRight className="size-3" />
          </span>
        </Link>
      </div>

      <Button variant="outline" onClick={() => nav({ to: "/admin/imoveis" })}>Voltar</Button>
    </div>
  );
}

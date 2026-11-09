// Compatível com o PainelLayout do RM Prime: o menu/cabeçalho vêm do TenantPainelShell;
// aqui ficam a descrição e as ações da página, no mesmo espaçamento do original.
import type { ReactNode } from "react";
export function PainelLayout({ descricao, acoes, children }: { titulo?: string; descricao?: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <>
      {descricao || acoes ? (
        <div className="-mt-2 mb-6 flex flex-wrap items-center justify-between gap-4">
          {descricao ? <p className="text-sm text-muted-foreground">{descricao}</p> : <span />}
          <div className="flex items-center gap-2">{acoes}</div>
        </div>
      ) : null}
      {children}
    </>
  );
}

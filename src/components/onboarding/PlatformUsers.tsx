import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { superListUsers, superDeleteUser } from "@/lib/api/super.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PlatformUsers() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; email: string } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["platform-users", page], queryFn: () => superListUsers({ data: { page } }) });
  return <section aria-label="Usuários da plataforma" className="rounded-xl border bg-card p-5 space-y-4">
    <h2 className="font-display text-xl">Usuários da plataforma</h2>
    <p className="text-sm text-muted-foreground">Contas exclusivas da plataforma SaaS. Usuários vinculados a empresas são administrados apenas pelo Admin do respectivo tenant.</p>
    {query.isPending ? <p role="status">Carregando usuários…</p> : query.isError ? <div role="alert">Não foi possível carregar os usuários. <Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div> : <>
      {query.data.users.length === 0 && <p>Nenhuma conta exclusiva da plataforma nesta página.</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">E-mail</th><th className="text-left p-2">Papéis globais</th><th className="text-right p-2">Ações</th></tr></thead><tbody>
        {query.data.users.map(u => <tr key={u.id} className="border-t"><td className="p-2">{u.email || "Sem e-mail"}{u.id === query.data.currentUserId ? " (sua conta)" : ""}</td><td className="p-2">{u.roles.join(", ") || "Sem papel global"}</td><td className="text-right p-2"><Button variant="outline" disabled={pending} onClick={() => { setSelected({ id: u.id, email: u.email || u.id }); setConfirmation(""); setError(""); }}>Excluir usuário</Button></td></tr>)}
      </tbody></table></div>
      <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 1 || pending} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page}</span><Button variant="outline" disabled={!query.data.hasNext || pending} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>
    </>}
    {selected && <form className="rounded-lg border p-4 space-y-3" onSubmit={async e => {
      e.preventDefault(); setPending(true); setError("");
      try {
        const result = await superDeleteUser({ data: { userId: selected.id, confirmationEmail: confirmation } });
        setSelected(null); await qc.invalidateQueries({ queryKey: ["platform-users"] });
        await qc.invalidateQueries({ queryKey: ["super-kpis"] });
        if (result.self) window.location.assign("/auth");
      } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir a conta."); }
      finally { setPending(false); }
    }}>
      <h3 className="font-semibold">Excluir definitivamente {selected.email}</h3>
      <p className="text-sm">A conta perderá o acesso à plataforma. A exclusão da sua própria conta encerra seu acesso administrativo. Não há transferência automática de propriedade.</p>
      <label className="grid gap-1">Digite o e-mail ou identificador exibido para confirmar<Input type="text" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={pending || confirmation.toLowerCase() !== selected.email.toLowerCase()}>{pending ? "Excluindo…" : "Confirmar exclusão definitiva"}</Button><Button type="button" variant="outline" disabled={pending} onClick={() => setSelected(null)}>Cancelar</Button></div>
    </form>}
  </section>;
}

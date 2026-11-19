// Tela "Usuários e permissões" aprovada da RM Prime, alimentada pelas operações canônicas de membros do tenant
// (convite, troca de papel, suspensão/reativação) — sem criar contas com senha nem ler tabelas diretamente.
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Shield, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { PainelLayout } from "@/components/painel-rm/PainelLayout";
import { useRmCrmPapel } from "@/components/painel-rm/useRmCrmPapel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  changeTenantMemberRole, inviteTenantMember, listTenantMemberships, reactivateTenantMember, suspendTenantMember,
  type TenantMembershipView,
} from "@/lib/api/tenant-lifecycle.functions";
import { listarPerfis } from "@/lib/api/rbac.functions";
import type { NonOwnerTenantRole } from "@/lib/api/commercial/membership-mutation-types";

const campo = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring";
export const ROTULOS_PAPEL: Record<string, string> = {
  owner: "Administrador", admin: "Administrador", manager: "Gestor", broker: "Corretor",
  captador: "Captador", secretaria: "Secretária", viewer: "Consulta",
};
const OPCOES: NonOwnerTenantRole[] = ["broker", "manager", "captador", "secretaria", "viewer", "admin"];
const STATUS: Record<string, string> = { invited: "Convite enviado", suspended: "Inativo", revoked: "Removido" };

export function UsuariosPage() {
  const { ehAdminOuGestor } = useRmCrmPapel();
  const qc = useQueryClient();
  const [novoAberto, setNovoAberto] = useState(false);
  const [edicao, setEdicao] = useState<TenantMembershipView | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["tenant-memberships"], queryFn: () => listTenantMemberships() });
  const perfis = useQuery({ queryKey: ["rbac", "perfis"], queryFn: () => listarPerfis(), enabled: novoAberto });
  const usuarios = (data ?? []).filter((u) => u.status !== "revoked");
  const recarregar = () => qc.invalidateQueries({ queryKey: ["tenant-memberships"] });
  const erro = (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível concluir.");

  const criar = useMutation({
    mutationFn: (v: { name: string; email: string; targetRole: NonOwnerTenantRole; perfil: string }) => inviteTenantMember({ data: { name: v.name, email: v.email, targetRole: v.targetRole, profileIds: [v.perfil], resend: false } }),
    onSuccess: async () => { await recarregar(); setNovoAberto(false); toast.success("Convite enviado. O usuário define a senha pelo e-mail."); },
    onError: erro,
  });
  const atualizar = useMutation({
    mutationFn: async (v: { u: TenantMembershipView; papel: NonOwnerTenantRole; ativo: boolean }) => {
      const ativoAtual = v.u.status === "active";
      if (!v.u.isOwner && v.papel !== v.u.role) await changeTenantMemberRole({ data: { targetUserId: v.u.userId, targetRole: v.papel } });
      if (!v.u.isOwner && v.ativo !== ativoAtual && v.u.status !== "invited") {
        if (v.ativo) await reactivateTenantMember({ data: { targetUserId: v.u.userId } });
        else await suspendTenantMember({ data: { targetUserId: v.u.userId } });
      }
    },
    onSuccess: async () => { await recarregar(); setEdicao(null); toast.success("Usuário atualizado."); },
    onError: erro,
  });

  function aoCriar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    criar.mutate({ name: String(f.get("nome")), email: String(f.get("email")), targetRole: String(f.get("papel")) as NonOwnerTenantRole, perfil: String(f.get("perfil")) });
  }
  function aoAtualizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!edicao) return; const f = new FormData(e.currentTarget);
    atualizar.mutate({ u: edicao, papel: String(f.get("papel") ?? edicao.role) as NonOwnerTenantRole, ativo: f.get("ativo") === "on" });
  }

  if (!ehAdminOuGestor) return <PainelLayout titulo="Usuários"><div className="superficie-cartao p-8 text-center"><Shield className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Acesso exclusivo para administradores.</p></div></PainelLayout>;
  const bloqueado = edicao?.isOwner ?? false;
  return <PainelLayout titulo="Usuários e permissões" descricao="Controle quem acessa o painel e o nível de permissão." acoes={<Button onClick={() => setNovoAberto(true)}><Plus className="mr-2 h-4 w-4" />Novo usuário</Button>}>
    {isLoading ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : <div className="overflow-hidden rounded-md border border-border bg-card"><div className="divide-y divide-border">{usuarios.map((u) => { const ativo = u.status === "active"; return <div key={u.userId} className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-center gap-3">{ativo ? <UserCheck className="h-5 w-5 text-primary" /> : <UserX className="h-5 w-5 text-muted-foreground" />}<div className="min-w-0"><p className="truncate font-medium">{u.name || "Sem nome"}</p><p className="truncate text-sm text-muted-foreground">{u.email}</p></div></div><div className="flex items-center gap-3"><Badge variant={ativo ? "default" : "secondary"}>{ativo ? ROTULOS_PAPEL[u.role] ?? u.role : STATUS[u.status] ?? u.status}</Badge><Button variant="outline" size="sm" onClick={() => setEdicao(u)}>Editar</Button></div></div>; })}</div></div>}
    <Dialog open={novoAberto} onOpenChange={setNovoAberto}><DialogContent><DialogHeader><DialogTitle>Novo usuário</DialogTitle><DialogDescription>Convide um integrante da equipe. Ele recebe um e-mail para definir a própria senha.</DialogDescription></DialogHeader><form onSubmit={aoCriar} className="grid gap-4"><div><Label htmlFor="novo-nome">Nome</Label><Input id="novo-nome" name="nome" required minLength={2} className="mt-2" /></div><div><Label htmlFor="novo-email">E-mail</Label><Input id="novo-email" name="email" type="email" required className="mt-2" /></div><div><Label htmlFor="novo-papel">Permissão</Label><select id="novo-papel" name="papel" defaultValue="broker" className={`${campo} mt-2`}>{OPCOES.map((p) => <option key={p} value={p}>{ROTULOS_PAPEL[p]}</option>)}</select></div><div><Label htmlFor="novo-perfil">Perfil de acesso</Label><select id="novo-perfil" name="perfil" required className={`${campo} mt-2`}>{((perfis.data ?? []) as { id: string; nome: string }[]).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div><Button type="submit" disabled={criar.isPending || !perfis.data?.length}>{criar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Enviar convite</Button></form></DialogContent></Dialog>
    <Dialog open={Boolean(edicao)} onOpenChange={(o) => !o && setEdicao(null)}><DialogContent><DialogHeader><DialogTitle>Editar acesso</DialogTitle><DialogDescription>Atualize a permissão e o acesso do integrante.</DialogDescription></DialogHeader>{edicao ? <form key={edicao.userId} onSubmit={aoAtualizar} className="grid gap-5"><div><Label>Nome</Label><Input value={edicao.name ?? ""} disabled className="mt-2" /></div><div><Label>E-mail de acesso</Label><Input value={edicao.email ?? ""} disabled className="mt-2" /></div><div><Label htmlFor="editar-papel">Permissão</Label><select id="editar-papel" name="papel" defaultValue={edicao.isOwner ? "admin" : edicao.role} className={`${campo} mt-2`} disabled={bloqueado}>{OPCOES.map((p) => <option key={p} value={p}>{ROTULOS_PAPEL[p]}</option>)}</select>{bloqueado ? <p className="mt-1 text-xs text-muted-foreground">O responsável pela empresa não pode ter a permissão alterada aqui.</p> : null}</div><label className="flex items-center justify-between rounded-md border border-border p-4 text-sm"><span><strong className="block">Acesso ativo</strong><span className="text-muted-foreground">{edicao.status === "invited" ? "Aguardando o usuário aceitar o convite." : "Permite entrar e trabalhar no painel."}</span></span><Switch name="ativo" defaultChecked={edicao.status === "active"} disabled={bloqueado || edicao.status === "invited"} /></label>{bloqueado || edicao.status === "invited" ? <input type="hidden" name="ativo" value={edicao.status === "active" ? "on" : ""} /> : null}<Button type="submit" disabled={atualizar.isPending}>{atualizar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar alterações</Button></form> : null}</DialogContent></Dialog>
  </PainelLayout>;
}

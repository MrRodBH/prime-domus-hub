import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  changeTenantMemberRole,
  inviteTenantMember,
  listTenantMemberships,
  reactivateTenantMember,
  revokeTenantMember,
  suspendTenantMember,
  transferTenantOwnership,
  type TenantMembershipView,
} from "@/lib/api/tenant-lifecycle.functions";
import {
  listarPerfis,
  listarPerfisPorUsuario,
  setUserPerfis,
} from "@/lib/api/rbac.functions";
import {
  NON_OWNER_TENANT_ROLES,
  type NonOwnerTenantRole,
} from "@/lib/api/commercial/membership-mutation-types";
import { Crown, MailPlus, RefreshCw, ShieldCheck, UserMinus, UserRoundCog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/memberships")({ component: TenantMembershipsPage });

type MembershipAction =
  | { kind: "change_role"; targetUserId: string; targetRole: NonOwnerTenantRole }
  | { kind: "suspend"; targetUserId: string }
  | { kind: "reactivate"; targetUserId: string }
  | { kind: "revoke"; targetUserId: string }
  | { kind: "transfer_owner"; targetUserId: string }
  | { kind: "resend"; email: string; targetRole: NonOwnerTenantRole };

function TenantMembershipsPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<TenantMembershipView | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, NonOwnerTenantRole>>({});

  const membershipsQuery = useQuery({ queryKey: ["tenant-memberships"], queryFn: () => listTenantMemberships() });
  const profilesQuery = useQuery({ queryKey: ["rbac", "perfis"], queryFn: () => listarPerfis() });
  const assignmentsQuery = useQuery({ queryKey: ["rbac", "perfis-usuarios"], queryFn: () => listarPerfisPorUsuario() });

  const profileNamesByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of assignmentsQuery.data ?? []) {
      const profile = row.rbac_profiles;
      if (!profile) continue;
      const list = map.get(row.user_id) ?? [];
      list.push(profile.nome);
      map.set(row.user_id, list);
    }
    return map;
  }, [assignmentsQuery.data]);

  const actionMutation = useMutation({
    mutationFn: async (action: MembershipAction) => {
      switch (action.kind) {
        case "change_role": return changeTenantMemberRole({ data: { targetUserId: action.targetUserId, targetRole: action.targetRole } });
        case "suspend": return suspendTenantMember({ data: { targetUserId: action.targetUserId } });
        case "reactivate": return reactivateTenantMember({ data: { targetUserId: action.targetUserId } });
        case "revoke": return revokeTenantMember({ data: { targetUserId: action.targetUserId } });
        case "transfer_owner": return transferTenantOwnership({ data: { targetUserId: action.targetUserId } });
        case "resend": return inviteTenantMember({ data: { email: action.email, targetRole: action.targetRole, resend: true } });
      }
    },
    onSuccess: () => {
      toast.success("Lifecycle da membership atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["tenant-memberships"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant-selection", "selectable"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const memberships = membershipsQuery.data ?? [];
  const owner = memberships.find((member) => member.isOwner);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Membros do tenant</h1>
          <p className="text-sm text-muted-foreground">
            Membership role, status, ownership, perfis RBAC e equipes são contratos separados e server-authoritative.
          </p>
          {owner ? <p className="mt-1 text-xs text-muted-foreground">Owner atual: <span className="font-mono">{owner.email ?? owner.userId}</span></p> : null}
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild><Button><MailPlus className="mr-2 size-4" /> Convidar membro</Button></DialogTrigger>
          <InviteMemberDialog onDone={() => { setInviteOpen(false); void queryClient.invalidateQueries({ queryKey: ["tenant-memberships"] }); }} />
        </Dialog>
      </div>

      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        Novos acessos são criados exclusivamente por convite. Senha, tenant role e perfis nunca são definidos pelo client como autoridade.
      </div>

      {membershipsQuery.isPending || profilesQuery.isPending || assignmentsQuery.isPending ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">Carregando controle de acesso…</div>
      ) : membershipsQuery.isError || profilesQuery.isError || assignmentsQuery.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p>Não foi possível carregar memberships e perfis.</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => { void membershipsQuery.refetch(); void profilesQuery.refetch(); void assignmentsQuery.refetch(); }}><RefreshCw className="mr-2 size-4" /> Tentar novamente</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[1450px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Membership role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Perfis RBAC</th>
                <th className="px-4 py-3 text-left">Convidado</th>
                <th className="px-4 py-3 text-left">Aceito / ingresso</th>
                <th className="px-4 py-3 text-left">Suspenso / revogado</th>
                <th className="px-4 py-3 text-right">Ações permitidas</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((member) => {
                const draftRole = roleDrafts[member.userId] ?? asNonOwnerRole(member.role) ?? "viewer";
                const canChangeRole = !member.isOwner && member.status !== "revoked";
                const profileNames = profileNamesByUser.get(member.userId) ?? [];
                return (
                  <tr key={member.userId} className="border-t align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">{member.isOwner ? <Crown className="size-4 text-amber-600" /> : null}<span>{member.email ?? "E-mail indisponível"}</span></div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">{member.userId}</div>
                      {member.isOwner ? <Badge className="mt-2" variant="outline">owner protegido</Badge> : null}
                    </td>
                    <td className="px-4 py-3">
                      {member.isOwner ? <Badge variant="outline">owner</Badge> : (
                        <div className="flex items-center gap-2">
                          <Select value={draftRole} onValueChange={(value: NonOwnerTenantRole) => setRoleDrafts((current) => ({ ...current, [member.userId]: value }))} disabled={!canChangeRole || actionMutation.isPending}>
                            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{NON_OWNER_TENANT_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" disabled={!canChangeRole || draftRole === member.role || actionMutation.isPending} onClick={() => actionMutation.mutate({ kind: "change_role", targetUserId: member.userId, targetRole: draftRole })}>Salvar</Button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><MembershipStatusBadge status={member.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[260px] flex-wrap gap-1">{profileNames.length ? profileNames.map((name) => <Badge key={name} variant="secondary">{name}</Badge>) : <span className="text-xs text-muted-foreground">Sem perfil</span>}</div>
                      {!member.isOwner && member.status !== "revoked" ? <Button className="mt-2" size="sm" variant="outline" onClick={() => setProfileUser(member)}><UserRoundCog className="mr-1 size-3" /> Gerenciar perfis</Button> : null}
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDate(member.invitedAt)}</td>
                    <td className="space-y-1 px-4 py-3 text-xs"><div><strong>Aceito:</strong> {formatDate(member.acceptedAt)}</div><div><strong>Ingresso:</strong> {formatDate(member.joinedAt)}</div></td>
                    <td className="space-y-1 px-4 py-3 text-xs"><div><strong>Suspenso:</strong> {formatDate(member.suspendedAt)}</div><div><strong>Revogado:</strong> {formatDate(member.revokedAt)}</div></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {member.status === "invited" && member.email && !member.isOwner ? <Button size="sm" variant="outline" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ kind: "resend", email: member.email!, targetRole: asNonOwnerRole(member.role) ?? "viewer" })}><RefreshCw className="mr-1 size-3" /> Reenviar</Button> : null}
                        {member.status === "active" && !member.isOwner ? <Button size="sm" variant="outline" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ kind: "suspend", targetUserId: member.userId })}>Suspender</Button> : null}
                        {member.status === "suspended" && !member.isOwner ? <Button size="sm" variant="outline" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ kind: "reactivate", targetUserId: member.userId })}>Reativar</Button> : null}
                        {(member.status === "active" || member.status === "invited" || member.status === "suspended") && !member.isOwner ? <Button size="sm" variant="destructive" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ kind: "revoke", targetUserId: member.userId })}><UserMinus className="mr-1 size-3" /> Revogar</Button> : null}
                        {member.status === "active" && !member.isOwner ? <Button size="sm" variant="secondary" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ kind: "transfer_owner", targetUserId: member.userId })}><ShieldCheck className="mr-1 size-3" /> Tornar owner</Button> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {memberships.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Nenhuma membership encontrada.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}

      {profileUser ? (
        <ProfilesDialog
          member={profileUser}
          profiles={profilesQuery.data ?? []}
          assignedIds={(assignmentsQuery.data ?? []).filter((row) => row.user_id === profileUser.userId).map((row) => row.profile_id)}
          onClose={() => setProfileUser(null)}
          onDone={() => { setProfileUser(null); void queryClient.invalidateQueries({ queryKey: ["rbac", "perfis-usuarios"] }); void queryClient.invalidateQueries({ queryKey: ["rbac", "perfis"] }); }}
        />
      ) : null}
    </div>
  );
}

function ProfilesDialog({ member, profiles, assignedIds, onClose, onDone }: { member: TenantMembershipView; profiles: Array<{ id: string; nome: string; sistema: boolean }>; assignedIds: string[]; onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<string[]>(assignedIds);
  const mutation = useMutation({
    mutationFn: () => setUserPerfis({ data: { user_id: member.userId, profile_ids: selected } }),
    onSuccess: () => { toast.success("Perfis do membro atualizados."); onDone(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Perfis RBAC</DialogTitle><DialogDescription>{member.email ?? member.userId}. Membership role e perfis são contratos independentes.</DialogDescription></DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
          {profiles.map((profile) => {
            const checked = selected.includes(profile.id);
            return <label key={profile.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={(value) => setSelected(value ? [...new Set([...selected, profile.id])] : selected.filter((id) => id !== profile.id))} /><span>{profile.nome}</span><Badge variant={profile.sistema ? "secondary" : "outline"}>{profile.sistema ? "sistema" : "tenant"}</Badge></label>;
          })}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>Salvar perfis</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteMemberDialog({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<NonOwnerTenantRole>("viewer");
  const mutation = useMutation({
    mutationFn: () => inviteTenantMember({ data: { email, targetRole: role, resend: false } }),
    onSuccess: (result) => { toast.success(result.deliveryMode === "automated_email" ? `Convite enviado para ${result.email}.` : `Convite interno criado para ${result.email}.`); onDone(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Convidar membro</DialogTitle><DialogDescription>O servidor resolve ou cria o usuário Auth, reserva o assento e persiste a membership como invited.</DialogDescription></DialogHeader>
      <div className="space-y-3">
        <div><Label>E-mail</Label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="usuario@empresa.com.br" /></div>
        <div><Label>Role</Label><Select value={role} onValueChange={(value: NonOwnerTenantRole) => setRole(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{NON_OWNER_TENANT_ROLES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <DialogFooter><Button disabled={!email || mutation.isPending} onClick={() => mutation.mutate()}>Enviar convite</Button></DialogFooter>
    </DialogContent>
  );
}

function asNonOwnerRole(role: string): NonOwnerTenantRole | null {
  return (NON_OWNER_TENANT_ROLES as readonly string[]).includes(role) ? role as NonOwnerTenantRole : null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function MembershipStatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "default" : status === "revoked" ? "destructive" : status === "suspended" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

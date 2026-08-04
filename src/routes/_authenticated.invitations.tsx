import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { acceptTenantInvitation, listMyTenantInvitations } from "@/lib/api/tenant-lifecycle.functions";
import { setSelectedTenantId } from "@/integrations/supabase/tenant-selection-state";
import { Building2, CheckCircle2, MailOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invitations")({
  component: InvitationsPage,
});

function InvitationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invitationsQuery = useQuery({
    queryKey: ["tenant-invitations", "mine"],
    queryFn: () => listMyTenantInvitations(),
  });

  const acceptMutation = useMutation({
    mutationFn: (tenantId: string) => acceptTenantInvitation({ data: { tenantId } }),
    onSuccess: (result) => {
      setSelectedTenantId(result.tenantId);
      toast.success("Convite aceito. A organização está ativa para sua conta.");
      void queryClient.invalidateQueries({ queryKey: ["tenant-invitations", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant-selection", "selectable"] });
      navigate({ to: "/admin" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const invitations = invitationsQuery.data ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Convites de organizações</h1>
        <p className="text-sm text-muted-foreground">
          Somente convites vinculados ao seu usuário autenticado podem ser aceitos.
        </p>
      </div>

      {invitationsQuery.isPending ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          Carregando convites…
        </div>
      ) : invitationsQuery.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p>Não foi possível carregar seus convites.</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void invitationsQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : invitations.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center">
          <MailOpen className="mx-auto size-9 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Nenhum convite pendente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando uma organização convidar seu usuário, ela aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div key={invitation.tenantId} className="rounded-lg border bg-card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="rounded-md bg-primary/10 p-2 h-fit">
                  <Building2 className="size-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{invitation.tenantName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{invitation.tenantSlug}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">role: {invitation.role}</Badge>
                    <Badge variant="outline">status: invited</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Convidado em {formatDate(invitation.invitedAt)}
                  </div>
                </div>
              </div>
              <Button
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate(invitation.tenantId)}
              >
                <CheckCircle2 className="mr-2 size-4" />
                {acceptMutation.isPending ? "Aceitando…" : "Aceitar convite"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

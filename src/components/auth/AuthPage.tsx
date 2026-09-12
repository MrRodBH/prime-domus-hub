import { listMyInitialAdminInvitations } from "@/lib/api/initial-admin-setup.functions";
import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { meuAcessoSuperAdmin } from "@/lib/api/super.functions";
import { useLogout } from "@/components/auth/useLogout";
import logo from "@/assets/logo-rm-prime.png";
import { useQueryClient } from '@tanstack/react-query';
import { clearSelectedTenantId, setSelectedTenantId } from '@/integrations/supabase/tenant-selection-state';
import { clearImpersonationTenantId } from '@/integrations/supabase/impersonation-state';
import { setCurrentTenantId } from '@/lib/tenant-cache';
import { listSelectableTenants } from '@/lib/api/tenant-selection.functions';
import { meuTenantWorkspace } from '@/lib/api/tenant.functions';
import { tenantReturnPath } from '@/lib/auth/tenant-login-navigation';

export function AuthPage({ tenantSlug, next }: { tenantSlug?: string; next?: string } = {}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const mounted = useRef(true);
  const exit = useLogout();
  const queryClient = useQueryClient();

  async function openWorkspace(isCurrent = () => mounted.current) {
    const isSuper = await meuAcessoSuperAdmin();
    if (!isCurrent()) return;
    if (tenantSlug && isSuper === true) {
      setMessage('Esta sessão é de gestão da plataforma. Saia desta conta e entre com a conta cadastrada na empresa.');
      return;
    }
    const pendingSetup = isSuper === true ? [] : await listMyInitialAdminInvitations();
    if (!isCurrent()) return;
    if (tenantSlug && !pendingSetup.length) {
      const choices = await listSelectableTenants();
      if (!isCurrent()) return;
      const matches = choices.filter(choice => choice.slug === tenantSlug);
      if (matches.length !== 1) {
        clearSelectedTenantId();
        setMessage('Esta conta não tem acesso ativo à empresa deste endereço. Saia e entre com a conta correta.');
        return;
      }
      // Use only an active server-returned choice; requireTenant revalidates it.
      setSelectedTenantId(matches[0].tenantId);
      let workspace;
      try { workspace = await meuTenantWorkspace(); }
      catch (error) { clearSelectedTenantId(); throw error; }
      if (!isCurrent()) return;
      if (workspace.slug !== tenantSlug || workspace.id !== matches[0].tenantId) {
        clearSelectedTenantId();
        setMessage('Não foi possível confirmar o acesso a esta empresa. Entre novamente.');
        return;
      }
      await navigate({ to: tenantReturnPath(tenantSlug, next), replace: true });
      return;
    }
    if (isCurrent()) await navigate({ to: isSuper === true ? "/super" : pendingSetup.length ? "/invitations" : "/admin", replace: true });
  }

  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error && error.name !== "AuthSessionMissingError") throw error;
        if (!active) return;
        if (data.user) {
          setAuthenticated(true);
          await openWorkspace(() => active && mounted.current);
        }
      } catch {
        if (active) setMessage("Não foi possível verificar seu acesso. Tente novamente.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [navigate, tenantSlug, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current || loading || exit.busy) return;
    pending.current = true;
    setLoading(true);
    setMessage("");
    let signedIn = authenticated;
    try {
      if (!authenticated) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error || !data.user || !data.session) throw Error("login_failed");
        signedIn = true;
        clearSelectedTenantId();
        clearImpersonationTenantId();
        setCurrentTenantId(null);
        await queryClient.cancelQueries();
        queryClient.clear();
        if (!mounted.current) return;
        setAuthenticated(true);
        setPassword("");
      }
      await openWorkspace();
    } catch {
      if (mounted.current)
        setMessage(
          signedIn
            ? "Sua conta entrou, mas não foi possível abrir o painel. Tente acessar novamente ou saia para trocar de conta."
            : "Não foi possível entrar. Confira seu e-mail e senha. Se perdeu a senha, solicite a recuperação ao suporte.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-10">
          <img src={logo} alt="RM Prime Imóveis" className="h-40 w-auto" />
        </Link>
        <div className="bg-card border border-foreground/5 rounded-lg p-8 shadow-soft">
          <h1 className="font-display text-3xl mb-2">{tenantSlug ? 'Acesso da empresa' : 'Acesso à plataforma'}</h1>
          <p className="text-sm text-muted-foreground mb-8">{tenantSlug ? 'Entre com sua conta para acessar o painel da empresa.' : 'Gestão do RM Prime SaaS.'}</p>
          <p className="mb-4 text-sm text-muted-foreground">
            {tenantSlug ? 'Use o e-mail e a senha cadastrados para você nesta empresa.' : 'Entre com sua conta existente. As permissões de gestão são verificadas após o login.'}
          </p>
          <form onSubmit={handleSubmit} aria-label="Acesso administrativo" className="space-y-4">
            {!authenticated && (
              <>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <PasswordInput
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </>
            )}
            {message && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}
            {loading && (
              <p role="status" className="text-sm">
                Verificando acesso…
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || exit.busy}>
              {loading
                ? "Entrando…"
                : authenticated
                  ? "Tentar acessar o painel novamente"
                  : "Entrar"}
            </Button>
          </form>
          {authenticated && (
            <Button
              className="mt-3 w-full"
              variant="outline"
              disabled={exit.busy || loading}
              onClick={async () => {
                if (await exit.logout()) {
                  setAuthenticated(false);
                  setPassword("");
                  setMessage("");
                }
              }}
            >
              {exit.busy ? "Saindo…" : tenantSlug ? "Sair e entrar com outra conta" : "Sair da conta"}
            </Button>
          )}
          {exit.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {exit.error}
            </p>
          )}
        </div>
        <div className="mt-6 grid gap-2 text-center text-xs text-muted-foreground">
          {!tenantSlug && <Link
            to="/demonstracao"
            className="rounded-md border border-border bg-card px-4 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Explorar demonstração visual
          </Link>}
          <Link to="/" className="py-2 transition-colors hover:text-foreground">
            ← Voltar ao site institucional
          </Link>
        </div>
      </div>
    </div>
  );
}

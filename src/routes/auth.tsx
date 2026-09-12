import { listMyInitialAdminInvitations } from "@/lib/api/initial-admin-setup.functions";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
import { clearSelectedTenantId } from '@/integrations/supabase/tenant-selection-state';
import { clearImpersonationTenantId } from '@/integrations/supabase/impersonation-state';
import { setCurrentTenantId } from '@/lib/tenant-cache';

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso administrativo — RM Prime Imóveis" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
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
    const pendingSetup = isSuper === true ? [] : await listMyInitialAdminInvitations();
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
  }, [navigate]);

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
          <h1 className="font-display text-3xl mb-2">Painel administrativo</h1>
          <p className="text-sm text-muted-foreground mb-8">Acesso restrito à equipe RM Prime.</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Entre com sua conta existente. O acesso ao painel Super Admin depende da permissão
            confirmada pelo servidor. Os cadastros da demonstração não são transferidos
            automaticamente.
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
              {exit.busy ? "Saindo…" : "Sair da conta"}
            </Button>
          )}
          {exit.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {exit.error}
            </p>
          )}
        </div>
        <div className="mt-6 grid gap-2 text-center text-xs text-muted-foreground">
          <Link
            to="/demonstracao"
            className="rounded-md border border-border bg-card px-4 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Explorar demonstração visual
          </Link>
          <Link to="/" className="py-2 transition-colors hover:text-foreground">
            ← Voltar ao site institucional
          </Link>
        </div>
      </div>
    </div>
  );
}

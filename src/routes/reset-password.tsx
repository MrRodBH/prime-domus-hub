import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo-rm-prime.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Definir senha — RM Prime Imóveis" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // 1) Recovery via hash fragment (#access_token=...&refresh_token=...&type=recovery)
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        const type = hash.get("type");
        const error_description = hash.get("error_description");
        if (error_description) {
          toast.error(decodeURIComponent(error_description));
        }
        if (access_token && refresh_token && (type === "recovery" || type === "invite" || !type)) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!cancelled) {
            if (error) {
              toast.error("Link inválido ou expirado.");
              setSessionOk(false);
            } else {
              setSessionOk(true);
              // limpa o hash para não vazar tokens
              window.history.replaceState(null, "", window.location.pathname);
            }
            setReady(true);
            return;
          }
        }
      }

      // 2) Já existe sessão (caso o usuário tenha navegado de volta)
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setSessionOk(!!data.session);
        setReady(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Encerra a sessão de recuperação para forçar login com a nova senha
    await supabase.auth.signOut();
    setDone(true);
    toast.success("Senha definida com sucesso.");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-10">
          <img src={logo} alt="RM Prime Imóveis" className="h-40 w-auto" />
        </Link>
        <div className="bg-card border border-foreground/5 rounded-lg p-8 shadow-soft">
          {!ready ? (
            <p className="text-sm text-muted-foreground">Validando link…</p>
          ) : done ? (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl mb-2">Senha definida</h1>
                <p className="text-sm text-muted-foreground">
                  Sua nova senha foi salva. Use-a para acessar o painel.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
                Ir para Login
              </Button>
            </div>
          ) : !sessionOk ? (
            <div className="space-y-4">
              <h1 className="font-display text-3xl mb-2">Link inválido</h1>
              <p className="text-sm text-muted-foreground">
                Este link de redefinição é inválido ou já expirou. Solicite um novo
                acesso ao administrador.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>
                Ir para Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h1 className="font-display text-3xl mb-2">Defina sua senha</h1>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie uma senha definitiva para acessar o painel da RM Prime.
                </p>
              </div>
              <div>
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando…" : "Salvar senha"}
              </Button>
            </form>
          )}
        </div>
        <p className="text-center mt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            ← Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const passwordValid =
    password.length >= 6 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);

  function translatePasswordError(error: { message?: string; code?: string }) {
    const code = (error.code ?? "").toLowerCase();
    const msg = (error.message ?? "").toLowerCase();
    const all = `${code} ${msg}`;
    if (all.includes("pwned") || all.includes("hibp") || all.includes("compromised") || all.includes("data breach")) {
      return "Esta senha apareceu em vazamentos públicos de dados e não pode ser usada. Escolha outra senha (sugestão: combine letras maiúsculas, minúsculas, números e um símbolo).";
    }
    if (all.includes("short") || all.includes("at least") || all.includes("minimum") || all.includes("length") || all.includes("6 characters")) {
      return "Sua senha deve ter no mínimo 6 caracteres.";
    }
    if (all.includes("weak") || all.includes("easy to guess")) {
      return "Senha muito fraca. Use letras, números e, de preferência, um símbolo.";
    }
    if (all.includes("same_password") || all.includes("should be different")) {
      return "A nova senha deve ser diferente da senha atual.";
    }
    if (all.includes("session") || all.includes("jwt") || all.includes("expired") || all.includes("invalid")) {
      return "Sessão de redefinição expirou. Solicite um novo link de acesso.";
    }
    return error.message
      ? `Não foi possível definir a senha: ${error.message}`
      : "Não foi possível definir a senha. Tente novamente ou solicite um novo link ao administrador.";
  }


  async function redirectToDashboard() {
    await navigate({ to: "/admin", replace: true });
    window.setTimeout(() => {
      if (window.location.pathname !== "/admin") window.location.assign("/admin");
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!passwordValid) {
      setFormError("Sua senha deve possuir pelo menos 6 caracteres contendo letras e números.");
      return;
    }
    if (password !== confirm) {
      setFormError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setFormError(translatePasswordError(error));
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (email) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        const { data: current } = await supabase.auth.getSession();
        if (!current.session) {
          setLoading(false);
          setFormError("Senha definida, mas não foi possível iniciar a sessão automaticamente. Use o login com a nova senha.");
          return;
        }
      }
    }
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      const { data: current } = await supabase.auth.getSession();
      if (!current.session) {
        setLoading(false);
        setFormError("Senha definida, mas não foi possível iniciar a sessão automaticamente. Use o login com a nova senha.");
        return;
      }
    }
    toast.success("Senha definida com sucesso. Redirecionando…");
    setDone(true);
    await redirectToDashboard();
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
                  Você já está autenticado. Redirecionando para o painel…
                </p>
              </div>
              <Button className="w-full" onClick={() => redirectToDashboard()}>
                Ir para o painel
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
                  minLength={6}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
                  autoComplete="new-password"
                  aria-describedby="password-help"
                />
                <p
                  id="password-help"
                  className={`text-xs mt-1 ${
                    password.length === 0
                      ? "text-muted-foreground"
                      : passwordValid
                        ? "text-emerald-600"
                        : "text-destructive"
                  }`}
                >
                  Sua senha deve possuir pelo menos 6 caracteres contendo letras e números.
                </p>
              </div>
              <div>
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setFormError(null); }}
                  autoComplete="new-password"
                />
                {confirm.length > 0 && confirm !== password && (
                  <p className="text-xs mt-1 text-destructive">As senhas não coincidem.</p>
                )}
              </div>
              {formError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {formError}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || !passwordValid || password !== confirm}>
                {loading ? "Salvando…" : "Salvar senha e entrar"}
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


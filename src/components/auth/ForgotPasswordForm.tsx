import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Same allowlisted destination as the existing support recovery flow.
export const RECOVERY_REDIRECT_URL = 'https://realone.com.br/reset-password';
const emailSchema = z.string().trim().email().max(254);

export function ForgotPasswordForm({ initialEmail = '', onBack }: {
  initialEmail?: string; onBack: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const pending = useRef(false);
  const retryAt = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((retryAt.current - Date.now()) / 1000)));
    }, 1000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, []);

  async function requestLink(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || Date.now() < retryAt.current) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError('Informe um e-mail válido.'); return; }
    pending.current = true;
    setBusy(true); setError(''); setAccepted(false);
    try {
      const result = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: RECOVERY_REDIRECT_URL,
      });
      if (!mounted.current) return;
      if (result.error) {
        setError(result.error.status === 429
          ? 'Muitas solicitações. Aguarde antes de pedir outro link.'
          : 'Não foi possível confirmar a solicitação. Aguarde e tente novamente.');
      } else {
        setAccepted(true);
      }
    } catch {
      if (mounted.current) setError('Não foi possível confirmar a solicitação. Verifique sua conexão e aguarde antes de tentar novamente.');
    } finally {
      pending.current = false;
      // UX pacing only; Supabase enforces authoritative server rate limits.
      retryAt.current = Date.now() + 60_000;
      if (mounted.current) { setBusy(false); setRemaining(60); }
    }
  }

  return <div className="space-y-5">
    <div>
      <h1 className="font-display text-3xl mb-2">Recuperar senha</h1>
      <p className="text-sm text-muted-foreground">Informe o e-mail da sua conta para receber um link e criar uma nova senha.</p>
    </div>
    <form onSubmit={requestLink} aria-label="Recuperar senha" className="space-y-4">
      <div>
        <Label htmlFor="recovery-email">E-mail da conta</Label>
        <Input id="recovery-email" type="email" required maxLength={254}
          autoComplete="email" autoFocus value={email} disabled={busy}
          onChange={event => { setEmail(event.target.value); setAccepted(false); setError(''); }} />
      </div>
      {accepted && <p role="status" className="text-sm">Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha. Confira a caixa de entrada e o spam. Use o link mais recente.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || remaining > 0}>
        {busy ? 'Solicitando…' : remaining > 0 ? `Aguarde ${remaining}s para reenviar` : accepted ? 'Reenviar link' : 'Enviar link de recuperação'}
      </Button>
    </form>
    <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={onBack}>Voltar ao login</Button>
  </div>;
}

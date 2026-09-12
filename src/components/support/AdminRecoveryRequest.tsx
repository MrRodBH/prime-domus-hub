import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { supabase } from '@/integrations/supabase/client';
import { requestSupportAdminRecovery } from '@/lib/api/support-admin-recovery.functions';

export function AdminRecoveryRequest({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !confirmed) return;
    setBusy(true); setFeedback('');
    const id = requestId ?? crypto.randomUUID(); setRequestId(id);
    try {
      const current = await supabase.auth.getUser();
      if (current.error || !current.data.user?.email) throw Error('Entre novamente na plataforma.');
      const signed = await supabase.auth.signInWithPassword({ email: current.data.user.email, password });
      setPassword('');
      if (signed.error || signed.data.user?.id !== current.data.user.id)
        throw Error('Não foi possível confirmar sua senha da plataforma.');
      const result = await requestSupportAdminRecovery({ data: { caseId, email, requestId: id, confirmed: true } });
      const messages = {
        accepted: 'Solicitação aceita pelo serviço de e-mail. O Admin deve conferir a caixa de entrada e o spam; a entrega ainda não foi confirmada.',
        failed: 'O serviço não aceitou o envio. Aguarde antes de abrir uma nova solicitação.',
        unknown: 'Não foi possível confirmar o resultado do envio. Confira o atendimento antes de solicitar novamente.',
        already_requested: 'Esta solicitação já foi registrada. Nenhum novo e-mail foi enviado nesta tentativa.',
      };
      setFeedback(messages[result.status]);
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Não foi possível solicitar a recuperação.'); }
    finally { setPassword(''); setBusy(false); }
  }
  if (!open) return <Button className="mt-3" variant="outline" onClick={() => setOpen(true)}>Solicitar recuperação de senha do Admin</Button>;
  return <form className="mt-4 space-y-3 rounded-lg border p-4" onSubmit={submit}>
    <h4 className="font-medium">Recuperar acesso do Admin</h4>
    <p className="text-sm text-muted-foreground">Informe o e-mail cadastrado fornecido no atendimento. O link será enviado somente ao e-mail confirmado do Admin ativo desta empresa. O suporte não recebe a senha nem o link.</p>
    <label className="block text-sm">E-mail do Admin<input disabled={busy || !!requestId} required type="email" autoComplete="off" className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label className="block text-sm">Sua senha da plataforma<PasswordInput required autoComplete="current-password" disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></label>
    <label className="flex items-start gap-2 text-sm"><input required type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />Conferi a solicitação registrada neste atendimento e confirmo o envio do link de recuperação.</label>
    {feedback && <p role="status" className="text-sm">{feedback}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !confirmed}>{busy ? 'Solicitando…' : 'Confirmar e solicitar link'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => { setOpen(false); setPassword(''); setConfirmed(false); setRequestId(null); setFeedback(''); }}>Fechar</Button></div>
  </form>;
}

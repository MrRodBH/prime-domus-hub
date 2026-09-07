import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelectedTenantId } from '@/integrations/supabase/use-tenant-selection';
import { useImpersonation } from '@/integrations/supabase/use-impersonation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTenantContext } from '@/components/workspace/tenant/TenantContext';
import { createTenantLead, getTenantLeadAggregate, listTenantLeadProperties, listTenantLeadAssignees, assignTenantLead, createTenantLeadTask, transitionTenantLeadTask, transitionTenantLeadStatus } from '@/lib/api/tenant-crm.functions';
import { createJourneyCommandRunner, journeyError } from './crm-journey-command';

export function CrmJourneyPanel({ selectedId }: { selectedId?: string }) {
  const { tenantId } = useTenantContext();
  const [open, setOpen] = useState(false);
  const selectedTenant = useSelectedTenantId();
  const impersonating = useImpersonation();
  // Cache identity only: no tenant identifier is sent as command authority.
  const scopeKey = JSON.stringify([tenantId, selectedTenant, impersonating]);
  return <section aria-label="Atendimento operacional" className="rounded-xl border p-4 space-y-3">
    <Button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Atendimento operacional</Button>
    {open && <Journey key={`${scopeKey}:${selectedId ?? 'new'}`} tenantId={scopeKey} selectedId={selectedId} />}
  </section>;
}
function Journey({ tenantId, selectedId }: { tenantId: string; selectedId?: string }) {
  const qc = useQueryClient();
  const [leadId, setLeadId] = useState(selectedId ?? '');
  const [name, setName] = useState('');
  const [property, setProperty] = useState('');
  const [assignee, setAssignee] = useState('');
  const [title, setTitle] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const runner = useRef(createJourneyCommandRunner(() => crypto.randomUUID()));
  const properties = useQuery({ queryKey: ['crm-journey', tenantId, 'properties'], queryFn: () => listTenantLeadProperties(), retry: false });
  const assignees = useQuery({ queryKey: ['crm-journey', tenantId, 'assignees'], queryFn: () => listTenantLeadAssignees(), retry: false });
  const aggregate = useQuery({ queryKey: ['crm-journey', tenantId, 'lead', leadId], queryFn: () => getTenantLeadAggregate({ data: { leadId } }), enabled: Boolean(leadId), retry: false });
  async function command<T>(operation: string, payload: object, send: (key: string) => Promise<T>, accept?: (result: T) => void) {
    setPending(true); setError(''); setNotice('');
    try {
      const result = await runner.current(operation, payload, send);
      accept?.(result);
      setNotice('Operação confirmada pelo servidor.');
    } catch (cause) { setError(journeyError(cause)); }
    finally {
      await qc.invalidateQueries({ predicate: q => ['crm-journey', 'admin', 'tenant-crm', 'crm'].includes(String(q.queryKey[0])) });
      setPending(false);
    }
  }
  const readError = properties.error ?? assignees.error ?? aggregate.error;
  const loading = properties.isPending || assignees.isPending || (Boolean(leadId) && aggregate.isPending);
  const lead = aggregate.data?.lead;
  const next = lead?.status === 'novo' ? 'conversando' : lead?.status === 'conversando' ? 'visita' : lead?.status === 'visita' ? 'proposta' : lead?.status === 'proposta' ? 'ganho' : null;
  const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-foreground focus-visible:outline focus-visible:outline-2';
  return <div className="space-y-4" aria-busy={pending || loading}>
    <p className="text-sm">Selecione um lead na consulta ou cadastre um contato manual. As operações dependem das permissões verificadas pelo servidor.</p>
    {loading && <p role="status">Carregando dados autorizados…</p>}
    {readError && <div role="alert">{journeyError(readError)} <Button type="button" onClick={() => { void properties.refetch(); void assignees.refetch(); if (leadId) void aggregate.refetch(); }}>Tentar consulta novamente</Button></div>}
    {error && <p role="alert">{error}</p>}
    <p role="status" aria-live="polite">{notice}</p>
    <fieldset disabled={pending || loading || Boolean(readError)} className="space-y-4 min-w-0">
      <legend className="font-semibold">{lead ? `Atendimento de ${lead.nome}` : 'Novo lead manual'}</legend>
      {!leadId && <form className="space-y-3" onSubmit={event => {
        event.preventDefault();
        const data = { nome: name.trim(), imovel_id: property || null };
        void command('create', data, idempotencyKey => createTenantLead({ data: { ...data, idempotencyKey } }), result => setLeadId(result.id));
      }}>
        <label className="block">Nome do contato<Input required minLength={2} maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="block">Imóvel existente<select className={selectClass} value={property} onChange={e => setProperty(e.target.value)}><option value="">Sem vínculo</option>{properties.data?.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.titulo}</option>)}</select></label>
        {properties.data?.length === 0 && <p>Nenhum imóvel autorizado disponível para vínculo.</p>}
        <Button type="submit">Criar lead manual</Button>
      </form>}
      {lead && <>
        <p>Etapa: {lead.status} · Versão: {lead.version}</p>
        <p>Imóvel: {lead.imovel?.titulo ?? 'Sem vínculo'} · Responsável: {assignees.data?.find(a => a.user_id === lead.assigned_to)?.nome ?? (lead.assigned_to ? 'Atribuído' : 'Sem responsável')}</p>
        <form className="space-y-2" onSubmit={e => {
          e.preventDefault();
          const data = { leadId: lead.id, expectedVersion: lead.version, strategy: 'manual_member' as const, assigneeUserId: assignee, reason: 'Atribuição manual no atendimento' };
          void command('assign', data, idempotencyKey => assignTenantLead({ data: { ...data, idempotencyKey } }));
        }}><label>Responsável<select required className={selectClass} value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Selecione</option>{assignees.data?.map(a => <option key={a.user_id} value={a.user_id}>{a.nome} {a.sobrenome}</option>)}</select></label><Button type="submit" disabled={!assignee}>Atribuir responsável</Button></form>
        {assignees.data?.length === 0 && <p>Nenhum responsável autorizado disponível.</p>}
        <form className="space-y-2" onSubmit={e => {
          e.preventDefault();
          const data = { leadId: lead.id, type: 'follow_up' as const, title: title.trim(), assigneeUserId: lead.assigned_to };
          void command('task', data, idempotencyKey => createTenantLeadTask({ data: { ...data, idempotencyKey } }), () => setTitle(''));
        }}><label>Título da tarefa<Input required maxLength={300} value={title} onChange={e => setTitle(e.target.value)} /></label><Button type="submit">Criar tarefa</Button></form>
        <ul aria-label="Tarefas do lead" className="space-y-2">{aggregate.data?.tasks.map(task => <li key={task.id} className="break-words">{task.title} · {task.status} {task.status === 'open' && <Button type="button" onClick={() => {
          const data = { taskId: task.id, toStatus: 'completed' as const, expectedVersion: task.row_version };
          void command('complete-task', data, idempotencyKey => transitionTenantLeadTask({ data: { ...data, idempotencyKey } }));
        }}>Concluir tarefa: {task.title}</Button>}</li>)}</ul>
        {aggregate.data?.tasks.length === 0 && <p>Nenhuma tarefa registrada.</p>}
        {next && <Button type="button" onClick={() => {
          const data = { leadId: lead.id, toStatus: next, expectedVersion: lead.version };
          void command('advance', data, idempotencyKey => transitionTenantLeadStatus({ data: { ...data, idempotencyKey } }));
        }}>Avançar para {next}</Button>}
        <h3 className="font-semibold">Histórico do servidor</h3>
        <ol className="space-y-2" aria-label="Histórico do lead">{aggregate.data?.activities.map((activity, index) => <li key={typeof activity.id === 'string' ? activity.id : index} className="break-words">{typeof activity.event_type === 'string' ? activity.event_type : 'Evento'} · {typeof activity.created_at === 'string' ? new Date(activity.created_at).toLocaleString('pt-BR') : ''}</li>)}</ol>
        {aggregate.data?.activities.length === 0 && <p>Nenhum evento retornado.</p>}
      </>}
    </fieldset>
  </div>;
}

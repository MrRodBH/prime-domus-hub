export const brokerId = '44000000-0000-4000-8000-000000000001';
export const targetId = '44000000-0000-4000-8000-000000000002';
export const state = { mode: 'success', reads: 0, lists: 0, calls: [] as unknown[], linked: false };
const delay = () => new Promise(resolve => setTimeout(resolve, 200));
export async function adminListarCorretores() {
  state.reads++;
  if (state.mode === 'directory-denied') throw Error('permission denied PRIVATE_PROVIDER_DETAILS');
  if (state.mode === 'refresh-failed' && state.reads > 1) throw Error('PRIVATE_PROVIDER_DETAILS');
  return [{id: brokerId, nome: 'Corretor sintético', ativo: true, user_id: state.linked ? targetId : null}];
}
export async function listTenantTeams() { return []; }
export async function listTenantMemberships() {
  state.lists++;
  if (state.mode === 'loading') await delay();
  if (state.mode === 'denied') throw Error('Somente o owner ativo pode gerenciar memberships. PRIVATE_PROVIDER_DETAILS');
  if (state.mode === 'missing-manager') throw Error('Membership de gestão não encontrada.');
  if (state.mode === 'no-tenant') throw Error('tenant selection required PRIVATE_PROVIDER_DETAILS');
  if (state.mode === 'query-error') throw Error('PRIVATE_PROVIDER_DETAILS');
  const active = {userId: targetId, email: 'identidade@example.invalid', status: 'active'};
  const suspended = {userId: '44000000-0000-4000-8000-000000000003', email: 'suspenso@example.invalid', status: 'suspended'};
  return state.mode === 'empty' ? [suspended] : [active, suspended];
}
export async function adminVincularCorretorIdentidade(args: unknown) {
  state.calls.push(args);
  if (state.mode === 'slow') await delay();
  if (state.mode === 'write-denied') throw Error('Acesso negado à gestão de perfis, permissões e equipes. PRIVATE_PROVIDER_DETAILS');
  if (state.mode === 'conflict') throw Error('Conflito de vínculo: não foi possível vincular esta identidade ao corretor.');
  if (state.mode === 'write-error') throw Error('PRIVATE_PROVIDER_DETAILS');
  state.linked = true;
  return {corretorId: brokerId, userId: targetId, status: state.mode === 'already' ? 'already_linked' : 'linked'};
}

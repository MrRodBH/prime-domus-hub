// Controlled boundary only. This module is never imported by product code.
export const state = { mode: 'success', reads: 0, detailReads: [] as string[], calls: [] as any[], forbidden: 0, rows: [] as any[] };
const copy = (v: any) => structuredClone(v);
export async function adminListarImoveis() { state.reads++; return copy(state.rows); }
export async function adminObterImovel({ data }: any) { state.detailReads.push(data.id); if (state.mode === 'detail-error') throw Error('internal-detail-error'); return copy(state.rows.find(r => r.id === data.id)); }
export async function adminSalvarImovel({ data }: any) {
  state.calls.push(copy(data));
  if (state.mode === 'slow') await new Promise(r => setTimeout(r, 150));
  if (state.mode === 'write-denied') throw Error('property_admin_permission_denied:create');
  const row = { ...data, id: '00000000-0000-4000-8000-000000000040', imagens: [], updated_at: '2026-09-07T12:00:00Z' };
  state.rows.push(row);
  if (state.mode === 'ambiguous') throw Error('PRIVATE_PROVIDER_DETAILS');
  return { ok: true, id: row.id };
}
async function options(name: string) {
  if (state.mode === 'loading') await new Promise(r => setTimeout(r, 150));
  if (name === 'Corretores' && state.mode === 'denied') throw Error('Acesso negado à gestão de perfis, permissões e equipes.');
  if (name === 'Bairros' && state.mode === 'unavailable') throw Error('tenant authority unresolved');
  if (name === 'Cidades' && state.mode === 'query-error') throw Error('PRIVATE_PROVIDER_DETAILS');
  return [];
}
export const adminListarCorretores=()=>options('Corretores');
export const listarBairros=()=>options('Bairros');
export const listarCidades=()=>options('Cidades');
export const listarTenantLaunchAmenities=()=>options('Características');
const forbidden=()=>{state.forbidden++;throw Error('Forbidden provider/media/AI call in controlled test');};
export const adminAdicionarImagem=forbidden,adminAssinarUrl=forbidden,adminDefinirCapa=forbidden,adminRemoverImagem=forbidden,adminReordenarImagens=forbidden,gerarDescricaoImovel=forbidden,createUploadTarget=forbidden;
export const supabase={storage:{from:forbidden}};

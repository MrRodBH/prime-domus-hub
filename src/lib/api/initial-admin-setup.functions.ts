import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function database(context: {userId: string; supabase: any}, superOnly = true) {
  if (superOnly) {
    const {data, error} = await context.supabase.from('user_roles').select('role').eq('user_id',context.userId).eq('role','super_admin').maybeSingle();
    if (error || !data) throw Error('Acesso exclusivo do Super Admin.');
  }
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  return supabaseAdmin as any;
}
function checked(error: {message?: string} | null) {
  if (!error) return;
  const messages: Record<string,string> = {
    setup_company_incomplete: 'Salve os dados da empresa e selecione um plano ativo antes de cadastrar o Admin.',
    setup_already_operational: 'Esta empresa já possui um administrador operacional. A gestão da equipe pertence ao tenant.',
    setup_already_activated: 'O setup inicial já foi concluído. Ele não altera acessos existentes.',
    setup_identity_ineligible: 'Utilize uma identidade operacional independente, sem papel Super Admin ou vínculo existente nesta empresa.',
    setup_conflict: 'O setup foi alterado em outra sessão. Recarregue antes de tentar novamente.',
    setup_retry_later: 'Aguarde um minuto antes de enviar novamente.',
    setup_invitation_expired: 'O convite expirou. Solicite seu reenvio no cadastro inicial da empresa.',
    setup_invitation_invalid: 'O convite não corresponde à sua conta com e-mail confirmado.',
  };
  for (const [key,message] of Object.entries(messages)) if (error.message?.includes(key)) throw Error(message);
  throw Error('Não foi possível concluir o setup. Os dados já salvos foram preservados.');
}
const tenantInput = z.object({tenantId:z.string().uuid()}).strict();
export const registerSetupCompany = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>z.object({id:z.string().uuid(),name:z.string().trim().min(2).max(160),slug:z.string().min(2).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),source:z.enum(['direct_sale','sales_platform']),reference:z.string().trim().max(200)}).strict().refine(v=>v.source!=='sales_platform'||!!v.reference,'Informe a referência da venda.').parse(input))
  .handler(async({data,context})=>{
    const db=await database(context);
    const result=await db.rpc('register_setup_company',{p_actor:context.userId,p_id:data.id,p_name:data.name,p_slug:data.slug,p_source:data.source,p_reference:data.reference});
    checked(result.error);return result.data as {tenantId:string;name:string};
  });
export type InitialAdminState = {eligible:boolean;companyComplete:boolean;setup:null|{invitation_id:string;administrator_name:string;email:string;delivery_status:string;expires_at:string;activated_at:string|null}};
export const loadInitialAdminSetup=createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>tenantInput.parse(input)).handler(async({data,context}):Promise<InitialAdminState>=>{
    const db=await database(context);
    const tenant=await db.from('tenants').select('plano_codigo,metadata').eq('id',data.tenantId).eq('operational_kind','customer').maybeSingle();
    if(tenant.error||!tenant.data)throw Error('Empresa fora do escopo de setup.');
    const [setup,members,plan]=await Promise.all([
      db.from('tenant_initial_admin_setup').select('invitation_id,administrator_name,email,delivery_status,expires_at,activated_at').eq('tenant_id',data.tenantId).maybeSingle(),
      db.from('tenant_members').select('user_id').eq('tenant_id',data.tenantId).in('tenant_role',['owner','admin']),
      db.from('commercial_plans').select('id').eq('code',tenant.data.plano_codigo??'').eq('status','active').maybeSingle(),
    ]);
    if(setup.error||members.error||plan.error)throw Error('Não foi possível carregar o setup. Tente novamente.');
    const ids=(members.data??[]).map((m:{user_id:string})=>m.user_id);
    let superIds:string[]=[];
    if(ids.length){const roles=await db.from('user_roles').select('user_id').in('user_id',ids).eq('role','super_admin');if(roles.error)throw Error('Não foi possível verificar o setup.');superIds=roles.data.map((r:{user_id:string})=>r.user_id);}
    return {eligible:!setup.data?.activated_at&&!ids.some((id:string)=>!superIds.includes(id)),companyComplete:!!tenant.data.metadata?.company_profile&&!!plan.data,setup:setup.data};
  });
export const inviteInitialAdmin=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>z.object({tenantId:z.string().uuid(),name:z.string().trim().min(2).max(160),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),expectedInvitationId:z.string().uuid().nullable()}).strict().parse(input))
  .handler(async({data,context})=>{
    const db=await database(context);
    const prepared=await db.rpc('prepare_initial_admin',{p_actor:context.userId,p_tenant:data.tenantId,p_name:data.name,p_email:data.email,p_expected:data.expectedInvitationId});
    checked(prepared.error);
    const id=prepared.data?.invitationId;
    if(!z.string().uuid().safeParse(id).success)throw Error('Resposta inválida ao preparar convite.');
    let delivery:'sent'|'existing_account'|'failed'=prepared.data.existingConfirmedAccount?'existing_account':'sent';
    if(delivery==='sent'){
      try{
        // No caller-controlled redirect. Supabase also enforces its configured redirect allowlist.
        const redirect=new URL('/reset-password',getRequest().url);
        if(redirect.protocol!=='https:'&&redirect.hostname!=='localhost')throw Error('invalid_origin');
        const sent=await db.auth.admin.inviteUserByEmail(data.email,{redirectTo:redirect.href});
        if(sent.error)delivery='failed';
      }catch{delivery='failed';}
    }
    const saved=await db.from('tenant_initial_admin_setup').update({delivery_status:delivery}).eq('tenant_id',data.tenantId).eq('invitation_id',id).is('activated_at',null).select('invitation_id');
    if(saved.error||saved.data?.length!==1)throw Error('O convite foi preparado, mas seu estado mudou. Recarregue antes de reenviar.');
    return {delivery};
  });
export const listMyInitialAdminInvitations=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context}):Promise<Array<{id:string;tenantId:string;name:string;expiresAt:string}>>=>{
  const db=await database(context,false);
  const identity=await db.auth.admin.getUserById(context.userId);
  if(identity.error||!identity.data.user?.email_confirmed_at)return [];
  const {data,error}=await db.from('tenant_initial_admin_setup').select('invitation_id,tenant_id,expires_at,tenants(nome)').eq('email',identity.data.user.email.toLowerCase()).is('activated_at',null).gt('expires_at',new Date().toISOString());
  if(error)throw Error('Não foi possível carregar as ativações pendentes.');
  return (data??[]).map((s:any)=>({id:s.invitation_id,tenantId:s.tenant_id,name:s.tenants?.nome??'Empresa',expiresAt:s.expires_at}));
});
export const acceptInitialAdminInvitation=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>z.object({invitationId:z.string().uuid()}).strict().parse(input)).handler(async({data,context})=>{
    const db=await database(context,false);
    const result=await db.rpc('activate_initial_admin',{p_actor:context.userId,p_invitation:data.invitationId});checked(result.error);
    return z.object({tenantId:z.string().uuid(),activated:z.literal(true)}).parse(result.data);
  });

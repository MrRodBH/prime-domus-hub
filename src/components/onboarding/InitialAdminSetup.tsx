import {useState, type FormEvent} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {loadInitialAdminSetup,inviteInitialAdmin} from '@/lib/api/initial-admin-setup.functions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export function InitialAdminSetup({tenantId,name}:{tenantId:string;name:string}){
 const key=['initial-admin-setup',tenantId];const qc=useQueryClient();
 const query=useQuery({queryKey:key,queryFn:()=>loadInitialAdminSetup({data:{tenantId}})});
 const [draft,setDraft]=useState<{name:string;email:string}|null>(null);
 const [message,setMessage]=useState('');
 const mutation=useMutation({mutationFn:()=>inviteInitialAdmin({data:{tenantId,name:draft?.name??query.data?.setup?.administrator_name??'',email:draft?.email??query.data?.setup?.email??'',expectedInvitationId:query.data?.setup?.invitation_id??null}}),
 onSuccess:result=>{setMessage(result.delivery==='sent'?'Convite enviado. O Admin deve abrir o e-mail, definir sua senha e aceitar a ativação da empresa.':result.delivery==='existing_account'?'A conta já está confirmada. O Admin deve entrar com sua própria senha e aceitar a ativação em Convites. Nenhum e-mail foi enviado.':'Não foi possível enviar o e-mail. O cadastro foi preservado; aguarde um minuto e tente novamente.');},
 onError:(e:Error)=>setMessage(e.message),onSettled:()=>qc.invalidateQueries({queryKey:key})});
 const values=draft??{name:query.data?.setup?.administrator_name??'',email:query.data?.setup?.email??''};
 function submit(e:FormEvent){e.preventDefault();if(!mutation.isPending){setMessage('');mutation.mutate();}}
 return <section className="mt-4 rounded-xl border bg-card p-5 space-y-4" aria-label={`Admin inicial de ${name}`}>
  <div><h3 className="font-display text-xl">2. Cadastrar o Admin da empresa</h3><p className="text-sm text-muted-foreground">{name} · Etapa independente após salvar os dados empresariais e o plano.</p></div>
  {query.isPending?<p role="status">Verificando o setup…</p>:query.isError?<div role="alert"><p>Não foi possível carregar esta etapa.</p><Button variant="outline" onClick={()=>void query.refetch()}>Tentar novamente</Button></div>:!query.data?.eligible?<p role="status">A empresa já possui acesso administrativo operacional. A gestão da equipe é feita pelo Admin no ambiente da empresa.</p>:!query.data.companyComplete?<p>Conclua e salve os dados empresariais com um plano ativo para habilitar esta etapa.</p>:<form onSubmit={submit} className="space-y-4">
   <p className="text-sm text-muted-foreground">Informe quem administrará esta empresa. A conta terá papel Admin, sem receber a propriedade ou acesso Super Admin.</p>
   <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Nome do Admin<Input required minLength={2} maxLength={160} autoComplete="name" value={values.name} disabled={mutation.isPending} onChange={e=>setDraft({...values,name:e.target.value})}/></label>
   <label className="grid gap-2 text-sm font-medium">E-mail do Admin<Input required type="email" maxLength={254} autoComplete="email" value={values.email} disabled={mutation.isPending} onChange={e=>setDraft({...values,email:e.target.value})}/></label></div>
   {query.data.setup&&<p className="text-sm">{query.data.setup.delivery_status==='sent'?'Convite enviado; ativação pendente.':query.data.setup.delivery_status==='existing_account'?'Aguardando aceite da conta existente.':query.data.setup.delivery_status==='failed'?'Envio não concluído.':'Ativação pendente.'} Validade: {new Date(query.data.setup.expires_at).toLocaleDateString('pt-BR')}.</p>}
   <Button type="submit" disabled={mutation.isPending||query.isFetching}>{mutation.isPending?'Preparando convite…':query.data.setup?'Atualizar / reenviar convite':'Cadastrar Admin e enviar convite'}</Button>
  </form>}
  {message&&<p role="status" className="text-sm">{message}</p>}
 </section>;
}

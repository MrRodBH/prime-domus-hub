import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Execute the production wrapper and authority code with a closed transport.
const state = globalThis.__round42 = { calls: [], writes: [], decision: { allowed: true, scope: 'global', source: 'tenant_owner' } };
const oldFetch = globalThis.fetch;
globalThis.fetch = () => { throw Error('REMOTE_NETWORK_FORBIDDEN'); };
try {
  const bundled = await build({ entryPoints: ['src/lib/api/tenant-broker-directory.functions.ts'], bundle: true, write: false, format: 'esm', platform: 'node', metafile: true,
    plugins: [{ name: 'closed-transport', setup(b) {
      b.onResolve({ filter: /^(@tanstack\/react-start|@\/integrations\/supabase\/(tenant-middleware|client.server))$/ }, a => ({ path: a.path, namespace: 'controlled' }));
      b.onLoad({ filter: /.*/, namespace: 'controlled' }, a => ({ contents: a.path === '@tanstack/react-start' ? `
        export function createServerFn(options) { let schema, middlewares;
          const chain = { middleware(m) { middlewares=m; return chain; }, inputValidator(s) { schema=s; return chain; },
            handler(fn) { return async input => { if(options.method !== 'POST' && options.method !== 'GET') throw Error('METHOD');
              if(middlewares?.[0] !== 'requireTenant') throw Error('TENANT_MIDDLEWARE_REQUIRED');
              const data=schema ? (typeof schema === 'function' ? schema(input.data) : schema.parse(input.data)) : input.data;
              return fn({data, context:input.context}); }; } }; return chain; }
      ` : a.path.endsWith('tenant-middleware') ? `export const requireTenant = 'requireTenant';` : `
        export const supabaseAdmin = {
          async rpc(name, args) { const s=globalThis.__round42; s.calls.push({name,args});
            if(name==='resolve_tenant_permission') return {data:s.decision,error:s.authError};
            if(name!=='link_tenant_broker_identity') throw Error('UNEXPECTED_RPC');
            return {data:s.result ?? {corretorId:args._broker_id,userId:args._target_user_id,status:'linked'},error:s.linkError}; },
          from(table) { if(table!=='corretores') throw Error('UNEXPECTED_TABLE');
            const q={select(){return q;},eq(){return q;},like(){return Promise.resolve({data:[],error:null});},
              maybeSingle(){return Promise.resolve({data:{id:'existing'},error:null});},
              update(payload){globalThis.__round42.writes.push({kind:'update',payload});return q;},
              insert(payload){globalThis.__round42.writes.push({kind:'insert',payload});return q;},
              single(){return Promise.resolve({data:{id:'created'},error:null});},
              then(resolve){resolve({error:null});}};return q; }
        };
      ` }));
    }}] });
  assert.ok(!Object.keys(bundled.metafile.inputs).some(p => p.includes('supabase-js') || p === 'src/integrations/supabase/client.server.ts'));
  const api = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
  const id = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const context = { userId:id(1), tenant:{ tenantId:id(2), isSuperAdmin:false, impersonation:false, origin:'single-membership' } };
  const data = {corretorId:id(3),userId:id(4)};
  const call = (d=data,c=context) => api.adminVincularCorretorIdentidade({data:d,context:c});
  for(const invalid of [null,{}, {...data,userId:'invalid'}, {...data,corretorId:'invalid'}, ...['tenantId','tenant_id','actor','user_id','role','permissions'].map(key=>({...data,[key]:id(9)}))]) {
    state.calls=[]; await assert.rejects(call(invalid)); assert.equal(state.calls.length,0);
  }
  for(const tenant of [null,{}, {...context.tenant,tenantId:null}, {...context.tenant,origin:'impersonation'}, {...context.tenant,isSuperAdmin:true}, {...context.tenant,origin:'unknown'}]) {
    state.calls=[]; await assert.rejects(call(data,{...context,tenant})); assert.equal(state.calls.length,0);
  }
  for(const decision of [{allowed:false,scope:null,source:'membership_denied'}, {allowed:true,scope:'proprio',source:'assigned_profiles'}, {allowed:true,scope:'equipe',source:'assigned_profiles'}]) {
    state.calls=[]; state.decision=decision; await assert.rejects(call()); assert.equal(state.calls.length,1);
  }
  for(const source of ['tenant_owner','assigned_profiles','super_admin_impersonation']) {
    state.decision={allowed:true,scope:'global',source}; state.calls=[];
    const c=source==='super_admin_impersonation' ? {...context,tenant:{...context.tenant,isSuperAdmin:true,impersonation:true,origin:'impersonation'}} : context;
    if (source==='super_admin_impersonation') { await assert.rejects(call(data,c),/prohibited/);assert.equal(state.calls.length,0);continue; }
    assert.deepEqual(await call(data,c),{...data,status:'linked'});
    assert.deepEqual(state.calls.map(c=>c.name),['resolve_tenant_permission','link_tenant_broker_identity']);
    assert.deepEqual(state.calls[0].args,{_actor_user_id:context.userId,_tenant_id:context.tenant.tenantId,_tenant_origin:c.tenant.origin,_module_code:'access_control',_action:'gerenciar'});
    assert.deepEqual(state.calls[1].args,{_actor_user_id:context.userId,_tenant_id:context.tenant.tenantId,_tenant_origin:c.tenant.origin,_broker_id:data.corretorId,_target_user_id:data.userId});
  }
  state.result={...data,status:'already_linked'};
  assert.equal((await call()).status,'already_linked');
  for(const message of ['membership_invalid','external_target','broker_identity_conflict','audit_failure PRIVATE_PROVIDER_DETAILS']) {
    state.linkError={message,details:'OTHER_TENANT_UUID'};
    await assert.rejects(call(), e=>e.message==='Não foi possível vincular a identidade ao corretor.');
  }
  state.linkError=null;
  state.linkError={code:'23505',message:'broker_identity_conflict',details:'OTHER_TENANT_UUID'};
  await assert.rejects(call(), e=>e.message==='Conflito de vínculo: não foi possível vincular esta identidade ao corretor.');
  state.linkError=null;
  for(const result of [{...data,status:'unknown'},{...data,corretorId:id(8),status:'linked'},{...data,userId:id(8),status:'linked'}, {...data,status:'linked',tenantId:id(9)}]) {
    state.result=result; await assert.rejects(call(), /Resposta inválida/);
  }
  state.writes=[];
  await api.adminSalvarCorretor({data:{id:id(3),nome:'Corretor fictício'},context});
  assert.equal(state.writes[0].kind,'update');
  assert.equal(Object.hasOwn(state.writes[0].payload,'user_id'),false,'stale reads must not overwrite a concurrent link');
  for(const existingLink of [null,id(4),id(5)]) assert.equal({...{user_id:existingLink},...state.writes[0].payload}.user_id,existingLink);
  await api.adminSalvarCorretor({data:{nome:'Corretor fictício'},context});
  assert.equal(state.writes[1].kind,'insert'); assert.equal(state.writes[1].payload.user_id,null);
  await assert.rejects(api.adminSalvarCorretor({data:{nome:'Corretor fictício',user_id:id(4)},context}));
  console.log('PASS Round 42: production wrapper/authority, strict input, tenant, scopes, trusted actor, safe errors, response contract and cadastral link preservation. Controlled transport only.');
} finally { globalThis.fetch=oldFetch; delete globalThis.__round42; }

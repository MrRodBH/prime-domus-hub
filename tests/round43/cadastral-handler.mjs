import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Execute the real save handler and authority; substitute only framework/transport.
export async function loadCadastralHandler() {
  const bundle = await build({entryPoints:['src/lib/api/tenant-broker-directory.functions.ts'],bundle:true,write:false,platform:'node',format:'esm',metafile:true,
    plugins:[{name:'round43-native-transport',setup(b){
      b.onResolve({filter:/^(@tanstack\/react-start|@\/integrations\/supabase\/(tenant-middleware|client.server))$/},a=>({path:a.path,namespace:'round43'}));
      b.onLoad({filter:/.*/,namespace:'round43'},a=>({contents:a.path==='@tanstack/react-start' ? `
        export function createServerFn(){let schema,middleware;const c={middleware(m){middleware=m;return c;},inputValidator(s){schema=s;return c;},handler(fn){return input=>{
          if(middleware?.[0]!=='requireTenant')throw Error('TENANT_BOUNDARY_MISSING');
          return fn({context:input.context,data:schema?(typeof schema==='function'?schema(input.data):schema.parse(input.data)):input.data});};}};return c;}
      ` : a.path.endsWith('tenant-middleware') ? `export const requireTenant='requireTenant';` : `
        export const supabaseAdmin={rpc:(...args)=>globalThis.__round43Transport.rpc(...args),from:(...args)=>globalThis.__round43Transport.from(...args)};
      `}));
    }}]});
  assert.ok(!Object.keys(bundle.metafile.inputs).some(p=>p.includes('supabase-js')||p==='src/integrations/supabase/client.server.ts'));
  return (await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).adminSalvarCorretor;
}

export function nativeCadastralTransport(client,trace) {
  const columns=new Set(['id','tenant_id','user_id','nome','sobrenome','cpf','creci','email','telefone','whatsapp','cargo','bio','ativo','status','team_id','slug']);
  const ident=key=>{assert.ok(columns.has(key),`unexpected column ${key}`);return `"${key}"`;};
  return {
    async rpc(name,a){assert.equal(name,'resolve_tenant_permission');return {data:(await client.query('SELECT public.resolve_tenant_permission($1,$2,$3,$4,$5) AS result',[a._actor_user_id,a._tenant_id,a._tenant_origin,a._module_code,a._action])).rows[0].result,error:null};},
    from(table){assert.equal(table,'corretores');let fields='id',payload,where=[];
      async function execute(){const values=[];let sql;
        if(payload){const sets=Object.entries(payload).map(([k,v])=>{values.push(v);return `${ident(k)}=$${values.length}`;});sql=`UPDATE public.corretores SET ${sets.join(',')}`;trace.push({updateKeys:Object.keys(payload).sort()});}
        else sql=`SELECT ${fields.split(',').map(k=>ident(k.trim())).join(',')} FROM public.corretores`;
        const predicate=where.map(([key,op,value])=>{values.push(value);return `${ident(key)} ${op} $${values.length}`;}).join(' AND ');
        assert.ok(predicate.includes('"tenant_id"'),'tenant predicate required');
        const r=await client.query(`${sql} WHERE ${predicate}`,values);return {data:r.rows,error:null};
      }
      const q={select(f){fields=f;return q;},eq(k,v){where.push([k,'=',v]);return q;},like(k,v){where.push([k,'LIKE',v]);return q;},update(p){payload=p;return q;},async maybeSingle(){const r=await execute();assert.ok(r.data.length<=1);return {data:r.data[0]??null,error:null};},then(resolve,reject){return execute().then(resolve,reject);}};
      return q;
    }
  };
}

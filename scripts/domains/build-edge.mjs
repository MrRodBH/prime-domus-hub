import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Deterministic: no timestamp, secret, machine path or duplicated state machine.
export async function buildDomainEdge() {
  return build({
    stdin: { contents: 'export { processScheduledDomainJobs } from "./src/lib/domains/domain-jobs.server"; export { createDomainEdgeHandler } from "./src/lib/domains/domain-edge-handler";', resolveDir: process.cwd() },
    bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', write: false,
    external: ['node:*', 'npm:*'],
    plugins: [{ name: 'managed-supabase-client', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client.server$/ }, () => ({ path: 'managed-client', namespace: 'edge' }));
      b.onLoad({ filter: /.*/, namespace: 'edge' }, () => ({ contents: `
        import { createClient } from 'npm:@supabase/supabase-js@2.108.2';
        let client;
        export const supabaseAdmin = new Proxy({}, { get(_, key) {
          if (!client) {
            const url = Deno.env.get('SUPABASE_URL');
            const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
            if (!url || !secret) throw new Error('managed_supabase_binding_missing');
            client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
          }
          const value = Reflect.get(client, key);
          return typeof value === 'function' ? value.bind(client) : value;
        }});
      `, loader: 'js' }));
    }}],
  });
}
if (process.argv[1] === resolve('scripts/domains/build-edge.mjs')) {
  const output = await buildDomainEdge();
  await mkdir('supabase/functions/domain-processor', { recursive: true });
  await writeFile('supabase/functions/domain-processor/processor.generated.mjs', output.outputFiles[0].text);
  console.log('Built canonical domain processor for Supabase Edge Functions');
}

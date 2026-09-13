import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { assertControlledBrowserBundle } from './controlled-browser-boundary.mjs';

const safe = await build({ stdin: { contents: 'export const view = "fixture";' }, bundle: true, write: false, metafile: true });
assertControlledBrowserBundle(safe, 'safe fixture');
assert.throws(() => assertControlledBrowserBundle({}, 'missing graph'), /metafile required/);
// Deliberately externalizing an unsafe dependency must not disguise the leak.
for (const path of ['node:async_hooks', '@supabase/supabase-js', '@tanstack/react-start', 'src/lib/api/tenant.functions.ts', 'src/integrations/supabase/client.ts',
  'supabase/functions/domain-processor/index.ts', 'node_modules/@supabase/supabase-js/index.js',
  'node_modules/@tanstack/start-server-core/index.js', 'src/lib/tenant.server.ts']) {
  const output = await build({ stdin: { contents: `import ${JSON.stringify(path)};` }, bundle: true,
    write: false, metafile: true, external: [path], logLevel: 'silent' });
  assert.throws(() => assertControlledBrowserBundle(output, 'injected backend'), /production backend is forbidden/);
}
console.log('PASS browser boundary: real build graph accepts fixtures and rejects privileged/server dependencies, including externals.');

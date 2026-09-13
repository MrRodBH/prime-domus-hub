import assert from 'node:assert/strict';

// A controlled UI may call explicit test transports. It must not bundle actual
// server functions, privileged clients, SQL, or a server runtime (even external).
export function assertControlledBrowserBundle(result, label) {
  assert.ok(result.metafile?.inputs && result.metafile?.outputs, `${label}: build metafile required`);
  const forbidden = /(?:^|\/)(?:src\/lib\/api\/|src\/integrations\/supabase\/|supabase\/(?:functions|migrations)\/)|(?:^|\/)node_modules\/(?:@supabase\/|@tanstack\/(?:start-server|start-storage))|(?:^|\/)(?:@supabase\/|@tanstack\/(?:react-start|start-server|start-storage))|(?:^|\/)node:|\.server\.[cm]?[jt]sx?$/;
  const paths = [...Object.keys(result.metafile.inputs),
    ...Object.values(result.metafile.inputs).flatMap(input => (input.imports ?? []).map(item => item.path)),
    ...Object.values(result.metafile.outputs).flatMap(output => (output.imports ?? []).map(item => item.path))];
  const rejected = paths.map(path => path.replaceAll('\\', '/')).filter(path => forbidden.test(path));
  assert.deepEqual([...new Set(rejected)], [], `${label}: production backend is forbidden in controlled browser bundle`);
}

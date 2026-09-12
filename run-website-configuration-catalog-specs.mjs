import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSync} from 'esbuild';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const original = read('./supabase/migrations/20260728233000_pr_m2_configuration_center.sql');
const applied = read('./supabase/migrations/20260911221612_dcb4669a-310b-44e8-87d0-090d7386a3a2.sql');
const bundle = buildSync({entryPoints:[new URL('./src/lib/api/configuration-registry.ts', import.meta.url).pathname], bundle:true, platform:'node', format:'esm', write:false});
const registry = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const allowedKeys = sql => [...sql.match(/v_allowed_keys constant text\[\] := ARRAY\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const keys = allowedKeys(applied);
assert.equal(new Set(keys).size, keys.length, 'SQL catalog must not contain duplicate keys');
assert.deepEqual([...Object.keys(registry.getConfigurationDefaults())].sort(), [...keys].sort(), 'SQL and server catalogs must cover exactly the same fields');
const added = keys.filter(key => !allowedKeys(original).includes(key));
assert.deepEqual(added.sort(), ['website_setup_status','website_setup_step','website_theme','logo_alignment','website_selected_pages','website_preview_viewport'].sort());

// This migration must remain a replacement of the existing validator only.
assert.match(applied, /^CREATE OR REPLACE FUNCTION public\.validate_tenant_configuration_snapshot\(_tenant_id uuid, _snapshot jsonb\)\s+RETURNS void\s+LANGUAGE plpgsql\s+STABLE SECURITY DEFINER\s+SET search_path TO 'public', 'pg_temp'/);
assert.equal((applied.match(/CREATE OR REPLACE FUNCTION/g) || []).length, 1);
assert.doesNotMatch(applied, /\b(?:INSERT|UPDATE|DELETE|GRANT|REVOKE|DROP|ALTER|EXECUTE)\b/i);
const body = sql => sql.slice(sql.indexOf('DECLARE'), sql.indexOf('END;\n$'));
const squash = value => value.replace(/\s+/g, '');
let inherited = body(applied)
  .replace('  v_element jsonb;\n', '')
  .replace(/,\s*'website_setup_status','website_setup_step','website_theme','logo_alignment',\s*'website_selected_pages','website_preview_viewport'/, '')
  .replace(/,\s*'website_selected_pages'\s*\n  \];/, '\n  ];')
  .replace(/  v_website_pages constant text\[\] := ARRAY\[[^\n]+\];\n/, '');
const start = inherited.indexOf("  IF _snapshot ? 'website_setup_status'");
const end = inherited.indexOf("  IF COALESCE(_snapshot->>'domain_activation_state'");
assert.ok(start > 0 && end > start);
inherited = inherited.slice(0, start) + inherited.slice(end);
assert.equal(squash(inherited), squash(body(original)), 'Pre-existing validation body must be preserved');
console.log('PASS: complete server/SQL catalog parity, six-key delta and preserved original validation body.');

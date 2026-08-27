import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const OUT = new URL("../rehearsal/pca-05r/substrate/", import.meta.url);
const CLOSURE = new URL(
  "../docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json",
  import.meta.url,
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function splitSql(sql) {
  const result = [];
  let start = 0,
    i = 0,
    single = false,
    double = false,
    line = false,
    block = false,
    dollar = null;
  while (i < sql.length) {
    const pair = sql.slice(i, i + 2);
    if (line) {
      if (sql[i] === "\n") line = false;
      i++;
      continue;
    }
    if (block) {
      if (pair === "*/") {
        block = false;
        i += 2;
      } else i++;
      continue;
    }
    if (!single && !double && !dollar && pair === "--") {
      line = true;
      i += 2;
      continue;
    }
    if (!single && !double && !dollar && pair === "/*") {
      block = true;
      i += 2;
      continue;
    }
    if (!double && !dollar && sql[i] === "'") {
      if (single && sql[i + 1] === "'") i += 2;
      else {
        single = !single;
        i++;
      }
      continue;
    }
    if (!single && !dollar && sql[i] === '"') {
      if (double && sql[i + 1] === '"') i += 2;
      else {
        double = !double;
        i++;
      }
      continue;
    }
    if (!single && !double && sql[i] === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match && (!dollar || match[0] === dollar)) {
        dollar = dollar ? null : match[0];
        i += match[0].length;
        continue;
      }
    }
    if (!single && !double && !dollar && sql[i] === ";") {
      const statement = sql.slice(start, i + 1).trim();
      if (statement) result.push(statement);
      start = i + 1;
    }
    i++;
  }
  assert.equal(Boolean(single || double || block || dollar), false, "SQL lexical state left open");
  const tail = sql.slice(start).trim();
  if (tail && !/^(?:--[^\n]*(?:\n|$)|\/\*[\s\S]*\*\/)\s*$/.test(tail)) result.push(tail);
  return result;
}

const stripComments = (sql) =>
  sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "")
    .trim();
const classify = (path, sql) => {
  const s = stripComments(sql);
  if (path.includes("20260616193726") && /INSERT\s+INTO\s+public\.site_settings/i.test(s))
    return ["EXCLUDE", "REAL_BRANDING_CONTACT_SEED"];
  if (path.includes("20260624151738") && /DELETE\s+FROM\s+auth\.(?:identities|users)/i.test(s))
    return ["EXCLUDE", "REAL_AUTH_IDENTITY_DELETE"];
  if (
    path.includes("20260701204508") &&
    /INSERT\s+INTO\s+public\.(?:tenants|tenant_members|user_roles)/i.test(s)
  )
    return ["EXCLUDE", "REAL_TENANT_OR_MEMBERSHIP_SEED"];
  if (path.includes("20260701205318") && /UPDATE\s+public\.%I\s+SET\s+tenant_id/i.test(s))
    return ["REPLACE", "REAL_TENANT_BACKFILL_AND_NOT_NULL"];
  if (path.includes("20260701210935") && /UPDATE\s+storage\.objects/i.test(s))
    return ["EXCLUDE", "BROAD_STORAGE_OBJECT_REWRITE"];
  if (path.includes("20260701213224") && /INSERT\s+INTO\s+public\.website_menu_items/i.test(s))
    return ["EXCLUDE", "REAL_TENANT_MENU_SEED"];
  if (
    path.includes("20260616204333") &&
    /CREATE\s+EXTENSION(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:pg_net|pg_cron|supabase_vault)\b/i.test(s)
  )
    return ["EXCLUDE", "UNNEEDED_EXTERNAL_CAPABILITY_EXTENSION"];
  return ["PASSTHROUGH", null];
};

const replacement = `DO $pca05r$\nDECLARE\n  t text;\nBEGIN\n  FOREACH t IN ARRAY ARRAY['profiles','imoveis','leads','corretores','proprietarios','clientes','contratos','visitas','propostas','chaves','launch_projects','blog_posts','cidades','bairros','site_settings','campaigns'] LOOP\n    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT', t);\n    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant_id()', t);\n    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', t || '_tenant_id_idx', t);\n  END LOOP;\nEND\n$pca05r$;`;

export function build() {
  const closure = JSON.parse(readFileSync(CLOSURE, "utf8"));
  const entries = [],
    chunks = [];
  for (const file of closure.prerequisites) {
    const source = readFileSync(new URL(file.path, ROOT), "utf8");
    assert.equal(sha256(source), file.sha256, `source hash drift: ${file.path}`);
    const statements = splitSql(source);
    if (file.duplicateOf) {
      statements.forEach((statement, i) =>
        entries.push({
          sourcePath: file.path,
          sourceStatement: i + 1,
          sourceSha256: sha256(statement),
          action: "EXCLUDE",
          reason: "DUPLICATE_SOURCE_BYTES",
        }),
      );
      continue;
    }
    const projected = [];
    statements.forEach((statement, i) => {
      const [action, reason] = classify(file.path, statement);
      entries.push({
        sourcePath: file.path,
        sourceStatement: i + 1,
        sourceSha256: sha256(statement),
        action,
        reason,
      });
      if (action === "PASSTHROUGH") projected.push(statement);
      if (action === "REPLACE") projected.push(replacement);
    });
    if (projected.length) {
      const body = projected.join("\n\n");
      chunks.push(
        file.explicitTransaction
          ? `-- source: ${file.path}\n${body}`
          : `-- source: ${file.path}\nBEGIN;\n${body}\nCOMMIT;`,
      );
    }
  }
  const counts = entries.reduce(
    (a, e) => {
      a[e.action.toLowerCase()] = (a[e.action.toLowerCase()] ?? 0) + 1;
      return a;
    },
    { totalSourceStatements: entries.length },
  );
  assert.deepEqual(counts, {
    totalSourceStatements: 1267,
    passthrough: 1201,
    exclude: 65,
    replace: 1,
  });
  const sql = `-- GENERATED; DO NOT EDIT. PCA-05R private synthetic substrate only.\n-- No migration-ledger writes; no Same-Backend execution authorization.\n${chunks.join("\n\n")}\n`;
  const manifest = {
    schemaVersion: 1,
    gate: "PCA-05R_GITHUB_NATIVE_SYNTHETIC_SUBSTRATE_BUNDLE_IMPLEMENTATION",
    sourceMain: "ee9b59c7653972f22cda48ac11be5394b540a3dc",
    sourceTree: "c71d1bc6b85d94a7ebb85590ff99b2c554fc0f3f",
    status: "READY_FOR_PRIVATE_CELL_EXECUTION_AUTHORIZATION",
    authority: "PROTECTED_GITHUB_MAIN_ONLY",
    counts: { ...counts, projectedStatements: counts.passthrough + counts.replace },
    controls: {
      privateFreshCellOnly: true,
      sameBackendAllowed: false,
      migrationLedgerWritesAllowed: false,
      providerMutationAllowed: false,
      deployAllowed: false,
      lovableExecutionAuthorized: false,
    },
    bundleSha256: sha256(sql),
    entries,
  };
  return { manifest, sql };
}

if (process.argv.includes("--write")) {
  const { manifest, sql } = build();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL("PCA-05R-synthetic-substrate.sql", OUT), sql);
  writeFileSync(
    new URL("PCA-05R-statement-projection-manifest.json", OUT),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

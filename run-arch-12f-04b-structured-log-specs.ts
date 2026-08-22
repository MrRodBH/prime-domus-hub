import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STRUCTURED_LOG_LEVELS,
  sanitizeStructuredLogContext,
  structuredLog,
} from "./src/lib/structured-log";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
let assertions = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); assertions += 1; };
const equal = (actual: unknown, expected: unknown, message: string) => {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
};

const applicationLogFiles = [
  "src/start.ts",
  "src/server.ts",
  "src/lib/meta-pixel.ts",
  "src/lib/observability.server.ts",
  "src/lib/api/_cms.ts",
  "src/lib/api/forms.functions.ts",
  "src/lib/public-writers/public-lead-writer.server.ts",
  "src/integrations/supabase/auth-middleware.ts",
  "src/routes/__root.tsx",
  "src/routes/email/unsubscribe.ts",
  "src/routes/lovable/email/auth/webhook.ts",
  "src/routes/lovable/email/queue/process.ts",
  "src/routes/lovable/email/suppression.ts",
  "src/routes/lovable/email/transactional/preview.ts",
  "src/routes/lovable/email/transactional/send.ts",
  "src/components/pipeline/hooks/usePipelineData.ts",
];

equal(STRUCTURED_LOG_LEVELS, ["debug", "info", "warn", "error"], "L02: level enum must be stable");
for (const file of applicationLogFiles) {
  const source = read(file);
  ok(!/console\.(?:log|error|warn|info|debug)\s*\(/.test(source), `L01: ${file} must use structuredLog`);
  ok(source.includes("structuredLog"), `L01: ${file} must import or invoke structuredLog`);
}

const cycle: Record<string, unknown> = { status: "nested" };
cycle.stage = cycle;
const sanitized = sanitizeStructuredLogContext({
  status: "ok",
  email: "owner@example.com",
  token: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  authorization: "Bearer abc.def.ghi",
  unknown: "discard-me",
  stage: cycle,
});
equal(sanitized.status, "ok", "L03: allowlisted context must be retained");
equal("email" in sanitized, false, "L04: email key must be removed");
equal("token" in sanitized, false, "L04: token key must be removed");
equal("authorization" in sanitized, false, "L04: authorization key must be removed");
equal("unknown" in sanitized, false, "L03: unknown context key must be removed");
ok(JSON.stringify(sanitized).includes("[circular]"), "L03: recursive cycles must be bounded safely");

const original = { log: console.log, warn: console.warn, error: console.error };
const lines: string[] = [];
console.log = (line?: unknown) => { lines.push(String(line)); };
console.warn = (line?: unknown) => { lines.push(String(line)); };
console.error = (line?: unknown) => { lines.push(String(line)); };
try {
  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const error = new Error(`failed for owner@example.com with Bearer ${secret}`) as Error & { code: string };
  error.code = "provider_failed";
  error.stack = `Error: ${secret}\n at owner@example.com`;
  process.env.STRUCTURED_LOG_STACKS = "true";
  process.env.NODE_ENV = "test";
  structuredLog({
    level: "error",
    event: "spec.event_failed",
    code: "spec_failed",
    route: "/spec",
    requestId: "req-123",
    context: { status: "failed", tenant_id: "tenant-123", email: "owner@example.com" },
    error,
  });
} finally {
  delete process.env.STRUCTURED_LOG_STACKS;
  delete process.env.NODE_ENV;
  console.log = original.log;
  console.warn = original.warn;
  console.error = original.error;
}

equal(lines.length, 1, "L01: one event must emit exactly one stdout/stderr line");
const parsed = JSON.parse(lines[0] ?? "{}") as Record<string, any>;
ok(!Number.isNaN(Date.parse(parsed.timestamp)), "L01: timestamp must be ISO-compatible");
equal(parsed.level, "error", "L02: level must be preserved");
equal(parsed.event, "spec.event_failed", "L02: event must be preserved");
equal(parsed.code, "spec_failed", "L02: code must be preserved");
equal(parsed.route, "/spec", "L02: route must be preserved");
equal(parsed.request_id, "req-123", "L06: request correlation must be explicit and non-authoritative");
equal(parsed.context.tenant_id, "tenant-123", "L06: tenant correlation may be retained as data only");
equal("email" in parsed.context, false, "L04: PII must not enter structured context");
equal(parsed.error.name, "Error", "L05: safe error name must be present");
equal(parsed.error.code, "provider_failed", "L05: safe error code must be present");
ok(!lines[0]?.includes("owner@example.com"), "L04: raw email must be redacted from line");
ok(!lines[0]?.includes("0123456789abcdef"), "L04: raw token must be redacted from line");
ok(lines[0]?.includes("[redacted-email]"), "L04: email redaction marker must be explicit");
ok(lines[0]?.includes("[redacted-token]"), "L04: token redaction marker must be explicit");

const fallbackLines: string[] = [];
console.error = () => { throw new Error("primary sink unavailable"); };
console.log = (line?: unknown) => { fallbackLines.push(String(line)); };
try {
  structuredLog({
    level: "error",
    event: "spec.sink_failure",
    code: "sink_failure",
    error: new Error("must not escape"),
  });
} finally {
  console.log = original.log;
  console.warn = original.warn;
  console.error = original.error;
}
equal(fallbackLines.length, 1, "L07: sink failure must emit one safe fallback when available");
const fallback = JSON.parse(fallbackLines[0] ?? "{}");
equal(fallback.event, "structured_log.write_failed", "L07: fallback event must be deterministic");
equal(fallback.context, {}, "L07: fallback context must be empty");

const observability = read("src/lib/observability.server.ts");
ok(observability.includes('rpc("log_system_event"'), "L08: optional database event behavior must remain");
ok(observability.includes('event: "observability.database_event_failed"'), "L08: database failure must emit stdout/stderr event");

for (const file of ["src/lib/meta-pixel.ts", "src/routes/__root.tsx", "src/components/pipeline/hooks/usePipelineData.ts"]) {
  const source = read(file);
  ok(!/(?:email|authorization|cookie|service_role|secret|token)\s*:/.test(source), `L09: browser log context in ${file} must exclude PII/secrets`);
}

for (const file of ["src/integrations/supabase/client.ts", "src/integrations/supabase/client.server.ts"]) {
  const source = read(file);
  ok(source.startsWith("// This file is automatically generated. Do not edit it directly."), `L10: ${file} must remain generator-owned`);
  ok(source.includes("Missing Supabase environment variable(s)"), `L10: ${file} may report missing variable names`);
  ok(!/console\.error\([^\n]*(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*\)/.test(source), `L10: ${file} must not log variable values`);
}

const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
equal(pkg.scripts["test:arch-12f-04b"], "tsx --tsconfig tsconfig.json ./run-arch-12f-04b-structured-log-specs.ts", "L11: focused matrix must be exact");
const verifyRelease = pkg.scripts["verify:release"];
ok(verifyRelease.includes("bun run test:arch-12f-04b && "), "L11: release verification must run the focused matrix");
ok(verifyRelease.indexOf("bun run test:arch-12f-04b") < verifyRelease.indexOf("bun ./scripts/verify-release.mjs"), "L11: focused matrix must precede core verification");
const release = read(".github/workflows/release-gate.yml");
ok(release.includes('STRUCTURED_LOG_STACKS: "false"'), "L05/L11: remote release policy must disable stacks");

console.log(`ARCH-12F-04B structured log specs passed: ${assertions} assertions`);

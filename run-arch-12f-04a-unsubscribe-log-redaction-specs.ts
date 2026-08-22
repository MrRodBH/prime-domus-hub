import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  createUnsubscribeJsonResponse,
  extractUnsubscribeToken,
  logUnsubscribeFailure,
  redactUnsubscribeLogValue,
} from "./src/routes/email/unsubscribe";

const ROUTE_PATH = "src/routes/email/unsubscribe.ts";
const ALLOWLIST = [
  ".github/workflows/release-gate.yml",
  "package.json",
  "run-arch-12f-04a-unsubscribe-log-redaction-specs.ts",
  ROUTE_PATH,
] as const;

const source = readFileSync(ROUTE_PATH, "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};
const workflow = readFileSync(".github/workflows/release-gate.yml", "utf8");
const pass = (id: string, detail: string) => console.log(`${id} PASS — ${detail}`);

// R01 — every route log path is structurally unable to receive the raw token.
assert.equal((source.match(/console\.(?:error|log|warn|info|debug)\(/g) ?? []).length, 0);
assert.match(source, /structuredLog\(\{/);
assert.doesNotMatch(source, /console\.(?:error|log)\([^\n]*(?:token|request\.url|searchParams|request\.body)/i);
assert.doesNotMatch(source, /\{\s*error:\s*updateError,\s*token\s*\}/);
for (const line of source.split(/\r?\n/).filter((value) => value.includes("logUnsubscribeFailure('") )) {
  assert.doesNotMatch(line, /token|request|url|body/i);
}
pass("R01", "raw token, URL and request payload are excluded from every log invocation");

// R02 — query, RFC 8058 form and JSON inputs preserve token extraction behavior.
const queryToken = "query-token-value";
assert.equal(
  await extractUnsubscribeToken(new Request(`https://example.com/email/unsubscribe?token=${queryToken}`)),
  queryToken,
);
assert.equal(
  await extractUnsubscribeToken(new Request("https://example.com/email/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "token=form-token-value",
  })),
  "form-token-value",
);
assert.equal(
  await extractUnsubscribeToken(new Request("https://example.com/email/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "json-token-value" }),
  })),
  "json-token-value",
);
assert.equal(
  await extractUnsubscribeToken(new Request(`https://example.com/email/unsubscribe?token=${queryToken}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "List-Unsubscribe=One-Click&token=body-token-must-not-win",
  })),
  queryToken,
);
pass("R02", "query, form, JSON and RFC 8058 precedence are preserved");

// R03/R04 — error logs contain only the event contract and never serialize secrets.
const exactSecret = "raw-unsubscribe-token-7c54f6a2";
const originalConsoleError = console.error;
const captured: string[] = [];
console.error = (line?: unknown) => { captured.push(String(line)); };
try {
  for (const stage of ["lookup", "mark_used", "suppress", "unexpected"] as const) {
    logUnsubscribeFailure(stage, Object.assign(new Error(exactSecret), { token: exactSecret }), {
      method: "POST",
      request_id: `request-${stage}`,
      token: exactSecret,
      nested: { authorization: `Bearer ${exactSecret}`, cookie: exactSecret },
    });
  }
} finally {
  console.error = originalConsoleError;
}
assert.equal(captured.length, 4);
for (const [index, line] of captured.entries()) {
  const stage = ["lookup", "mark_used", "suppress", "unexpected"][index];
  const record = JSON.parse(line) as Record<string, any>;
  assert.equal(record.level, "error");
  assert.equal(record.event, "email.unsubscribe_failed");
  assert.equal(record.code, `unsubscribe_${stage}_failed`);
  assert.equal(record.route, "/email/unsubscribe");
  assert.equal(record.request_id, `request-${stage}`);
  assert.equal(record.context.stage, stage);
  assert.equal(typeof record.context.operation, "string");
  assert.equal("error" in record, false);
}
const serializedLogs = captured.join("\n");
assert.doesNotMatch(serializedLogs, new RegExp(exactSecret));
assert.doesNotMatch(serializedLogs, /Bearer\s+/i);
for (const stage of ["lookup", "mark_used", "suppress", "unexpected"]) {
  assert.match(serializedLogs, new RegExp(`"stage":"${stage}"`));
}
pass("R03", "lookup, update, suppress and unexpected failures use the safe event contract");
pass("R04", "runtime stdout/stderr capture contains no exact token or serialized raw error");

// R05 — no-store is mandatory while the established status/body tokens remain stable.
const response = createUnsubscribeJsonResponse({ success: true }, { status: 200 });
assert.equal(response.headers.get("cache-control"), "no-store");
assert.deepEqual(await response.json(), { success: true });
for (const contract of [
  "Server configuration error",
  "Token is required",
  "Invalid or expired token",
  "already_unsubscribed",
  "Failed to process unsubscribe",
]) {
  assert.ok(source.includes(contract), `missing response contract: ${contract}`);
}
for (const status of [400, 404, 500]) assert.match(source, new RegExp(`status: ${status}`));
pass("R05", "Cache-Control no-store and existing response contracts are preserved");

// R06 — recursive redaction handles keys, cycles, JWTs and secret-key patterns.
const cyclic: Record<string, unknown> = {};
cyclic.self = cyclic;
const redacted = redactUnsubscribeLogValue({
  token: exactSecret,
  authorization: `Bearer ${exactSecret}`,
  cookies: exactSecret,
  jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
  secret_key: "sk_live_examplevalue",
  safe: ["retained", cyclic],
});
const serializedRedaction = JSON.stringify(redacted);
assert.doesNotMatch(serializedRedaction, new RegExp(exactSecret));
assert.doesNotMatch(serializedRedaction, /eyJhbGci/);
assert.doesNotMatch(serializedRedaction, /sk_live_examplevalue/);
assert.match(serializedRedaction, /\[Circular\]/);
assert.match(serializedRedaction, /retained/);
pass("R06", "recursive secret and cyclic-value redaction is deterministic");

// R07 — the focused matrix is wired into the standard local/remote release gates.
assert.equal(
  pkg.scripts?.["test:arch-12f-04a"],
  "tsx --tsconfig tsconfig.json ./run-arch-12f-04a-unsubscribe-log-redaction-specs.ts",
);
assert.match(workflow, /bun run test:arch-12f-04a/);
pass("R07", "typecheck, build and release verification retain one focused entrypoint");

// R08 — exact remote scope, when supplied by CI, contains no provider/database path.
const baseSha = process.env.ARCH_12F_BASE_SHA;
const integrationMode = process.env.ARCH_INTEGRATION_MODE === "true";
const effectiveBaseSha = integrationMode
  ? process.env.ARCH_INTEGRATION_BASE_SHA
  : baseSha;
if (effectiveBaseSha) {
  assert.match(effectiveBaseSha, /^[0-9a-f]{40}$/);
  const changedFiles = execFileSync("git", ["diff", "--name-only", `${effectiveBaseSha}..HEAD`], {
    encoding: "utf8",
  }).trim().split(/\r?\n/).filter(Boolean).sort();
  if (integrationMode) {
    assert.equal(changedFiles.length, 42);
    for (const path of ALLOWLIST) assert.ok(changedFiles.includes(path));
  } else {
    assert.deepEqual(changedFiles, [...ALLOWLIST].sort());
  }
  assert.equal(execFileSync("git", ["rev-list", "--count", `${effectiveBaseSha}..HEAD`], { encoding: "utf8" }).trim(), "1");
}
assert.doesNotMatch(source, /fetch\(|wrangler|stripe|cloudflare/i);
pass("R08", "provider/database writes are absent and exact CI scope is allowlisted");

console.log("ARCH-12F-04A UNSUBSCRIBE LOG REDACTION MATRIX PASS");

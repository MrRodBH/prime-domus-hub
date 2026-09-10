import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
async function module(path) {
  const r = await build({ entryPoints: [path], bundle: true, write: false, format: "esm" });
  return import(
    "data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64")
  );
}
const { connectionStatus } = await module("src/components/domains/presentation/domain-status.ts");
assert.equal(connectionStatus("active", true).color, "green");
for (const status of [
  "pending_dns_configuration",
  "pending_cloudflare_provisioning",
  "pending_ssl",
])
  assert.equal(connectionStatus(status).color, "yellow");
for (const status of [
  undefined,
  "active",
  "draft",
  "failed",
  "revoked",
  "degraded",
  "pending_ownership_verification",
])
  assert.equal(connectionStatus(status).color, "red");
const { identifyDns } = await module("src/components/domains/presentation/public-dns.ts");
const originalFetch = globalThis.fetch;
let count = 0;
const answer = (Status = 0, ns = "one.ns.cloudflare.com.") => ({
  Status,
  Question: [{ name: "example.invalid.", type: 2 }],
  Answer: [{ name: "example.invalid.", type: 2, data: ns }],
});
try {
  let data = answer();
  globalThis.fetch = async (url, options) => {
    count++;
    assert.equal(url, "https://cloudflare-dns.com/dns-query?name=example.invalid&type=NS");
    assert.equal(options.method, "GET");
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.equal(options.headers.accept, "application/dns-json");
    return { ok: true, json: async () => data };
  };
  assert.equal(
    (await identifyDns("example.invalid", new AbortController().signal)).provider,
    "Cloudflare",
  );
  data = answer(0, "ns.other.invalid.");
  assert.match(
    (await identifyDns("example.invalid", new AbortController().signal)).provider,
    /Outro/,
  );
  data = answer(3);
  assert.match(
    (await identifyDns("example.invalid", new AbortController().signal)).detail,
    /não comprova/,
  );
  for (data of [
    null,
    answer(2),
    { ...answer(), TC: true },
    { ...answer(), Question: [{ name: "other.invalid.", type: 2 }] },
    { ...answer(), Answer: {} },
  ])
    await assert.rejects(
      () => identifyDns("example.invalid", new AbortController().signal),
      /indisponível/,
    );
  const before = count;
  await assert.rejects(() => identifyDns("https://example.invalid", new AbortController().signal));
  assert.equal(count, before);
  globalThis.fetch = async () => {
    throw Error("private provider detail");
  };
  await assert.rejects(
    () => identifyDns("example.invalid", new AbortController().signal),
    (error) => !error.message.includes("private"),
  );
} finally {
  globalThis.fetch = originalFetch;
}
const demo = readFileSync("src/components/demo/interactive/EmptyDemoWorkspace.tsx", "utf8");
for (const value of [
  "bg-[#f6f4ef]",
  "bg-[#113b42]",
  "bg-[#fbfaf7]/90",
  "272px",
  "1560px",
  'from "recharts"',
  "#7c3aed",
  "#f06449",
  "#d6a84b",
  "#16a56b",
  "#db3f8d",
  "#2694d1",
])
  assert.ok(demo.includes(value), value);
const historical = readFileSync("src/components/demo/DemoWorkspace.tsx", "utf8");
for (const color of ["#f6f4ef", "#113b42", "#fbfaf7"]) assert.ok(historical.includes(color));
const server = readFileSync("src/server.ts", "utf8");
assert.ok(
  server.includes('connectOrigins.push("https://cloudflare-dns.com")'),
);
const admin = readFileSync("src/components/domains/TenantDomainWorkspace.tsx", "utf8");
assert.ok(admin.includes("onCheck={() => void stateQuery.refetch()}"));
assert.ok(admin.includes("connectionStatus(domain.status, domain.enabled)"));
console.log(
  "PASS Round49: fixed-origin DNS/privacy/errors, server-only status mapping, historical theme tokens and Recharts, read-only authenticated Check Status",
);
await import("./run-round-48-tenant-domain-specs.mjs");

import { createDomainEdgeHandler } from "../../supabase/functions/domain-processor/processor.generated.mjs";

Deno.test("Deno imports canonical bundle and rejects unauthenticated work before database access", async () => {
  let calls = 0;
  const handler = createDomainEdgeHandler({ DOMAIN_PROCESSOR_SECRET: "fixture-".repeat(8) }, async () => { calls++; });
  const response = await handler(new Request("https://fixture.invalid", { method: "POST" }));
  if (response.status !== 401 || calls !== 0) throw new Error("scheduler authority failure");
});

Deno.test("Deno authenticates dedicated scheduler with empty body and one bounded lease", async () => {
  let calls = 0;
  const env = { DOMAIN_PROCESSOR_SECRET: "fixture-".repeat(8), DOMAIN_PROCESSOR_ENABLED: "true",
    SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
    DCA01_MANAGED_CNAME_TARGET: "sites.fixture.com", DOMAIN_ROUTING_PROOF_SECRET: "fixture-".repeat(8) };
  const handler = createDomainEdgeHandler(env, async (input: { limit: number }) => {
    if (input.limit !== 1) throw new Error("unbounded execution");
    calls++; return { leased: 0 };
  });
  const response = await handler(new Request("https://fixture.invalid", { method: "POST", body: "{}",
    headers: { "x-domain-processor-secret": env.DOMAIN_PROCESSOR_SECRET } }));
  if (response.status !== 200 || calls !== 1) throw new Error("scheduler execution failure");
});

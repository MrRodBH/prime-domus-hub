import { runTenantMiddlewareSpecs } from "@/integrations/supabase/__tests__/tenant-middleware.spec";
runTenantMiddlewareSpecs().then((r) => {
  console.log("RESULT:", JSON.stringify(r));
  if (r.failed > 0) process.exit(1);
});

import { runPublicSurfaceTenantReadSpecs } from "./src/lib/__tests__/public-surface-tenant-read.spec";
const result = await runPublicSurfaceTenantReadSpecs();
console.log(`PSG-01 public-surface tenant reads: ${result.passed} passed, ${result.failed} failed`);
if (result.failed > 0) process.exit(1);

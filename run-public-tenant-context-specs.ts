import { runPublicTenantContextSpecs } from "./src/lib/__tests__/public-tenant-context.spec";

async function main() {
  const { passed, failed } = await runPublicTenantContextSpecs();
  console.log(`\nPTC-01 TOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();

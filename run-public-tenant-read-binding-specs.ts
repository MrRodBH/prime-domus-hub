import { runPublicTenantReadBindingSpecs } from "./src/lib/__tests__/public-tenant-read-binding.spec";

async function main() {
  const { passed, failed } = await runPublicTenantReadBindingSpecs();
  console.log(`\nPTR-01 TOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();

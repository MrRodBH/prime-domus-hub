import { runPublicTenantWriterAuthoritySpecs } from "./src/lib/__tests__/public-tenant-writer-authority.spec";

async function main() {
  const { passed, failed } = await runPublicTenantWriterAuthoritySpecs();
  console.log(`\nPTW-01 AUTHORITY TOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();

import { runPublicTenantWriterSqlStructuralSpecs } from "./src/lib/__tests__/public-tenant-writer-sql-structural.spec";

async function main() {
  const { passed, failed } = await runPublicTenantWriterSqlStructuralSpecs();
  console.log(`\nPTW-01 SQL STRUCTURAL TOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();

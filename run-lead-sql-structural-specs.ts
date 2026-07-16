// LSH-01 · Lote B — SQL structural runner.
import { runLeadSqlStructuralSpecs } from "./src/lib/leads/__tests__/lead-sql-structural.spec";

async function main() {
  const { passed, failed } = await runLeadSqlStructuralSpecs();
  console.log(`lead-sql-structural: passed=${passed} failed=${failed}`);
  if (failed > 0) process.exit(1);
}
void main();

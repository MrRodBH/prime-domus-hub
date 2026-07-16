// LSH-01 · Lote A runtime operations runner.
import { runLeadRuntimeOperationsSpecs } from "./src/lib/leads/__tests__/lead-runtime-operations.spec";

async function main() {
  const { passed, failed } = await runLeadRuntimeOperationsSpecs();
  console.log(`lead-runtime-operations: passed=${passed} failed=${failed}`);
  if (failed > 0) process.exit(1);
}
void main();

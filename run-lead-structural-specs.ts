// LSH-01 structural runner.
import { runLeadStructuralSpecs } from "./src/lib/leads/__tests__/lead-structural.spec";

async function main() {
  const { passed, failed } = await runLeadStructuralSpecs();
  console.log(`lead-structural: passed=${passed} failed=${failed}`);
  if (failed > 0) process.exit(1);
}
void main();

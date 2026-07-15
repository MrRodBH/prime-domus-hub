// LSH-01 unit runner.
import { runLeadAuthorizationSpecs } from "./src/lib/leads/__tests__/lead-authorization.spec";

async function main() {
  const { passed, failed } = await runLeadAuthorizationSpecs();
  console.log(`lead-authorization: passed=${passed} failed=${failed}`);
  if (failed > 0) process.exit(1);
}
void main();

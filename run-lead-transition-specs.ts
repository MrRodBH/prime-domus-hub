// PR-M1 — Runner for lead-transition boundary specs.
// Usage: bunx tsx --tsconfig tsconfig.json ./run-lead-transition-specs.ts
import { runLeadTransitionBoundarySpecs } from "./src/lib/leads/__tests__/lead-transition.spec";

async function main(): Promise<void> {
  const { passed, failed } = await runLeadTransitionBoundarySpecs();
  console.log(`lead-transition boundary: passed=${passed} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

void main();

// F3.5 — Runner unificado para specs unitárias tenant-related.
// Uso: bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts
import { runTenantSelectionStateSpecs } from "./src/integrations/supabase/__tests__/tenant-selection-state.spec";
import { runTenantAttacherSpecs } from "./src/integrations/supabase/__tests__/tenant-attacher.spec";
import { runTenantSelectionCardinalitySpecs } from "./src/integrations/supabase/__tests__/tenant-selection-cardinality.spec";
import { runTenantGateSpecs } from "./src/integrations/supabase/__tests__/tenant-gate.spec";
import { runMembershipValidationSpecs } from "./src/integrations/supabase/__tests__/membership-validation.spec";
import { runCommercialReadModelsSpecs } from "./src/integrations/supabase/__tests__/commercial-read-models.spec";

async function main() {
  const suites: Array<[string, () => Promise<{ passed: number; failed: number }>]> = [
    ["tenant-selection-state", runTenantSelectionStateSpecs],
    ["tenant-attacher", runTenantAttacherSpecs],
    ["tenant-selection-cardinality", runTenantSelectionCardinalitySpecs],
    ["tenant-gate", runTenantGateSpecs],
    ["membership-validation", runMembershipValidationSpecs],
    ["commercial-read-models", runCommercialReadModelsSpecs],
  ];
  let totalPass = 0;
  let totalFail = 0;
  for (const [name, run] of suites) {
    const { passed, failed } = await run();
    totalPass += passed;
    totalFail += failed;
    console.log(`${failed === 0 ? "✓" : "✗"} ${name}: ${passed} passed, ${failed} failed`);
  }
  console.log(`\nTOTAL: ${totalPass} passed, ${totalFail} failed`);
  if (totalFail > 0) process.exit(1);
}

void main();

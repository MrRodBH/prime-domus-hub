import { runPublicSurfaceSecuritySpecs } from "./src/lib/__tests__/public-surface-security.spec";
const result = await runPublicSurfaceSecuritySpecs();
console.log(`PSG-01 public-surface security: ${result.passed} passed, ${result.failed} failed`);
if (result.failed > 0) process.exit(1);

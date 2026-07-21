import { runPublicPageRuntimeVerificationSpecs } from "./src/lib/__tests__/public-page-runtime-verification.spec";

async function main() {
  const { passed, failed } = await runPublicPageRuntimeVerificationSpecs();
  console.log(`\nPPR-GN-01 TOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();

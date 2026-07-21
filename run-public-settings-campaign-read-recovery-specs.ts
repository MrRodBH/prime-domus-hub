import { runPublicSettingsCampaignReadRecoverySpecs } from "./src/lib/__tests__/public-settings-campaign-read-recovery.spec";

async function main() {
  const { passed, failed } = await runPublicSettingsCampaignReadRecoverySpecs();
  console.log(`\nPSC-01 TOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();

import { saveCompanySchema, savePlanSchema } from '@/lib/onboarding/contracts';
const fixture = () => (window as any).__fixture;
export async function loadSuperOnboarding() { return fixture().load(); }
export async function saveSuperPlan({data}: {data: unknown}) { return fixture().savePlan(savePlanSchema.parse(data)); }
export async function saveSuperCompany({data}: {data: unknown}) { return fixture().saveCompany(saveCompanySchema.parse(data)); }

export async function lookupSuperPostalCode() { throw Error("Postal lookup unavailable in fixture"); }

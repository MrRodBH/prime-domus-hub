import { z } from "zod";

export const OPERATIONS_SECTION_KEYS = [
  "overview",
  "contacts",
  "calendar",
  "visits",
  "proposals",
  "automation",
  "sla",
  "alerts",
] as const;

export type OperationsSection = (typeof OPERATIONS_SECTION_KEYS)[number];

export const operationsSearchSchema = z
  .object({
    section: z.enum(OPERATIONS_SECTION_KEYS).optional(),
    q: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export type OperationsSearch = {
  section?: OperationsSection;
  q?: string;
};

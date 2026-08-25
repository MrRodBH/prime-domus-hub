// PR-M3-FVS3 — URL state is local presentation/navigation transport only.
// Tenant, role, price, status authority and write commands are never accepted.
import { z } from "zod";
import {
  PROPERTY_PURPOSE_KEYS,
  PROPERTY_STATUS_KEYS,
  type PropertyPurpose,
  type PropertyStatus,
} from "./property-inventory-read-model";

export const propertyInventorySearchSchema = z
  .object({
    item: z.string().uuid().optional(),
    q: z.string().trim().max(120).optional(),
    status: z.enum(PROPERTY_STATUS_KEYS).optional(),
    finalidade: z.enum(PROPERTY_PURPOSE_KEYS).optional(),
  })
  .strict();

export type PropertyInventorySearch = {
  item?: string;
  q?: string;
  status?: PropertyStatus;
  finalidade?: PropertyPurpose;
};

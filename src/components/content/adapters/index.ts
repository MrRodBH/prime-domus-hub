// Adapter Registry (Bloco 3.1 §9) — descriptor + adapter + permissions + flags + actions/tabs/blocks.
// Fonte única de verdade sobre CADA entidade — Workspace e Session apenas consultam.
import type { EntityKind, EntityRegistration } from "../types";
import { ENTITIES } from "../entity-registry";
import { usePageAdapter } from "./usePageAdapter";
import { usePostAdapter } from "./usePostAdapter";
import { useCampaignAdapter } from "./useCampaignAdapter";
import { useFormAdapter } from "./useFormAdapter";
import { useMediaAdapter } from "./useMediaAdapter";
import { useSiteAdapter } from "./useSiteAdapter";
import { useAuditAdapter } from "./useAuditAdapter";
import { useLeadAdapter } from "./useLeadAdapter";

export const ENTITY_REGISTRY: Record<EntityKind, EntityRegistration> = {
  pagina:    { descriptor: ENTITIES.pagina,    useAdapter: usePageAdapter },
  post:      { descriptor: ENTITIES.post,      useAdapter: usePostAdapter },
  form:      { descriptor: ENTITIES.form,      useAdapter: useFormAdapter },
  campanha:  { descriptor: ENTITIES.campanha,  useAdapter: useCampaignAdapter },
  midia:     { descriptor: ENTITIES.midia,     useAdapter: useMediaAdapter },
  site:      { descriptor: ENTITIES.site,      useAdapter: useSiteAdapter },
  auditoria: { descriptor: ENTITIES.auditoria, useAdapter: useAuditAdapter },
  lead:      { descriptor: ENTITIES.lead,      useAdapter: useLeadAdapter },
};

export function getRegistration(kind: EntityKind): EntityRegistration {
  const r = ENTITY_REGISTRY[kind];
  if (!r) throw new Error(`Entidade não registrada: ${kind}`);
  return r;
}

// Convenience export (Bloco 3.1 §9 pediu ENTITY_ADAPTERS).
export const ENTITY_ADAPTERS = ENTITY_REGISTRY;

export type { EntityRegistration } from "../types";


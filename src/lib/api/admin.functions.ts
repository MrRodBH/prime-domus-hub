// Compatibility barrel during PR-M2 incremental cutover.
//
// Non-property administrative functions remain provided by the preserved
// legacy module until their own tenant-scoped boundaries are migrated.
// Property/catalog mutations are explicitly overridden by the canonical
// fail-closed boundary below. Explicit exports take precedence over star
// exports and keep existing UI imports source-compatible.

export * from "./admin.functions.legacy";

export {
  adminListarImoveis,
  adminObterImovel,
  adminSalvarImovel,
  adminExcluirImovel,
  adminAdicionarImagem,
  adminRemoverImagem,
  adminReordenarImagens,
  adminDefinirCapa,
  adminAssinarUrl,
} from "./property-admin.functions";

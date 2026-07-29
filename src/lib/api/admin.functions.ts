// Compatibility barrel during PR-M2 incremental cutover.
//
// Non-migrated administrative domains remain provided by the preserved legacy
// module. Canonical domain overrides below are the active authorities.

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

export {
  adminListarCorretores,
  adminSalvarCorretor,
  adminExcluirCorretor,
} from "./tenant-broker-directory.functions";

export {
  meuAcessoAdmin,
  adminListarPapeisPorUsuario,
  adminDefinirPerfilUsuario,
  adminCriarUsuarioComLogin,
  adminAtualizarPapeis,
  adminAlterarSenhaUsuario,
} from "./tenant-access-control.functions";

// PR-M2 — CRM operational workflow cutover. Stable legacy export names are
// overridden explicitly and delegate to the canonical Tenant CRM authority.
export {
  listTenantLeads as adminListarLeads,
  listTenantLeadAssignees as adminListarLeadAssignees,
  listTenantLeadProperties as adminListarImoveisLite,
  updateTenantLead as adminAtualizarLead,
  createTenantLead as criarLeadManual,
} from "./tenant-crm.functions";

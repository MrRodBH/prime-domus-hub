// Compatibility barrel during PR-M2 incremental cutover.
//
// Non-migrated administrative domains remain provided by the preserved legacy
// module. Property/catalog and tenant access-control surfaces are explicitly
// overridden by canonical fail-closed boundaries below. Explicit exports take
// precedence over star exports and keep existing UI imports source-compatible.

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
  meuAcessoAdmin,
  adminListarPapeisPorUsuario,
  adminDefinirPerfilUsuario,
  adminCriarUsuarioComLogin,
  adminAtualizarPapeis,
  adminAlterarSenhaUsuario,
} from "./tenant-access-control.functions";

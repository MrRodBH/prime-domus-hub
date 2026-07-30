// PR-M2 consolidated corrective — explicit administrative authority barrel.
// Historical wildcard export is prohibited. Every active export below is
// backed by a tenant-scoped canonical boundary or an explicit fail-closed
// compatibility alias in that canonical module.

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
  meusModulos,
  listarModulos,
  listarPerfis,
  obterPerfilComPermissoes,
  salvarPerfil,
  excluirPerfil,
  togglePermissao,
  atualizarEscopo,
  setUserPerfis,
  setUserPerfisCustom,
  listarPerfisPorUsuario,
  listarEquipes,
  obterEquipe,
  salvarEquipe,
  excluirEquipe,
  listarAuditoria,
} from "./tenant-access-control.functions";

export { meusPapeis } from "./tenant-ui-permission-compat.functions";

export {
  adminListarCidades,
  adminSalvarCidade,
  adminListarBairros,
  adminSalvarBairro,
  adminExcluirBairro,
} from "./tenant-catalog-admin.functions";

export {
  adminListarLeads,
  adminListarLeadAssignees,
  adminListarImoveisLite,
  adminAtualizarLead,
  criarLeadManual,
} from "./tenant-crm-compat.functions";

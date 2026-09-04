const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  ready: "Pronto",
  configured: "Configurado",
  completed: "Concluído",
  verified: "Verificado",
  disabled: "Desativado",
  draft: "Rascunho",
  pending: "Pendente",
  queued: "Na fila",
  retry_scheduled: "Nova tentativa agendada",
  failed: "Falhou",
  failed_retryable: "Falha com nova tentativa disponível",
  error: "Erro",
  permission_denied: "Acesso não autorizado",
  adapter_not_implemented: "Automação ainda não disponível",
  configuration_required: "Configuração necessária",
  credential_required: "Credencial necessária",
  credential_provisioning_required: "Provisionamento de credencial necessário",
  rotation_required: "Atualização de credencial necessária",
  not_live_verified: "Ainda não verificado ao vivo",
  automated_ready: "Automação pronta",
  preview_ready: "Prévia pronta",
  partial_success: "Concluído parcialmente",
  lead_created: "Lead criado",
  available: "Disponível",
  csp_blocked: "Bloqueado pela política de segurança",
  publish: "Publicar",
  unpublish: "Retirar publicação",
  reconcile: "Reconciliar",
  none: "Nenhum",
  never: "Nunca",
  true: "Sim",
  false: "Não",
};

export function friendlyStatus(value: string | null | undefined) {
  if (!value) return "Não informado";
  const normalized = value.trim().toLowerCase();
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
  const readable = normalized.replaceAll("_", " ").replaceAll("-", " ");
  return readable.charAt(0).toLocaleUpperCase("pt-BR") + readable.slice(1);
}

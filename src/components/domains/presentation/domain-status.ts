export function connectionStatus(status?: string, enabled = false) {
  if (status === "active" && enabled)
    return {
      label: "Conectado",
      color: "green",
      className: "bg-emerald-700 text-white",
      detail: "Conexão confirmada pelo servidor.",
    };
  if (
    ["pending_dns_configuration", "pending_cloudflare_provisioning", "pending_ssl"].includes(
      status || "",
    )
  )
    return {
      label: "Em Propagação",
      color: "yellow",
      className: "bg-amber-300 text-amber-950",
      detail:
        "Aguardando DNS, provisionamento ou certificado. Consulte a etapa informada pelo servidor.",
    };
  return {
    label: "Não Conectado",
    color: "red",
    className: "bg-red-700 text-white",
    detail: "Verifique as configurações. Sem confirmação atual de propriedade, DNS e SSL.",
  };
}
export const propagationGuidance =
  "A propagação depende do TTL anterior e do provedor. Com TTL de 300 segundos, o cache daquele registro pode durar cerca de 5 minutos; outros caches e a emissão do SSL podem levar mais tempo. Não há prazo garantido: use Check Status para consultar novamente.";

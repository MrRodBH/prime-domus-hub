import type { DomainJobRecord, TenantDomainRecord } from "@/lib/domains/domain-contracts";
import { obsoleteDomainJobReason } from "@/lib/domains/domain-job-lifecycle";

/** Presentation of persisted server state, never an activation decision. */
export function domainProcessingSummary(domain: TenantDomainRecord, jobs: readonly DomainJobRecord[]) {
  const relevant = jobs.filter((job) => job.tenantId === domain.tenantId && job.domainId === domain.id
    && job.generation === domain.generation && obsoleteDomainJobReason(job, domain) === null);
  const pending = relevant.filter((job) => ["pending", "leased", "retry_wait"].includes(job.status));
  if (domain.status === "active" && domain.enabled) return { pending: false, message: "Conexão ativa, confirmada pela plataforma." };
  if (domain.status === "failed") return { pending: false, message: "A conexão encontrou uma falha. Consulte o código informado antes de tentar novamente." };
  if (domain.status === "revoked" || domain.status === "removal_pending") return { pending: pending.length > 0, message: "O domínio está removido ou em processo de remoção." };
  if (pending.some((job) => job.status === "leased")) return { pending: true, message: "A plataforma iniciou o processamento da conexão." };
  if (pending.some((job) => job.attemptCount > 0)) return { pending: true, message: "Há uma tarefa aguardando nova execução. A conexão ainda não foi confirmada." };
  if (pending.length > 0) return { pending: true, message: "Tarefa aguardando processamento da plataforma; nenhuma tentativa registrada. Repetir a solicitação não inicia o executor." };
  if (domain.status === "ownership_verified") return { pending: false, message: "Propriedade confirmada. A conexão depende da configuração e do processamento da plataforma; DNS de entrega e SSL ainda não foram confirmados." };
  return { pending: false, message: "Consulte o estado após cada etapa. A atualização da tela não executa verificações de DNS ou SSL." };
}

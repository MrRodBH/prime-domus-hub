import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTenantCrmFunctionalRegistry,
  listTenantCrmAlerts,
  listTenantCrmAutomationRules,
  listTenantCrmCalendarEvents,
  listTenantCrmContacts,
  listTenantCrmProposals,
  listTenantCrmSlaPolicies,
  listTenantCrmVisits,
} from "@/lib/api/tenant-crm-functional.functions";
import {
  classifyOperationsReadError,
  filterOperationsRecords,
  toOperationsReadModel,
  type OperationsSource,
} from "../operations-read-model";
import type { OperationsSearch, OperationsSection } from "../search-schema";

async function loadOperationsReadModel(): Promise<OperationsSource> {
  const [registry, contacts, calendar, visits, proposals, automation, sla, alerts] =
    await Promise.all([
      getTenantCrmFunctionalRegistry(),
      listTenantCrmContacts({ data: { limit: 200 } }),
      listTenantCrmCalendarEvents({ data: {} }),
      listTenantCrmVisits({ data: {} }),
      listTenantCrmProposals({ data: {} }),
      listTenantCrmAutomationRules(),
      listTenantCrmSlaPolicies(),
      listTenantCrmAlerts({ data: {} }),
    ]);

  return { registry, contacts, calendar, visits, proposals, automation, sla, alerts };
}

export function useOperationsReadModel(search: OperationsSearch) {
  const query = useQuery({
    queryKey: ["crm", "operations", "read-only"],
    queryFn: loadOperationsReadModel,
    staleTime: 30_000,
  });
  const model = useMemo(
    () => (query.data ? toOperationsReadModel(query.data) : undefined),
    [query.data],
  );
  const section: OperationsSection = search.section ?? "overview";
  const visibleRecords = useMemo(() => {
    if (!model || section === "overview") return [];
    return filterOperationsRecords(model[section], search.q);
  }, [model, search.q, section]);

  return {
    query,
    model,
    section,
    visibleRecords,
    errorKind: query.isError ? classifyOperationsReadError(query.error) : null,
  };
}

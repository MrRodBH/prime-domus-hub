import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminListarCorretores } from "@/lib/api/tenant-broker-directory.functions";
import { listTenantTeams } from "@/lib/api/tenant-access-control.functions";
import {
  classifyBrokerTeamDirectoryReadError,
  filterBrokerDirectory,
  toBrokerTeamDirectoryReadModel,
  type BrokerTeamDirectorySource,
} from "../broker-team-directory-read-model";
import type { BrokerTeamDirectorySearch } from "../search-schema";

async function loadBrokerTeamDirectory(): Promise<BrokerTeamDirectorySource> {
  const [brokers, teams] = await Promise.all([adminListarCorretores(), listTenantTeams()]);
  return { brokers, teams };
}

export function useBrokerTeamDirectoryReadModel(search: BrokerTeamDirectorySearch) {
  const query = useQuery({
    queryKey: ["directory", "brokers-teams", "read-only"],
    queryFn: loadBrokerTeamDirectory,
    staleTime: 30_000,
  });

  const model = useMemo(
    () => (query.data ? toBrokerTeamDirectoryReadModel(query.data) : undefined),
    [query.data],
  );

  const visibleBrokers = useMemo(
    () => (model ? filterBrokerDirectory(model.brokers, search.q, search.team) : []),
    [model, search.q, search.team],
  );

  return {
    query,
    model,
    visibleBrokers,
    view: search.view ?? "directory",
    errorKind: query.isError ? classifyBrokerTeamDirectoryReadError(query.error) : null,
  };
}

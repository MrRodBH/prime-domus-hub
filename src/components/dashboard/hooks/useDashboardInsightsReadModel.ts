import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardStats } from "@/lib/api/dashboard.functions";
import { adminListarCorretores } from "@/lib/api/admin.functions";
import {
  classifyDashboardReadError,
  dashboardDateRange,
  toDashboardReadModel,
  type DashboardStatsSource,
} from "../dashboard-read-model";
import type { DashboardInsightsSearch } from "../search-schema";

export function useDashboardInsightsReadModel(search: DashboardInsightsSearch) {
  const callDashboardStats = useServerFn(dashboardStats);
  const range = useMemo(
    () => dashboardDateRange(search.period ?? "30d", { from: search.from, to: search.to }),
    [search.from, search.period, search.to],
  );
  const statsQuery = useQuery({
    queryKey: [
      "dashboard",
      "insights",
      "read-only",
      range.inicio,
      range.fim,
      search.origin ?? null,
      search.broker ?? null,
    ],
    queryFn: () =>
      callDashboardStats({
        data: {
          inicio: range.inicio,
          fim: range.fim,
          origem: search.origin ?? null,
          corretor_id: search.broker ?? null,
        },
      }),
    staleTime: 30_000,
  });
  const canFilterByBroker = statsQuery.data?.isPrivileged === true;
  const brokerQuery = useQuery({
    queryKey: ["admin", "brokers", "dashboard-filter", "read-only"],
    queryFn: () => adminListarCorretores(),
    enabled: canFilterByBroker,
    staleTime: 60_000,
  });
  const model = useMemo(
    () =>
      statsQuery.data ? toDashboardReadModel(statsQuery.data as DashboardStatsSource) : undefined,
    [statsQuery.data],
  );
  const brokers = useMemo(
    () =>
      (brokerQuery.data ?? [])
        .filter((broker) => broker.ativo)
        .map((broker) => ({
          id: broker.id,
          name: [broker.nome, broker.sobrenome].filter(Boolean).join(" "),
        })),
    [brokerQuery.data],
  );

  return {
    statsQuery,
    brokerQuery,
    model,
    brokers,
    canFilterByBroker,
    errorKind: statsQuery.isError ? classifyDashboardReadError(statsQuery.error) : null,
  };
}

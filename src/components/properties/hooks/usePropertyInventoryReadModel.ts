import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminListarImoveis, adminObterImovel } from "@/lib/api/property-admin.functions";
import {
  classifyPropertyReadError,
  filterPropertyInventoryReadModels,
  summarizePropertyInventoryReadModels,
  toPropertyDetailReadModel,
  toPropertyInventoryReadModels,
} from "../property-inventory-read-model";
import type { PropertyInventorySearch } from "../search-schema";

export function usePropertyInventoryReadModel(search: PropertyInventorySearch) {
  const query = useQuery({
    queryKey: ["admin", "properties", "inventory", "read-only"],
    queryFn: () => adminListarImoveis(),
    staleTime: 30_000,
  });

  const properties = useMemo(() => toPropertyInventoryReadModels(query.data ?? []), [query.data]);
  const filtered = useMemo(
    () => filterPropertyInventoryReadModels(properties, search),
    [properties, search],
  );
  const summary = useMemo(() => summarizePropertyInventoryReadModels(properties), [properties]);

  return {
    query,
    properties,
    filtered,
    summary,
    errorKind: query.isError ? classifyPropertyReadError(query.error) : null,
  };
}

export function usePropertyDetailReadModel(id?: string) {
  const query = useQuery({
    queryKey: ["admin", "properties", "inventory", "read-only", id],
    queryFn: () => adminObterImovel({ data: { id: id! } }),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const property = useMemo(
    () => (query.data ? toPropertyDetailReadModel(query.data) : undefined),
    [query.data],
  );

  return {
    query,
    property,
    errorKind: query.isError ? classifyPropertyReadError(query.error) : null,
  };
}

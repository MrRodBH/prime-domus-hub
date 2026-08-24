import { createFileRoute } from "@tanstack/react-router";
import { PipelineReadOnlyPage } from "@/components/pipeline/PipelineReadOnlyPage";
import { pipelineSearchSchema } from "@/components/pipeline/search-schema";
import type { PipelineReadOnlySearch } from "@/components/pipeline/search-schema";

export const Route = createFileRoute("/_authenticated/admin/pipeline")({
  validateSearch: (s) => pipelineSearchSchema.parse(s),
  component: PipelineRoute,
});

function PipelineRoute() {
  const search = Route.useSearch();
  return <PipelineReadOnlyPage search={search as PipelineReadOnlySearch} />;
}

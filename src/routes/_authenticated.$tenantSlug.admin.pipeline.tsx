import { createFileRoute } from "@tanstack/react-router";
import { CrmJourneyPanel } from "@/components/pipeline/CrmJourneyPanel";
import { PipelineReadOnlyPage } from "@/components/pipeline/PipelineReadOnlyPage";
import { pipelineSearchSchema } from "@/components/pipeline/search-schema";
import type { PipelineReadOnlySearch } from "@/components/pipeline/search-schema";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/pipeline")({
  validateSearch: (s) => pipelineSearchSchema.parse(s),
  component: PipelineRoute,
});

function PipelineRoute() {
  const search = Route.useSearch();
  return <div className="space-y-4"><CrmJourneyPanel selectedId={search.item} /><PipelineReadOnlyPage search={search as PipelineReadOnlySearch} /></div>;
}

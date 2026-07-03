import { createFileRoute } from "@tanstack/react-router";
import { PipelinePage } from "@/components/pipeline/PipelinePage";
import { pipelineSearchSchema } from "@/components/pipeline/search-schema";

export const Route = createFileRoute("/_authenticated/admin/pipeline")({
  validateSearch: (s) => pipelineSearchSchema.parse(s),
  component: PipelineRoute,
});

function PipelineRoute() {
  const search = Route.useSearch();
  return <PipelinePage search={search} />;
}

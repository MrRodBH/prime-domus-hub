// Generated processor is built from canonical src/lib/domains, never hand-copied.
// Run node scripts/domains/build-edge.mjs before packaging/deployment.
import { createDomainEdgeHandler, processScheduledDomainJobs } from "./processor.generated.mjs";

Deno.serve(createDomainEdgeHandler(Deno.env.toObject(), processScheduledDomainJobs));

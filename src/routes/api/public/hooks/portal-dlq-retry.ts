import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { resolvePortalConnectorForTenant } from "@/lib/public-writers/public-writer-authority.server";
import { ingestPortalLead } from "@/lib/public-writers/portal-writer.server";
import {
  operationalUnauthorizedResponse,
  verifyPortalDlqRetryRequest,
} from "@/lib/operational-route-auth.server";
export const Route = createFileRoute("/api/public/hooks/portal-dlq-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        const authorization = verifyPortalDlqRetryRequest(request);
        if (!authorization.ok) return operationalUnauthorizedResponse();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { logEvent } = await import("@/lib/observability.server");

        // Busca elegíveis
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: items, error } = await (supabaseAdmin as any)
          .from("portal_sync_dlq")
          .select("*")
          .in("status", ["pendente", "em_retry"])
          .lte("proxima_tentativa_at", new Date().toISOString())
          .order("proxima_tentativa_at", { ascending: true })
          .limit(20);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { "content-type": "application/json" },
          });
        }

        const leadSchema = z
          .object({
            nome: z.string().min(1).max(200),
            email: z.string().email().max(200).optional().nullable(),
            telefone: z.string().max(50).optional().nullable(),
            mensagem: z.string().max(2000).optional().nullable(),
            imovel_codigo: z.string().max(60).optional().nullable(),
            imovel_id: z.string().uuid().optional().nullable(),
            portal_reference: z.string().max(120).optional().nullable(),
            valor_estimado: z.number().nullable().optional(),
          })
          .strict();
        const itemSchema = z
          .object({
            id: z.string().uuid(),
            tenant_id: z.string().uuid(),
            portal_slug: z.string().min(2).max(40),
            acao: z.string(),
            payload: z
              .object({
                portal: z.string().min(2).max(40),
                token: z.string().min(10).optional(),
                lead: leadSchema,
              })
              .strict(),
          })
          .passthrough();

        let ok = 0, retry = 0, skipped = 0;
        for (const rawItem of items ?? []) {
          let item: z.infer<typeof itemSchema>;
          try {
            item = itemSchema.parse(rawItem);
          } catch (validationError) {
            const message = validationError instanceof Error ? validationError.message : "invalid DLQ item";
            const itemId = typeof rawItem?.id === "string" ? rawItem.id : null;
            if (itemId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabaseAdmin as any).rpc("portal_dlq_mark_retry", { _id: itemId, _erro: message });
            }
            retry++;
            continue;
          }

          try {
            if (item.acao !== "lead_ingest") {
              skipped++;
              continue;
            }
            const persistedPortal = item.portal_slug.trim().toLowerCase();
            if (item.payload.portal.trim().toLowerCase() !== persistedPortal) {
              throw new Error("DLQ portal identity conflicts with persisted queue authority.");
            }

            const connector = await resolvePortalConnectorForTenant({
              tenantId: item.tenant_id,
              portalSlug: persistedPortal,
            });
            await ingestPortalLead({ connector, lead: item.payload.lead });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin as any).rpc("portal_dlq_mark_resolved", { _id: item.id });
            ok++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : "erro";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin as any).rpc("portal_dlq_mark_retry", { _id: item.id, _erro: msg });
            retry++;
          }
        }

        await logEvent({
          category: "portal", source: "/api/public/hooks/portal-dlq-retry", event: "batch_processed",
          severity: "info", statusCode: 200, latencyMs: Date.now() - started,
          meta: { processed: items?.length ?? 0, ok, retry, skipped },
        });

        return new Response(JSON.stringify({ processed: items?.length ?? 0, ok, retry, skipped }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      },
    },
  },
});

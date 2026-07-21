import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  PublicWriterError,
  resolvePortalConnectorAuthority,
} from "@/lib/public-writers/public-writer-authority.server";
import {
  ingestPortalLead,
  recordPortalLeadOutcome,
} from "@/lib/public-writers/portal-writer.server";

const bodySchema = z
  .object({
    portal: z.string().min(2).max(40),
    token: z.string().min(10),
    lead: z
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
      .strict(),
  })
  .strict();

export const Route = createFileRoute("/api/public/portal-leads")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        const started = Date.now();
        const { logEvent, clientIp } = await import("@/lib/observability.server");
        const ip = clientIp(request);
        const cors = { "access-control-allow-origin": "*", "content-type": "application/json" };
        const source = "/api/public/portal-leads";

        let payload: z.infer<typeof bodySchema>;
        try {
          payload = bodySchema.parse(await request.json());
        } catch (error) {
          const message = error instanceof Error ? error.message : "payload inválido";
          await logEvent({ category: "api", source, event: "invalid_payload", severity: "warn", statusCode: 400, ip, latencyMs: Date.now() - started, errorMessage: message });
          return new Response(JSON.stringify({ error: message }), { status: 400, headers: cors });
        }

        let connector;
        try {
          connector = await resolvePortalConnectorAuthority({
            portalSlug: payload.portal,
            token: payload.token,
          });
        } catch (error) {
          const status = error instanceof PublicWriterError ? error.status : 500;
          const message = error instanceof Error ? error.message : "connector resolution failed";
          await logEvent({ category: "portal", source, event: "connector_rejected", severity: status >= 500 ? "error" : "warn", statusCode: status, ip, meta: { portal: payload.portal.toLowerCase() }, latencyMs: Date.now() - started, errorMessage: message });
          return new Response(JSON.stringify({ error: message }), { status, headers: cors });
        }

        const { rateLimit, rateLimitResponse, portalDlqEnqueue } = await import("@/lib/rate-limit.server");
        const rlConn = await rateLimit({ scope: "portal-leads", key: `${connector.tenant.id}:${connector.portalSlug}`, limit: 60 });
        if (!rlConn.allowed) {
          await logEvent({ category: "portal", source, event: "rate_limited", severity: "warn", statusCode: 429, tenantId: connector.tenant.id, ip, meta: { portal: connector.portalSlug, scope: "conn" }, latencyMs: Date.now() - started });
          return rateLimitResponse(rlConn.retryAfter, "rate limit excedido (60/min por conector)");
        }
        const rlIp = await rateLimit({ scope: "portal-leads-ip", key: ip ?? "unknown", limit: 20 });
        if (!rlIp.allowed) {
          await logEvent({ category: "portal", source, event: "rate_limited", severity: "warn", statusCode: 429, tenantId: connector.tenant.id, ip, meta: { portal: connector.portalSlug, scope: "ip" }, latencyMs: Date.now() - started });
          return rateLimitResponse(rlIp.retryAfter, "rate limit excedido (20/min por IP)");
        }

        try {
          const result = await ingestPortalLead({ connector, lead: payload.lead });
          await recordPortalLeadOutcome({
            connector,
            status: "ok",
            payload,
            durationMs: Date.now() - started,
            leadId: result.leadId,
            imovelId: result.imovelId,
          });
          await logEvent({ category: "portal", source, event: "success", severity: "info", statusCode: 201, tenantId: connector.tenant.id, ip, meta: { portal: connector.portalSlug, lead_id: result.leadId }, latencyMs: Date.now() - started });
          return new Response(JSON.stringify({ ok: true, lead_id: result.leadId }), { status: 201, headers: cors });
        } catch (error) {
          const message = error instanceof Error ? error.message : "portal lead ingestion failed";
          if (error instanceof PublicWriterError) {
            await logEvent({ category: "portal", source, event: "authority_rejected", severity: "warn", statusCode: error.status, tenantId: connector.tenant.id, ip, meta: { portal: connector.portalSlug }, latencyMs: Date.now() - started, errorMessage: message });
            return new Response(JSON.stringify({ error: message }), { status: error.status, headers: cors });
          }

          await recordPortalLeadOutcome({
            connector,
            status: "erro",
            payload,
            durationMs: Date.now() - started,
            errorMessage: message,
          }).catch(() => undefined);
          await portalDlqEnqueue({
            tenantId: connector.tenant.id,
            portal: connector.portalSlug,
            acao: "lead_ingest",
            payload,
            erro: message,
          });
          await logEvent({ category: "portal", source, event: "insert_failed", severity: "error", statusCode: 500, tenantId: connector.tenant.id, ip, meta: { portal: connector.portalSlug, dlq: true }, latencyMs: Date.now() - started, errorMessage: message });
          return new Response(JSON.stringify({ error: message, dlq: true }), { status: 500, headers: cors });
        }
      },
    },
  },
});

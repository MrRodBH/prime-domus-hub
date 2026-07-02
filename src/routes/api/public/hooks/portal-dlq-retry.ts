import { createFileRoute } from "@tanstack/react-router";

// Endpoint interno (cron/manual) para reprocessar itens da DLQ de portais.
// Processa até 20 itens elegíveis (proxima_tentativa_at <= now e status in pendente|em_retry).
// Segurança: exige header x-cron-secret == process.env.CRON_SECRET.
export const Route = createFileRoute("/api/public/hooks/portal-dlq-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        const cronSecret = process.env.CRON_SECRET;
        const provided = request.headers.get("x-cron-secret");
        if (!cronSecret || provided !== cronSecret) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401, headers: { "content-type": "application/json" },
          });
        }

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

        let ok = 0, retry = 0, skipped = 0;
        for (const item of items ?? []) {
          try {
            if (item.acao === "lead_ingest") {
              const p = item.payload?.lead ?? {};
              const insertRow = {
                tenant_id: item.tenant_id,
                nome: p.nome,
                email: p.email ?? null,
                telefone: p.telefone ?? null,
                mensagem: p.mensagem ?? null,
                origem: `portal:${item.portal_slug}`,
                imovel_id: p.imovel_id ?? null,
                status: "novo",
                consent_lgpd: true,
                consent_at: new Date().toISOString(),
                utm_source: item.portal_slug,
                utm_medium: "portal",
              };
              const { error: insErr } = await supabaseAdmin.from("leads").insert(insertRow as never);
              if (insErr) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabaseAdmin as any).rpc("portal_dlq_mark_retry", { _id: item.id, _erro: insErr.message });
                retry++;
              } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabaseAdmin as any).rpc("portal_dlq_mark_resolved", { _id: item.id });
                ok++;
              }
            } else {
              skipped++;
            }
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

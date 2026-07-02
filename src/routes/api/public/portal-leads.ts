import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Endpoint universal de leads dos portais.
// Aceita POST com body JSON:
// {
//   "portal": "zap" | "vivareal" | "chavesnamao" | ...,
//   "token": "<feed_token do portal_connectors>",
//   "lead": { nome, email, telefone, mensagem, imovel_codigo?, portal_reference? }
// }
const bodySchema = z.object({
  portal: z.string().min(2).max(40),
  token: z.string().min(10),
  lead: z.object({
    nome: z.string().min(1).max(200),
    email: z.string().email().max(200).optional().nullable(),
    telefone: z.string().max(50).optional().nullable(),
    mensagem: z.string().max(2000).optional().nullable(),
    imovel_codigo: z.string().max(60).optional().nullable(),
    imovel_id: z.string().uuid().optional().nullable(),
    portal_reference: z.string().max(120).optional().nullable(),
    valor_estimado: z.number().nullable().optional(),
  }),
});

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
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cors = { "access-control-allow-origin": "*", "content-type": "application/json" };

        let payload: z.infer<typeof bodySchema>;
        try {
          const raw = await request.json();
          payload = bodySchema.parse(raw);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "payload inválido" }),
            { status: 400, headers: cors },
          );
        }

        const { data: conn } = await supabaseAdmin
          .from("portal_connectors")
          .select("*")
          .eq("feed_token", payload.token)
          .eq("portal_slug", payload.portal.toLowerCase())
          .maybeSingle();

        if (!conn) {
          return new Response(JSON.stringify({ error: "token inválido" }), { status: 401, headers: cors });
        }
        if (!conn.ativo) {
          return new Response(JSON.stringify({ error: "portal desativado" }), { status: 403, headers: cors });
        }

        // Resolve imovel_id via código, se necessário
        let imovel_id = payload.lead.imovel_id ?? null;
        let corretor_id: string | null = null;
        if (!imovel_id && payload.lead.imovel_codigo) {
          const { data: im } = await supabaseAdmin
            .from("imoveis")
            .select("id, corretor_id")
            .eq("tenant_id", conn.tenant_id)
            .eq("codigo", payload.lead.imovel_codigo)
            .maybeSingle();
          if (im) {
            imovel_id = im.id;
            corretor_id = im.corretor_id;
          }
        } else if (imovel_id) {
          const { data: im } = await supabaseAdmin
            .from("imoveis")
            .select("corretor_id")
            .eq("id", imovel_id)
            .maybeSingle();
          corretor_id = im?.corretor_id ?? null;
        }

        const insertRow = {
          tenant_id: conn.tenant_id,
          nome: payload.lead.nome,
          email: payload.lead.email ?? null,
          telefone: payload.lead.telefone ?? null,
          mensagem: payload.lead.mensagem ?? null,
          origem: `portal:${payload.portal.toLowerCase()}`,
          imovel_id,
          corretor_id,
          status: "novo",
          consent_lgpd: true,
          consent_at: new Date().toISOString(),
          valor_estimado: payload.lead.valor_estimado ?? null,
          utm_source: payload.portal.toLowerCase(),
          utm_medium: "portal",
        };

        const { data: created, error: errIns } = await supabaseAdmin
          .from("leads")
          .insert(insertRow as never)
          .select("id")
          .single();

        if (errIns) {
          await supabaseAdmin.from("portal_sync_logs").insert({
            tenant_id: conn.tenant_id, portal_slug: payload.portal.toLowerCase(), acao: "lead_ingest",
            status: "erro", payload: payload as never, erro: errIns.message, duration_ms: Date.now() - started,
          } as never);
          return new Response(JSON.stringify({ error: errIns.message }), { status: 500, headers: cors });
        }

        await supabaseAdmin.from("portal_sync_logs").insert({
          tenant_id: conn.tenant_id, portal_slug: payload.portal.toLowerCase(), acao: "lead_ingest",
          status: "ok", lead_id: created.id, imovel_id, payload: payload as never,
          duration_ms: Date.now() - started,
        } as never);

        return new Response(JSON.stringify({ ok: true, lead_id: created.id }), { status: 201, headers: cors });
      },
    },
  },
});

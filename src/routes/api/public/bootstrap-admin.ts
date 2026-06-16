import { createFileRoute } from "@tanstack/react-router";

// Endpoint público idempotente: cria o primeiro admin se ainda não houver nenhum.
// Após o primeiro admin existir, este endpoint não faz nada (retorna alreadyInitialized).
export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let email: string | undefined;
        let password: string | undefined;
        try {
          const body = await request.json();
          email = body.email;
          password = body.password;
        } catch {
          return new Response(JSON.stringify({ error: "Body inválido" }), { status: 400, headers: { "content-type": "application/json" } });
        }
        if (!email || !password) {
          return new Response(JSON.stringify({ error: "email e password obrigatórios" }), { status: 400, headers: { "content-type": "application/json" } });
        }

        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count ?? 0) > 0) {
          return Response.json({ ok: true, alreadyInitialized: true });
        }

        const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
        let userId = existing?.users.find((u) => u.email === email)?.id;
        if (!userId) {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (error || !created.user) {
            return new Response(JSON.stringify({ error: error?.message ?? "create failed" }), { status: 500, headers: { "content-type": "application/json" } });
          }
          userId = created.user.id;
        }

        const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (roleErr && !roleErr.message.includes("duplicate")) {
          return new Response(JSON.stringify({ error: roleErr.message }), { status: 500, headers: { "content-type": "application/json" } });
        }
        return Response.json({ ok: true, alreadyInitialized: false, userId });
      },
    },
  },
});

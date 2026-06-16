import * as React from "react";
import { renderAsync } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "RM Prime Imóveis";
const SENDER_DOMAIN = "contato.rmprimeimoveis.com.br";
const FROM_DOMAIN = "rmprimeimoveis.com.br";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Enqueue a transactional email from a server-internal trigger (no user JWT).
 * Used for public/unauthenticated flows (e.g. contact form, lead form).
 */
export async function enqueueTransactional(args: {
  templateName: string;
  to: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const tpl = TEMPLATES[args.templateName];
  if (!tpl) return { ok: false, reason: "template_not_found" };

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const recipient = (tpl.to || args.to).toLowerCase();
  const messageId = crypto.randomUUID();
  const idempotencyKey = args.idempotencyKey || messageId;
  const templateData = args.templateData ?? {};

  // Suppression check
  const { data: sup } = await supabase
    .from("suppressed_emails")
    .select("id")
    .eq("email", recipient)
    .maybeSingle();
  if (sup) return { ok: false, reason: "suppressed" };

  // Unsubscribe token (get-or-create)
  let unsubscribeToken: string;
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", recipient)
    .maybeSingle();
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token;
  } else {
    unsubscribeToken = generateToken();
    await supabase
      .from("email_unsubscribe_tokens")
      .upsert(
        { token: unsubscribeToken, email: recipient },
        { onConflict: "email", ignoreDuplicates: true },
      );
    const { data: stored } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", recipient)
      .maybeSingle();
    if (stored?.token) unsubscribeToken = stored.token;
  }

  const element = React.createElement(tpl.component, templateData);
  const html = await renderAsync(element);
  const text = await renderAsync(element, { plainText: true });
  const subject =
    typeof tpl.subject === "function" ? tpl.subject(templateData) : tpl.subject;

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: args.templateName,
    recipient_email: recipient,
    status: "pending",
  });

  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: args.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (error) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: args.templateName,
      recipient_email: recipient,
      status: "failed",
      error_message: error.message,
    });
    return { ok: false, reason: "enqueue_failed" };
  }

  return { ok: true };
}

import { createClient } from '@supabase/supabase-js'
import { WebhookError, verifyWebhookRequest } from '@lovable.dev/webhooks-js'
import { createFileRoute } from '@tanstack/react-router'
import { structuredLog } from '@/lib/structured-log'

// Suppression event payload sent by the Go API when Mailgun reports
// a bounce, complaint, or unsubscribe.
interface SuppressionPayload {
  email: string
  reason: 'bounce' | 'complaint' | 'unsubscribe'
  message_id?: string
  metadata?: Record<string, unknown>
  is_retry: boolean
  retry_count: number
}

function parseSuppressionPayload(body: string): SuppressionPayload {
  const parsed = JSON.parse(body)
  if (!parsed.data) {
    throw new Error('Missing data field in payload')
  }
  const data = parsed.data as SuppressionPayload
  if (!data.email || !data.reason) {
    throw new Error('Missing required fields: email, reason')
  }
  return data
}

function mapReasonToStatus(
  reason: string,
): 'bounced' | 'complained' | 'suppressed' {
  switch (reason) {
    case 'bounce':
      return 'bounced'
    case 'complaint':
      return 'complained'
    default:
      return 'suppressed'
  }
}

function mapReasonToMessage(reason: string): string {
  switch (reason) {
    case 'bounce':
      return 'Permanent bounce — email address is invalid or rejected'
    case 'complaint':
      return 'Spam complaint — recipient marked email as spam'
    case 'unsubscribe':
      return 'Recipient unsubscribed'
    default:
      return 'Email suppressed'
  }
}

export const Route = createFileRoute("/lovable/email/suppression")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
          structuredLog({
            level: 'error',
            event: 'email.suppression_configuration_missing',
            code: 'suppression_environment_missing',
            route: '/lovable/email/suppression',
            context: { source: 'server_environment' },
          })
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Verify HMAC signature using the Lovable API Key (same as auth-email-hook)
        let payload: SuppressionPayload
        try {
          const verified = await verifyWebhookRequest({
            req: request,
            secret: apiKey,
            parser: parseSuppressionPayload,
          })
          payload = verified.payload
        } catch (error) {
          if (error instanceof WebhookError) {
            switch (error.code) {
              case 'invalid_signature':
                structuredLog({
                  level: 'warn',
                  event: 'email.suppression_webhook_rejected',
                  code: 'invalid_webhook_signature',
                  route: '/lovable/email/suppression',
                })
                return Response.json({ error: 'Invalid signature' }, { status: 401 })
              case 'stale_timestamp':
                structuredLog({
                  level: 'warn',
                  event: 'email.suppression_webhook_rejected',
                  code: 'stale_webhook_timestamp',
                  route: '/lovable/email/suppression',
                })
                return Response.json({ error: 'Stale timestamp' }, { status: 401 })
              case 'invalid_payload':
              case 'invalid_json':
                structuredLog({
                  level: 'warn',
                  event: 'email.suppression_webhook_rejected',
                  code: 'invalid_webhook_payload',
                  route: '/lovable/email/suppression',
                  error,
                })
                return Response.json({ error: 'Invalid payload' }, { status: 400 })
              default:
                structuredLog({
                  level: 'warn',
                  event: 'email.suppression_webhook_rejected',
                  code: 'webhook_verification_failed',
                  route: '/lovable/email/suppression',
                  error,
                })
                return Response.json({ error: 'Verification failed' }, { status: 401 })
            }
          }
          structuredLog({
            level: 'error',
            event: 'email.suppression_verification_failed',
            code: 'unexpected_verification_error',
            route: '/lovable/email/suppression',
            error,
          })
          return Response.json({ error: 'Internal error' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const normalizedEmail = payload.email.toLowerCase()

        // 1. Upsert to suppressed_emails (idempotent — safe for retries)
        const { error: suppressError } = await supabase
          .from('suppressed_emails')
          .upsert(
            {
              email: normalizedEmail,
              reason: payload.reason,
              metadata: payload.metadata ?? null,
            },
            { onConflict: 'email' },
          )

        if (suppressError) {
          structuredLog({
            level: 'error',
            event: 'email.suppression_upsert_failed',
            code: 'suppression_upsert_failed',
            route: '/lovable/email/suppression',
            error: suppressError,
          })
          return Response.json({ error: 'Failed to write suppression' }, { status: 500 })
        }

        // 2. Append a new log entry for the suppression event (never update existing rows)
        const sendLogStatus = mapReasonToStatus(payload.reason)
        const sendLogMessage = mapReasonToMessage(payload.reason)

        const { error: insertError } = await supabase
          .from('email_send_log')
          .insert({
            message_id: payload.message_id ?? null,
            template_name: 'system',
            recipient_email: normalizedEmail,
            status: sendLogStatus,
            error_message: sendLogMessage,
            metadata: payload.metadata ?? null,
          })

        if (insertError) {
          // Non-fatal — log and continue. The suppression was already recorded.
          structuredLog({
            level: 'warn',
            event: 'email.suppression_audit_failed',
            code: 'email_send_log_insert_failed',
            route: '/lovable/email/suppression',
            error: insertError,
          })
        }

        structuredLog({
          level: 'info',
          event: 'email.suppression_processed',
          code: 'suppression_processed',
          route: '/lovable/email/suppression',
          context: {
            reason: payload.reason,
            is_retry: payload.is_retry,
            retry_count: payload.retry_count,
            has_message_id: !!payload.message_id,
          },
        })

        return Response.json({ success: true })
      },
    },
  },
})

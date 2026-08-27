import * as React from 'react'
import { render } from '@react-email/components'
import { parseEmailWebhookPayload } from '@lovable.dev/email-js'
import { WebhookError, verifyWebhookRequest } from '@lovable.dev/webhooks-js'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'
import { structuredLog } from '@/lib/structured-log'
import { getRequiredEmailIdentityConfig } from '@/lib/runtime/email-identity-config.server'

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

// Template mapping
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const emailIdentity = getRequiredEmailIdentityConfig()
        const apiKey = process.env.LOVABLE_API_KEY

        if (!apiKey) {
          structuredLog({
            level: 'error',
            event: 'email.auth_configuration_missing',
            code: 'lovable_api_key_missing',
            route: '/lovable/email/auth/webhook',
            context: { source: 'server_environment' },
          })
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500 }
          )
        }

        // Verify signature + timestamp, then parse payload.
        let payload: any
        let run_id = ''
        try {
          const verified = await verifyWebhookRequest({
            req: request,
            secret: apiKey,
            parser: parseEmailWebhookPayload,
          })
          payload = verified.payload
          run_id = payload.run_id
        } catch (error) {
          if (error instanceof WebhookError) {
            switch (error.code) {
              case 'invalid_signature':
              case 'missing_timestamp':
              case 'invalid_timestamp':
              case 'stale_timestamp':
                structuredLog({
                  level: 'warn',
                  event: 'email.auth_webhook_rejected',
                  code: 'invalid_webhook_signature',
                  route: '/lovable/email/auth/webhook',
                  error,
                })
                return Response.json(
                  { error: 'Invalid signature' },
                  { status: 401 }
                )
              case 'invalid_payload':
              case 'invalid_json':
                structuredLog({
                  level: 'warn',
                  event: 'email.auth_webhook_rejected',
                  code: 'invalid_webhook_payload',
                  route: '/lovable/email/auth/webhook',
                  error,
                })
                return Response.json(
                  { error: 'Invalid webhook payload' },
                  { status: 400 }
                )
            }
          }

          structuredLog({
            level: 'warn',
            event: 'email.auth_webhook_rejected',
            code: 'webhook_verification_failed',
            route: '/lovable/email/auth/webhook',
            error,
          })
          return Response.json(
            { error: 'Invalid webhook payload' },
            { status: 400 }
          )
        }

        if (!run_id) {
          structuredLog({
            level: 'warn',
            event: 'email.auth_webhook_rejected',
            code: 'run_id_missing',
            route: '/lovable/email/auth/webhook',
          })
          return Response.json(
            { error: 'Invalid webhook payload' },
            { status: 400 }
          )
        }

        if (payload.version !== '1') {
          structuredLog({
            level: 'warn',
            event: 'email.auth_webhook_rejected',
            code: 'unsupported_payload_version',
            route: '/lovable/email/auth/webhook',
            requestId: run_id,
            context: { version: payload.version },
          })
          return Response.json(
            { error: `Unsupported payload version: ${payload.version}` },
            { status: 400 }
          )
        }

        // The email action type is in payload.data.action_type (e.g., "signup", "recovery")
        // payload.type is the hook event type ("auth")
        const emailType = payload.data.action_type
        structuredLog({
          level: 'info',
          event: 'email.auth_event_received',
          code: 'auth_event_received',
          route: '/lovable/email/auth/webhook',
          requestId: run_id,
          context: { email_type: emailType },
        })

        const EmailTemplate = EMAIL_TEMPLATES[emailType]
        if (!EmailTemplate) {
          structuredLog({
            level: 'warn',
            event: 'email.auth_webhook_rejected',
            code: 'unknown_email_type',
            route: '/lovable/email/auth/webhook',
            requestId: run_id,
            context: { email_type: emailType },
          })
          return Response.json(
            { error: `Unknown email type: ${emailType}` },
            { status: 400 }
          )
        }

        // Build template props from payload.data (HookData structure)
        const templateProps = {
          siteName: emailIdentity.siteName,
          siteUrl: emailIdentity.authSiteOrigin,
          recipient: payload.data.email,
          confirmationUrl: payload.data.url,
          token: payload.data.token,
          email: payload.data.email,
          oldEmail: payload.data.old_email,
          newEmail: payload.data.new_email,
        }

        // Render React Email to HTML and plain text
        const element = React.createElement(EmailTemplate, templateProps)
        const html = await render(element)
        const text = await render(element, { plainText: true })

        // Enqueue email for async processing by the dispatcher (process-email-queue).
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          structuredLog({
            level: 'error',
            event: 'email.auth_configuration_missing',
            code: 'supabase_environment_missing',
            route: '/lovable/email/auth/webhook',
            requestId: run_id,
            context: { source: 'server_environment' },
          })
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500 }
          )
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const messageId = crypto.randomUUID()

        // Log pending BEFORE enqueue so we have a record even if enqueue crashes
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: emailType,
          recipient_email: payload.data.email,
          status: 'pending',
        })

        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'auth_emails',
          payload: {
            run_id,
            message_id: messageId,
            to: payload.data.email,
            from: emailIdentity.from,
            sender_domain: emailIdentity.senderDomain,
            subject: EMAIL_SUBJECTS[emailType] || 'Notification',
            html,
            text,
            purpose: 'transactional',
            label: emailType,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqueueError) {
          structuredLog({
            level: 'error',
            event: 'email.auth_enqueue_failed',
            code: 'auth_email_enqueue_failed',
            route: '/lovable/email/auth/webhook',
            requestId: run_id,
            context: { email_type: emailType },
            error: enqueueError,
          })
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: emailType,
            recipient_email: payload.data.email,
            status: 'failed',
            error_message: 'Failed to enqueue email',
          })
          return Response.json(
            { error: 'Failed to enqueue email' },
            { status: 500 }
          )
        }

        structuredLog({
          level: 'info',
          event: 'email.auth_enqueued',
          code: 'auth_email_enqueued',
          route: '/lovable/email/auth/webhook',
          requestId: run_id,
          context: { email_type: emailType },
        })

        return Response.json({ success: true, queued: true })
      },
    },
  },
})

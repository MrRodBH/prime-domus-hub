import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'
import { getRequiredEmailIdentityConfig } from '@/lib/runtime/email-identity-config.server'

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Sample data for preview mode ONLY (not used in actual email sending).
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
const SAMPLE_EMAIL = "user@example.test"

function buildSampleData(siteName: string, siteOrigin: string): Record<string, object> {
  return {
    signup: { siteName, siteUrl: siteOrigin, recipient: SAMPLE_EMAIL, confirmationUrl: siteOrigin },
    magiclink: { siteName, confirmationUrl: siteOrigin },
    recovery: { siteName, confirmationUrl: siteOrigin },
    invite: { siteName, siteUrl: siteOrigin, confirmationUrl: siteOrigin },
    email_change: {
      siteName,
      oldEmail: SAMPLE_EMAIL,
      email: SAMPLE_EMAIL,
      newEmail: SAMPLE_EMAIL,
      confirmationUrl: siteOrigin,
    },
    reauthentication: { token: '123456' },
  }
}

export const Route = createFileRoute("/lovable/email/auth/preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const emailIdentity = getRequiredEmailIdentityConfig()
        const apiKey = process.env.LOVABLE_API_KEY

        if (!apiKey) {
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500 }
          )
        }

        // Verify the caller is authorized with LOVABLE_API_KEY
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let type: string
        try {
          const body = await request.json()
          type = body.type
        } catch {
          return Response.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          )
        }

        const EmailTemplate = EMAIL_TEMPLATES[type]

        if (!EmailTemplate) {
          return Response.json(
            { error: `Unknown email type: ${type}` },
            { status: 400 }
          )
        }

        const sampleData = buildSampleData(emailIdentity.siteName, emailIdentity.authSiteOrigin)[type] || {}
        const html = await render(React.createElement(EmailTemplate, sampleData))

        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      },
    },
  },
})

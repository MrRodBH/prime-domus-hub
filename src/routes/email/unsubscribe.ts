import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { structuredLog } from '@/lib/structured-log'

const SENSITIVE_LOG_KEY = /(token|authorization|cookie|jwt|secret|password|api[-_]?key)/i
const SENSITIVE_LOG_VALUE = [
  /\bBearer\s+\S+/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\bsb_secret_[A-Za-z0-9_-]+\b/i,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+\b/i,
]

type UnsubscribeFailureStage = 'lookup' | 'mark_used' | 'suppress' | 'unexpected'

export function redactUnsubscribeLogValue(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === 'string') {
    return SENSITIVE_LOG_VALUE.some((pattern) => pattern.test(value))
      ? '[REDACTED]'
      : value
  }
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) {
    return value.map((item) => redactUnsubscribeLogValue(item, seen))
  }
  const sanitized: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = SENSITIVE_LOG_KEY.test(key)
      ? '[REDACTED]'
      : redactUnsubscribeLogValue(nestedValue, seen)
  }
  return sanitized
}

function sanitizeErrorClass(error: unknown): string {
  if (error instanceof TypeError) return 'TypeError'
  if (error instanceof RangeError) return 'RangeError'
  if (error instanceof SyntaxError) return 'SyntaxError'
  if (error instanceof ReferenceError) return 'ReferenceError'
  if (error instanceof Error) return 'Error'
  return 'ExternalServiceError'
}

export function logUnsubscribeFailure(
  stage: UnsubscribeFailureStage,
  error: unknown,
  correlation: Readonly<Record<string, unknown>> = {},
): void {
  const safeCorrelation = redactUnsubscribeLogValue(correlation) as Record<string, unknown>
  const requestId = typeof safeCorrelation.request_id === 'string'
    ? safeCorrelation.request_id
    : null
  structuredLog({
    level: 'error',
    event: 'email.unsubscribe_failed',
    code: `unsubscribe_${stage}_failed`,
    route: '/email/unsubscribe',
    requestId,
    context: {
      stage,
      operation: sanitizeErrorClass(error),
    },
  })
}

export async function extractUnsubscribeToken(request: Request): Promise<string | null> {
  const url = new URL(request.url)
  let token = url.searchParams.get('token')
  if (request.method.toUpperCase() !== 'POST') return token

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(await request.text())
    if (!params.get('List-Unsubscribe')) {
      token = params.get('token') ?? token
    }
    return token
  }

  try {
    const body = (await request.json()) as { token?: unknown }
    if (typeof body.token === 'string' && body.token) token = body.token
  } catch {
    // Query-string token remains authoritative when the optional body is absent.
  }
  return token
}

export function createUnsubscribeJsonResponse(
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers)
  headers.set('Cache-Control', 'no-store')
  return Response.json(body, { ...init, headers })
}

export const Route = createFileRoute('/email/unsubscribe')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          return createUnsubscribeJsonResponse({ error: 'Server configuration error' }, { status: 500 })
        }

        const token = await extractUnsubscribeToken(request)

        if (!token) {
          return createUnsubscribeJsonResponse({ error: 'Token is required' }, { status: 400 })
        }

        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          const { data: tokenRecord, error: lookupError } = await supabase
            .from('email_unsubscribe_tokens')
            .select('*')
            .eq('token', token)
            .maybeSingle()

          if (lookupError) logUnsubscribeFailure('lookup', lookupError, { method: 'GET' })
          if (lookupError || !tokenRecord) {
            return createUnsubscribeJsonResponse({ error: 'Invalid or expired token' }, { status: 404 })
          }

          if (tokenRecord.used_at) {
            return createUnsubscribeJsonResponse({ valid: false, reason: 'already_unsubscribed' })
          }

          return createUnsubscribeJsonResponse({ valid: true })
        } catch (error) {
          logUnsubscribeFailure('unexpected', error, { method: 'GET' })
          return createUnsubscribeJsonResponse({ error: 'Failed to process unsubscribe' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          return createUnsubscribeJsonResponse({ error: 'Server configuration error' }, { status: 500 })
        }

        const token = await extractUnsubscribeToken(request)

        if (!token) {
          return createUnsubscribeJsonResponse({ error: 'Token is required' }, { status: 400 })
        }

        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          const { data: tokenRecord, error: lookupError } = await supabase
            .from('email_unsubscribe_tokens')
            .select('*')
            .eq('token', token)
            .maybeSingle()

          if (lookupError) logUnsubscribeFailure('lookup', lookupError, { method: 'POST' })
          if (lookupError || !tokenRecord) {
            return createUnsubscribeJsonResponse({ error: 'Invalid or expired token' }, { status: 404 })
          }

          if (tokenRecord.used_at) {
            return createUnsubscribeJsonResponse({ success: false, reason: 'already_unsubscribed' })
          }

          const { data: updated, error: updateError } = await supabase
            .from('email_unsubscribe_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token', token)
            .is('used_at', null)
            .select()
            .maybeSingle()

          if (updateError) {
            logUnsubscribeFailure('mark_used', updateError, { method: 'POST' })
            return createUnsubscribeJsonResponse({ error: 'Failed to process unsubscribe' }, { status: 500 })
          }

          if (!updated) {
            return createUnsubscribeJsonResponse({ success: false, reason: 'already_unsubscribed' })
          }

          const { error: suppressError } = await supabase
            .from('suppressed_emails')
            .upsert(
              { email: tokenRecord.email.toLowerCase(), reason: 'unsubscribe' },
              { onConflict: 'email' },
            )

          if (suppressError) {
            logUnsubscribeFailure('suppress', suppressError, { method: 'POST' })
            return createUnsubscribeJsonResponse({ error: 'Failed to process unsubscribe' }, { status: 500 })
          }

          structuredLog({
            level: 'info',
            event: 'email.unsubscribe_completed',
            code: 'unsubscribe_completed',
            route: '/email/unsubscribe',
            context: { outcome: 'suppressed' },
          })

          return createUnsubscribeJsonResponse({ success: true })
        } catch (error) {
          logUnsubscribeFailure('unexpected', error, { method: 'POST' })
          return createUnsubscribeJsonResponse({ error: 'Failed to process unsubscribe' }, { status: 500 })
        }
      },
    },
  },
})

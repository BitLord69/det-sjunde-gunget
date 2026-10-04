import type { H3Event } from 'h3'

export interface RateLimitOptions {
  /**
   * Scope / namespace for the limit (e.g. 'fan-upload', 'contact', 'newsletter', 'login').
   * Prevents rate limits in one feature from blocking actions in another.
   */
  scope?: string
  /**
   * Time window in milliseconds. Default: 10 minutes (600,000 ms).
   */
  windowMs?: number
  /**
   * Maximum allowed requests within the time window. Default: 5.
   */
  maxRequests?: number
  /**
   * Custom user-facing Swedish error message returned when limit is exceeded.
   */
  errorMessage?: string
}

interface RateLimitRecord {
  count: number
  firstRequestTime: number
}

// Global in-memory storage for rate limiting across API endpoints
const rateLimitMap = new Map<string, RateLimitRecord>()

// Periodic background cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    // Purge records older than 30 minutes
    if (now - record.firstRequestTime > 30 * 60 * 1000) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000).unref()

/**
 * Enforces IP-based rate limiting on Nitro API endpoints.
 * Automatically extracts the client's real IP and tracks request frequency per scope.
 * Throws a standard 429 Too Many Requests error if the threshold is exceeded.
 */
export function enforceRateLimit(event: H3Event, options: RateLimitOptions = {}): void {
  const scope = options.scope || 'default'
  const windowMs = options.windowMs || 10 * 60 * 1000 // 10 minutes
  const maxRequests = options.maxRequests || 5
  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'

  const storageKey = `${scope}:${clientIp}`
  const now = Date.now()
  const record = rateLimitMap.get(storageKey)

  if (!record || now - record.firstRequestTime > windowMs) {
    rateLimitMap.set(storageKey, { count: 1, firstRequestTime: now })
    return
  }

  if (record.count >= maxRequests) {
    const defaultMsg =
      scope === 'login'
        ? 'För många misslyckade inloggningsförsök. Vänligen vänta en stund innan du försöker igen.'
        : 'För många förfrågningar på kort tid. Vänligen vänta några minuter innan du försöker igen.'

    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: options.errorMessage || defaultMsg,
      data: {
        code: 'RATE_LIMIT_EXCEEDED',
        scope,
        retryAfterMs: Math.max(0, windowMs - (now - record.firstRequestTime)),
      },
    })
  }

  record.count++
}

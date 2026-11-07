import { readBody } from 'h3'
import { recordPublicAnalyticsEvent } from '../../utils/analytics'
import { enforceRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  // Generous rate limit per IP so normal browsing + song plays never get blocked, but flood attacks are stopped
  enforceRateLimit(event, {
    scope: 'analytics-track',
    maxRequests: 180,
    windowMs: 60 * 1000,
  })

  try {
    const body = await readBody<{
      eventType?: string
      path?: string
      referrer?: string | null
      campaign?: string | null
      locale?: string | null
      targetId?: string | null
      targetLabel?: string | null
    }>(event).catch(() => ({}))

    if (!body || typeof body !== 'object') {
      return { ok: true, tracked: false }
    }

    const res = await recordPublicAnalyticsEvent(event, {
      eventType: body.eventType || 'pageview',
      path: body.path || '/',
      referrer: body.referrer || null,
      campaign: body.campaign || null,
      locale: body.locale || null,
      targetId: body.targetId || null,
      targetLabel: body.targetLabel || null,
    })

    return { ok: true, ...res }
  } catch (err) {
    console.warn('[AnalyticsTrackAPI] Error recording event:', err)
    return { ok: true, tracked: false }
  }
})


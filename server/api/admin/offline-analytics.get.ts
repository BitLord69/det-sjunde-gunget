import { getQuery } from 'h3'
import { getAdminSession } from '../../utils/auth'
import { getOfflineAnalyticsSummary, isOfflineAnalyticsRange } from '../../utils/offline-analytics'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const session = await getAdminSession(event)
  if (!session) throw createError({ statusCode: 401, message: 'Inloggning krävs' })
  const range = getQuery(event).range
  if (!isOfflineAnalyticsRange(range)) throw createError({ statusCode: 400, message: 'Ogiltigt statistikintervall' })
  const summary = await getOfflineAnalyticsSummary(range)
  const current = await getAdminSession(event)
  if (!current || current.user.id !== session.user.id || current.expiresAt.getTime() !== session.expiresAt.getTime()) {
    throw createError({ statusCode: 401, message: 'Sessionen har upphört' })
  }
  return { userId: current.user.id, range, summary }
})
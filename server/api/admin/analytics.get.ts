import { getQuery, setHeader } from 'h3'
import { getAnalyticsDashboardData } from '../../utils/analyticsReport'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  const query = getQuery(event)
  const rangeParam = String(query.range || '30d')

  return getAnalyticsDashboardData(rangeParam)
})

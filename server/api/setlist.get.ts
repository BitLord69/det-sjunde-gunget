import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { setlistItems } from '../db/schema'

export default defineEventHandler(async (event) => {
  const isAdminOrNoCache = getCookie(event, 'gunget_session') || getHeader(event, 'cache-control')?.includes('no-cache')
  if (isAdminOrNoCache) {
    setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
  } else {
    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  }
  try {
    return await db
      .select()
      .from(setlistItems)
      .orderBy(asc(setlistItems.sortOrder))
  } catch {
    // If table not initialized yet, return empty list
    return []
  }
})

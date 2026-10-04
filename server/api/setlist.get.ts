import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { setlistItems } from '../db/schema'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
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

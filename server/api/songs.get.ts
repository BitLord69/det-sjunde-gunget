import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { songs } from '../db/schema'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  try {
    return await db
      .select()
      .from(songs)
      .orderBy(asc(songs.sortOrder))
  } catch (err: unknown) {
    console.error('[songs.get] Error fetching songs:', err)
    return []
  }
})

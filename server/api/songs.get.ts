import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { songs } from '../db/schema'

export default defineEventHandler(async () => {
  try {
    return await db
      .select()
      .from(songs)
      .orderBy(asc(songs.sortOrder))
  } catch (err: any) {
    console.error('[songs.get] Error fetching songs:', err)
    return []
  }
})

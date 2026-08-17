import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { songs } from '../db/schema'

export default defineEventHandler(async () => {
  return await db
    .select()
    .from(songs)
    .orderBy(asc(songs.sortOrder))
})

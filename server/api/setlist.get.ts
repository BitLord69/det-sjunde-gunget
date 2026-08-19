import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { setlistItems } from '../db/schema'

export default defineEventHandler(async () => {
  try {
    return await db
      .select()
      .from(setlistItems)
      .orderBy(asc(setlistItems.sortOrder))
  } catch (err: any) {
    // If table not initialized yet, return empty list
    return []
  }
})

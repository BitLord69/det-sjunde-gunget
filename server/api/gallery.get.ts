import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { galleryItems } from '../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const category = query.category as 'photo' | 'video' | 'fan_central' | undefined

  if (category) {
    return await db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.category, category))
      .orderBy(desc(galleryItems.createdAt))
  }

  return await db
    .select()
    .from(galleryItems)
    .orderBy(desc(galleryItems.createdAt))
})

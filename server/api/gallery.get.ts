import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { galleryItems } from '../db/schema'

export default defineEventHandler(async (event) => {
  const isAdminOrNoCache = getCookie(event, 'gunget_session') || getHeader(event, 'cache-control')?.includes('no-cache')
  if (isAdminOrNoCache) {
    setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
  } else {
    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  }
  const query = getQuery(event)
  const category = query.category as 'photo' | 'video' | 'fan_central' | undefined
  const epk = query.epk === 'true'

  if (epk) {
    return await db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.isEpk, true))
      .orderBy(desc(galleryItems.createdAt))
  }

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

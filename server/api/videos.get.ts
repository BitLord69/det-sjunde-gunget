import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { videos } from '../db/schema'

export default defineEventHandler(async (event) => {
  const isAdminOrNoCache = getCookie(event, 'gunget_session') || getHeader(event, 'cache-control')?.includes('no-cache')
  if (isAdminOrNoCache) {
    setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
  } else {
    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  }

  // Hämta enbart aktiva videor, sorterade efter sortOrder och sedan publiceringsdatum
  return await db
    .select()
    .from(videos)
    .where(eq(videos.isActive, true))
    .orderBy(asc(videos.sortOrder), desc(videos.publishedAt), desc(videos.createdAt))
})

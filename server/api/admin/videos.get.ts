import { asc, desc } from 'drizzle-orm'
import { db } from '../../db/client'
import { videos } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')

  return await db
    .select()
    .from(videos)
    .orderBy(asc(videos.sortOrder), desc(videos.publishedAt), desc(videos.createdAt))
})

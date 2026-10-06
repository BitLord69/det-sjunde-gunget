import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { videos } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Video-ID krävs för borttagning',
    })
  }

  await db.delete(videos).where(eq(videos.id, body.id))

  return { success: true }
})

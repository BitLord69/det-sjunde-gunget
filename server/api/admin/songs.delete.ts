import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { songs } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.id) {
    throw createError({ statusCode: 400, message: 'ID is required' })
  }

  await db.delete(songs).where(eq(songs.id, body.id))

  return { success: true, deleted: body.id }
})

import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { setlistItems } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.id) {
    throw createError({ statusCode: 400, message: 'ID krävs' })
  }

  await db.delete(setlistItems).where(eq(setlistItems.id, body.id))
  return { success: true }
})

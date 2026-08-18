import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { messages } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const query = getQuery(event)
  const id = query.id as string

  if (!id) {
    throw createError({ statusCode: 400, message: 'Message ID is required' })
  }

  await db.delete(messages).where(eq(messages.id, id))

  return { success: true, id }
})

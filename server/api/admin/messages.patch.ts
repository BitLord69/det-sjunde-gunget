import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { messages } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.id) {
    throw createError({ statusCode: 400, message: 'Message ID is required' })
  }

  const updateData: Record<string, any> = {}
  if (body.status) {
    updateData.status = body.status
  }
  if (body.read !== undefined) {
    updateData.readAt = body.read ? new Date() : null
    updateData.status = body.read ? 'read' : 'unread'
  }

  await db
    .update(messages)
    .set(updateData)
    .where(eq(messages.id, body.id))

  return { success: true, id: body.id }
})

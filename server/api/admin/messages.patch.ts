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
  if (body.status !== undefined) {
    updateData.status = body.status
    if (body.status === 'unread') {
      updateData.readAt = null
    } else {
      updateData.readAt = new Date()
    }
  }
  if (body.adminNotes !== undefined) {
    updateData.adminNotes = typeof body.adminNotes === 'string' ? body.adminNotes.trim() : null
  }
  if (body.read !== undefined && body.status === undefined) {
    updateData.readAt = body.read ? new Date() : null
    updateData.status = body.read ? 'read' : 'unread'
  }

  await db
    .update(messages)
    .set(updateData)
    .where(eq(messages.id, body.id))

  return { success: true, id: body.id }
})

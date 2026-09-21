import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { epkDocuments } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body?.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dokument-ID saknas.',
    })
  }

  await db.delete(epkDocuments).where(eq(epkDocuments.id, body.id))
  return { success: true }
})

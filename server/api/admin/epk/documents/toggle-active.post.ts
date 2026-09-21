import { eq } from 'drizzle-orm'
import { db } from '../../../../db/client'
import { epkDocuments } from '../../../../db/schema'
import { requireAdminAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body?.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dokument-ID saknas.',
    })
  }

  const [doc] = await db
    .select()
    .from(epkDocuments)
    .where(eq(epkDocuments.id, body.id))

  if (!doc) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dokument hittades inte.',
    })
  }

  const newActive = !doc.isActive
  await db
    .update(epkDocuments)
    .set({
      isActive: newActive,
      updatedAt: new Date(),
    })
    .where(eq(epkDocuments.id, body.id))

  return {
    success: true,
    id: doc.id,
    isActive: newActive,
  }
})

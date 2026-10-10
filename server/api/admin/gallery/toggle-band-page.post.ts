import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { galleryItems } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.id) {
    throw createError({ statusCode: 400, message: 'Item ID is required' })
  }

  const existing = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.id, body.id))
    .limit(1)

  if (!existing || existing.length === 0 || !existing[0]) {
    throw createError({ statusCode: 404, message: 'Gallery item not found' })
  }

  const current = existing[0]
  const newStatus = !current.showOnBandPage

  await db
    .update(galleryItems)
    .set({
      showOnBandPage: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(galleryItems.id, body.id))

  return {
    success: true,
    id: body.id,
    showOnBandPage: newStatus,
  }
})

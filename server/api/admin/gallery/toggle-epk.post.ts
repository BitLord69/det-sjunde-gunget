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
  const newStatus = !current.isEpk

  const updateData: { isEpk: boolean; updatedAt: Date; epkResolution?: string } = {
    isEpk: newStatus,
    updatedAt: new Date(),
  }

  if (newStatus && body.resolution && !current.epkResolution) {
    updateData.epkResolution = body.resolution
  }

  await db
    .update(galleryItems)
    .set(updateData)
    .where(eq(galleryItems.id, body.id))

  return {
    success: true,
    id: body.id,
    isEpk: newStatus,
    epkResolution: updateData.epkResolution || current.epkResolution || null,
  }
})

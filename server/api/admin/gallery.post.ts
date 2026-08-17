import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { galleryItems } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.mediaUrl) {
    throw createError({ statusCode: 400, message: 'mediaUrl is required' })
  }

  const id = body.id || `gal-${nanoid(8)}`
  const now = new Date()

  if (body.id) {
    await db
      .update(galleryItems)
      .set({
        category: body.category || 'photo',
        mediaUrl: body.mediaUrl,
        frameStyle: body.frameStyle || 'polaroid',
        rotation: parseInt(body.rotation || 0),
        captionSv: body.captionSv || null,
        captionEn: body.captionEn || null,
        altTextSv: body.altTextSv || 'Det 7:e Gunget bild',
        altTextEn: body.altTextEn || 'Det 7:e Gunget photo',
        updatedAt: now,
      })
      .where(eq(galleryItems.id, body.id))

    return { success: true, id: body.id, updated: true }
  } else {
    await db.insert(galleryItems).values({
      id,
      category: body.category || 'photo',
      mediaUrl: body.mediaUrl,
      frameStyle: body.frameStyle || 'polaroid',
      rotation: parseInt(body.rotation || 0),
      captionSv: body.captionSv || null,
      captionEn: body.captionEn || null,
      altTextSv: body.altTextSv || 'Det 7:e Gunget bild',
      altTextEn: body.altTextEn || 'Det 7:e Gunget photo',
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, id, created: true }
  }
})

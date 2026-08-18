import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { songs } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.title || !body.embedUrl) {
    throw createError({ statusCode: 400, message: 'Title and embedUrl are required' })
  }

  const id = body.id || `song-${nanoid(8)}`
  const now = new Date()

  if (body.id) {
    await db
      .update(songs)
      .set({
        title: body.title,
        isOriginal: Boolean(body.isOriginal),
        originalArtist: body.originalArtist || null,
        embedProvider: body.embedProvider || 'spotify',
        embedUrl: body.embedUrl,
        audioUrl: body.audioUrl || null,
        duration: body.duration ? parseInt(body.duration, 10) : null,
        updatedAt: now,
      })
      .where(eq(songs.id, body.id))

    return { success: true, id: body.id, updated: true }
  } else {
    await db.insert(songs).values({
      id,
      title: body.title,
      isOriginal: Boolean(body.isOriginal),
      originalArtist: body.originalArtist || null,
      embedProvider: body.embedProvider || 'spotify',
      embedUrl: body.embedUrl,
      audioUrl: body.audioUrl || null,
      duration: body.duration ? parseInt(body.duration, 10) : null,
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, id, created: true }
  }
})

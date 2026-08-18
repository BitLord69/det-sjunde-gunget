import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { songs } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'
import { publishToSocialMedia } from '../../utils/social'

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
  }

  // Cross-post to Facebook & Instagram if requested
  let socialResult = null
  if (body.postToSocials) {
    socialResult = await publishToSocialMedia({
      type: 'song',
      title: body.title,
      subtitle: body.isOriginal ? 'Original' : `Cover av ${body.originalArtist || ''}`,
      embedUrl: body.embedUrl,
    })
  }

  return {
    success: true,
    id,
    saved: true,
    social: socialResult,
  }
})

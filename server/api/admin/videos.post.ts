import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { videos } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'
import { publishToSocialMedia } from '../../utils/social'
import { extractYouTubeId } from '../../utils/youtubeSync'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.title || !body.url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Titel och video-URL krävs',
    })
  }

  const youtubeId = body.youtubeId || extractYouTubeId(body.url)
  if (!youtubeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Kunde inte identifiera ett giltigt YouTube-ID från länken',
    })
  }

  const now = new Date()
  const id = body.id || `vid-${nanoid(8)}`
  const publishedAt = body.publishedAt ? new Date(body.publishedAt) : now
  const thumbnailUrl = body.thumbnailUrl || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
  const cleanUrl = `https://www.youtube.com/watch?v=${youtubeId}`

  const data = {
    title: body.title.trim(),
    description: body.description?.trim() || null,
    url: cleanUrl,
    youtubeId,
    thumbnailUrl,
    publishedAt,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    updatedAt: now,
  }

  if (body.id) {
    // Uppdatera befintlig video
    await db.update(videos).set(data).where(eq(videos.id, body.id))
  } else {
    // Skapa ny video
    await db.insert(videos).values({
      id,
      ...data,
      createdAt: now,
    })
  }

  // Om användaren valt att posta till sociala medier
  let socialResult = null
  if (body.postToSocials) {
    try {
      socialResult = await publishToSocialMedia({
        type: 'video',
        title: data.title,
        videoUrl: data.url,
        embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
        notes: data.description ? data.description.slice(0, 250) : undefined,
        hashtags: body.hashtags,
      })
    } catch (err: any) {
      console.error('[Social] Error posting video to social media:', err?.message || err)
    }
  }

  return {
    success: true,
    id,
    video: { id, ...data },
    social: socialResult,
  }
})

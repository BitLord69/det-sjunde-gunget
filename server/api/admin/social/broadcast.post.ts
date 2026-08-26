import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { galleryItems, gigs, songs } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'
import { publishToSocialMedia, type SocialPostParams } from '../../../utils/social'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.type || !body.id) {
    throw createError({ statusCode: 400, message: 'type and id are required' })
  }

  let postParams: SocialPostParams | null = null

  if (body.type === 'gig') {
    const gigRows = await db.select().from(gigs).where(eq(gigs.id, body.id)).limit(1)
    const gig = gigRows[0]
    if (!gig) throw createError({ statusCode: 404, message: 'Gig hittades inte' })

    postParams = {
      type: 'gig',
      title: `Spelning på ${gig.venue}, ${gig.city}`,
      venue: gig.venue,
      city: gig.city,
      date: gig.date,
      ticketUrl: gig.ticketUrl || undefined,
      notes: body.customNotes || gig.notesSv || undefined,
      hashtags: body.hashtags,
    }
  } else if (body.type === 'gallery') {
    const galRows = await db.select().from(galleryItems).where(eq(galleryItems.id, body.id)).limit(1)
    const gal = galRows[0]
    if (!gal) throw createError({ statusCode: 404, message: 'Bilden hittades inte' })

    postParams = {
      type: 'gallery',
      title: body.customNotes || gal.captionSv || 'Ny bild i galleriet',
      imageUrl: gal.mediaUrl,
      notes: body.customNotes || gal.captionSv || undefined,
      hashtags: body.hashtags,
    }
  } else if (body.type === 'song') {
    const songRows = await db.select().from(songs).where(eq(songs.id, body.id)).limit(1)
    const song = songRows[0]
    if (!song) throw createError({ statusCode: 404, message: 'Låten hittades inte' })

    postParams = {
      type: 'song',
      title: song.title,
      subtitle: song.isOriginal ? 'Original' : `Cover av ${song.originalArtist || ''}`,
      embedUrl: song.embedUrl,
      imageUrl: song.coverImage || undefined,
      notes: body.customNotes || undefined,
      hashtags: body.hashtags,
    }
  }

  if (!postParams) {
    throw createError({ statusCode: 400, message: 'Ogiltig objekttyp' })
  }

  const result = await publishToSocialMedia(postParams)

  return {
    success: result.success,
    social: result,
  }
})

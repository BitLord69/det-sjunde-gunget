import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { gigs } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'
import { publishToSocialMedia } from '../../utils/social'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.venue || !body.city || !body.date) {
    throw createError({ statusCode: 400, message: 'Venue, city and date are required' })
  }

  const id = body.id || `gig-${nanoid(8)}`
  const gigDate = new Date(body.date)
  const now = new Date()

  const setlistJson = body.setlist ? (typeof body.setlist === 'string' ? body.setlist : JSON.stringify(body.setlist)) : null

  if (body.id) {
    // Update
    await db
      .update(gigs)
      .set({
        venue: body.venue,
        city: body.city,
        date: gigDate,
        ticketUrl: body.ticketUrl || null,
        status: body.status || 'upcoming',
        notesSv: body.notesSv || null,
        notesEn: body.notesEn || null,
        setlist: setlistJson,
        updatedAt: now,
      })
      .where(eq(gigs.id, body.id))
  } else {
    // Insert
    await db.insert(gigs).values({
      id,
      venue: body.venue,
      city: body.city,
      date: gigDate,
      ticketUrl: body.ticketUrl || null,
      status: body.status || 'upcoming',
      notesSv: body.notesSv || null,
      notesEn: body.notesEn || null,
      setlist: setlistJson,
      createdAt: now,
      updatedAt: now,
    })
  }

  // Cross-post to Facebook & Instagram if requested
  let socialResult = null
  if (body.postToSocials) {
    socialResult = await publishToSocialMedia({
      type: 'gig',
      title: `Spelning på ${body.venue}, ${body.city}`,
      venue: body.venue,
      city: body.city,
      date: gigDate,
      ticketUrl: body.ticketUrl,
      notes: body.notesSv,
      hashtags: body.hashtags,
    })
  }

  return {
    success: true,
    id,
    saved: true,
    social: socialResult,
  }
})

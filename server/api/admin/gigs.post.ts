import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { gigs } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.venue || !body.city || !body.date) {
    throw createError({ statusCode: 400, message: 'Venue, city and date are required' })
  }

  const id = body.id || `gig-${nanoid(8)}`
  const gigDate = new Date(body.date)
  const now = new Date()

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
        updatedAt: now,
      })
      .where(eq(gigs.id, body.id))

    return { success: true, id: body.id, updated: true }
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
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, id, created: true }
  }
})

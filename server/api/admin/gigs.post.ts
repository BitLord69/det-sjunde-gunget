import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { gigs, gigSetlistItems, songs } from '../../db/schema'
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

  let rawSetlist = body.setlistItems || body.setlist
  let parsedSetlist: any[] = []
  if (typeof rawSetlist === 'string') {
    try {
      parsedSetlist = JSON.parse(rawSetlist)
    } catch {}
  } else if (Array.isArray(rawSetlist)) {
    parsedSetlist = rawSetlist
  }

  const setlistJson = parsedSetlist.length > 0 ? JSON.stringify(parsedSetlist) : null

  if (body.id) {
    // Update gig
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
    // Insert gig
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

  // 2. Relational setlist management
  await db.delete(gigSetlistItems).where(eq(gigSetlistItems.gigId, id))

  if (parsedSetlist.length > 0) {
    // Fetch all existing songs to cross-match songId
    const allSongs = await db.select({ id: songs.id, title: songs.title }).from(songs)
    const songMap = new Map<string, string>()
    for (const s of allSongs) {
      if (s.title) songMap.set(s.title.toLowerCase().trim(), s.id)
    }

    for (let idx = 0; idx < parsedSetlist.length; idx++) {
      const item = parsedSetlist[idx]
      const title = item.title || item.name || 'Namnlös låt'
      const matchedSongId = songMap.get(title.toLowerCase().trim()) || item.songId || null

      await db.insert(gigSetlistItems).values({
        id: `gsi-${nanoid(8)}`,
        gigId: id,
        songId: matchedSongId,
        title,
        artist: item.artist || item.originalArtist || null,
        isOriginal: Boolean(item.isOriginal),
        setName: item.setName || item.set || 'Set 1',
        notes: item.notes || null,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : idx,
        createdAt: now,
        updatedAt: now,
      })
    }
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

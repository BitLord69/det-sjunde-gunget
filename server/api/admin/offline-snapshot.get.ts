import { asc, desc, ne } from 'drizzle-orm'
import { db } from '../../db/client'
import { galleryItems, gigs, setlistItems, songs } from '../../db/schema'
import { getAdminSession } from '../../utils/auth'
import { getOfflineAnalyticsSummary } from '../../utils/offline-analytics'

function approvedImageUrl(value: string): string | null {
  try {
    if (value.startsWith('/media/') && !value.startsWith('//')) {
      const url = new URL(value, 'https://offline.invalid')
      if (url.origin === 'https://offline.invalid' && url.pathname.startsWith('/media/') && !url.pathname.startsWith('/media/fan-central/') && !url.search && !url.hash && !/%2f|%5c/i.test(url.pathname)) return url.pathname
    }
    const host = process.env.OFFLINE_GALLERY_BLOB_HOST?.toLowerCase()
    const url = new URL(value)
    if (host && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(host) && url.protocol === 'https:' && url.hostname === host && !url.port && !url.username && !url.password && url.pathname.startsWith('/media/') && !url.search && !url.hash) return url.href
  } catch { /* Invalid and unapproved URLs are not exported. */ }
  return null
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const session = await getAdminSession(event)
  if (!session) throw createError({ statusCode: 401, message: 'Inloggning krävs' })

  // Each dataset is isolated so a missing table is reported, not mistaken for an empty list.
  const requests = {
    songs: () => db.select({ id: songs.id, title: songs.title, originalArtist: songs.originalArtist, isOriginal: songs.isOriginal, lyrics: songs.lyrics, lyricsEn: songs.lyricsEn, chords: songs.chords }).from(songs).orderBy(asc(songs.sortOrder)),
    setlist: () => db.select({ id: setlistItems.id, title: setlistItems.title, artist: setlistItems.artist, setName: setlistItems.setName, notes: setlistItems.notes }).from(setlistItems).orderBy(asc(setlistItems.sortOrder)),
    gigs: () => db.select({ id: gigs.id, date: gigs.date, venue: gigs.venue, city: gigs.city, status: gigs.status, notesSv: gigs.notesSv }).from(gigs).orderBy(asc(gigs.date)),
    // Only approved image URLs are exposed temporarily for client-side thumbnail preparation.
    gallery: async () => (await db.select({ id: galleryItems.id, category: galleryItems.category, caption: galleryItems.captionSv, alt: galleryItems.altTextSv, takenAt: galleryItems.takenAt, mediaUrl: galleryItems.mediaUrl }).from(galleryItems).where(ne(galleryItems.category, 'fan_central')).orderBy(desc(galleryItems.createdAt))).map(({ mediaUrl, ...item }) => ({ ...item, thumbnailSource: item.category === 'photo' ? approvedImageUrl(mediaUrl) : null })),
    analytics: () => getOfflineAnalyticsSummary('7d'),
  }
  const entries = await Promise.all(Object.entries(requests).map(async ([key, load]) => {
    try { return [key, { available: true, data: await load() }] as const }
    catch { return [key, { available: false, data: null }] as const }
  }))
  // A logout or expiry during data collection must not mint a fresh snapshot.
  const current = await getAdminSession(event)
  if (!current || current.user.id !== session.user.id || current.expiresAt.getTime() !== session.expiresAt.getTime()) {
    throw createError({ statusCode: 401, message: 'Sessionen har upphört' })
  }
  return { userId: current.user.id, sessionExpiresAt: current.expiresAt.toISOString(), serverTime: new Date().toISOString(), datasets: Object.fromEntries(entries) }
})
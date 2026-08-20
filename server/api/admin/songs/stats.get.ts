import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { gigs, gigSetlistItems, songs } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export interface SongLiveStats {
  id?: string | null
  title: string
  artist?: string | null
  isOriginal: boolean
  playCount: number
  firstPlayed?: Date | null
  lastPlayed?: Date | null
  gigs: Array<{
    gigId: string
    venue: string
    city: string
    date: Date | number
    setName: string
  }>
}

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  try {
    // Fetch all gig setlist items with their parent gig
    const items = await db.query.gigSetlistItems.findMany({
      with: {
        gig: true,
        song: true,
      },
      orderBy: [asc(gigSetlistItems.sortOrder)],
    })

    // Aggregate stats by normalized title
    const statsMap = new Map<string, SongLiveStats>()

    for (const item of items) {
      if (!item.gig) continue
      const normKey = (item.title || '').toLowerCase().trim()
      if (!normKey) continue

      let stat = statsMap.get(normKey)
      if (!stat) {
        stat = {
          id: item.songId || (item.song?.id) || null,
          title: item.song?.title || item.title,
          artist: item.artist || item.song?.originalArtist || null,
          isOriginal: item.song ? item.song.isOriginal : item.isOriginal,
          playCount: 0,
          firstPlayed: null,
          lastPlayed: null,
          gigs: [],
        }
        statsMap.set(normKey, stat)
      }

      stat.playCount++
      const gigDate = new Date(item.gig.date)

      if (!stat.firstPlayed || gigDate < new Date(stat.firstPlayed)) {
        stat.firstPlayed = gigDate
      }
      if (!stat.lastPlayed || gigDate > new Date(stat.lastPlayed)) {
        stat.lastPlayed = gigDate
      }

      stat.gigs.push({
        gigId: item.gig.id,
        venue: item.gig.venue,
        city: item.gig.city,
        date: item.gig.date,
        setName: item.setName,
      })
    }

    // Convert map to sorted array (most played first)
    const statsList = Array.from(statsMap.values()).sort((a, b) => b.playCount - a.playCount)

    // Quick lookup dictionary by title or songId
    const lookupByTitle: Record<string, number> = {}
    const lookupById: Record<string, number> = {}

    for (const s of statsList) {
      lookupByTitle[s.title.toLowerCase().trim()] = s.playCount
      if (s.id) lookupById[s.id] = s.playCount
    }

    const totalPerformances = statsList.reduce((acc, curr) => acc + curr.playCount, 0)
    const uniqueSongsCount = statsList.length

    return {
      stats: statsList,
      lookupByTitle,
      lookupById,
      totalPerformances,
      uniqueSongsCount,
    }
  } catch (err: any) {
    console.error('[AdminStatsAPI] Error aggregating song stats:', err)
    return {
      stats: [],
      lookupByTitle: {},
      lookupById: {},
      totalPerformances: 0,
      uniqueSongsCount: 0,
    }
  }
})

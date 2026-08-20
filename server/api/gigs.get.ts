import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { gigs, gigSetlistItems } from '../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const allGigs = await db.query.gigs.findMany({
    orderBy: [asc(gigs.date)],
    with: {
      setlistItems: {
        orderBy: [asc(gigSetlistItems.sortOrder)],
      },
    },
  })

  // Format setlist for backwards compatibility and easy consumption
  const formattedGigs = allGigs.map((g) => ({
    ...g,
    setlist: g.setlistItems && g.setlistItems.length > 0 ? JSON.stringify(g.setlistItems) : g.setlist,
  }))

  const now = new Date().getTime()
  const upcoming = formattedGigs.filter((g) => new Date(g.date).getTime() >= now - 24 * 60 * 60 * 1000)
  const past = formattedGigs.filter((g) => new Date(g.date).getTime() < now - 24 * 60 * 60 * 1000).reverse()

  if (query.type === 'upcoming') return upcoming
  if (query.type === 'past') return past

  return {
    upcoming,
    past,
    all: formattedGigs,
  }
})
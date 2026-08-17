import { asc, desc } from 'drizzle-orm'
import { db } from '../db/client'
import { gigs } from '../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const allGigs = await db.select().from(gigs).orderBy(asc(gigs.date))

  const now = new Date().getTime()
  const upcoming = allGigs.filter((g) => new Date(g.date).getTime() >= now - 24 * 60 * 60 * 1000)
  const past = allGigs.filter((g) => new Date(g.date).getTime() < now - 24 * 60 * 60 * 1000).reverse()

  if (query.type === 'upcoming') return upcoming
  if (query.type === 'past') return past

  return {
    upcoming,
    past,
    all: allGigs,
  }
})
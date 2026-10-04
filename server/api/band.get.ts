import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { bandMembers } from '../db/schema'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600')
  const members = await db
    .select()
    .from(bandMembers)
    .orderBy(asc(bandMembers.sortOrder))

  return members
})

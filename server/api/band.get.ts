import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { bandMembers } from '../db/schema'

export default defineEventHandler(async () => {
  const members = await db
    .select()
    .from(bandMembers)
    .orderBy(asc(bandMembers.sortOrder))

  return members
})

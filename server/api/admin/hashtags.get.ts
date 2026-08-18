import { asc } from 'drizzle-orm'
import { db } from '../../db/client'
import { socialHashtags } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const tags = await db
    .select()
    .from(socialHashtags)
    .orderBy(asc(socialHashtags.sortOrder), asc(socialHashtags.tag))

  return tags
})

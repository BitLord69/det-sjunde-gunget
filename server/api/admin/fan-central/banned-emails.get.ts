import { desc } from 'drizzle-orm'
import { db } from '../../../db/client'
import { bannedEmails } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const list = await db
    .select()
    .from(bannedEmails)
    .orderBy(desc(bannedEmails.bannedAt))

  return list
})

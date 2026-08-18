import { desc } from 'drizzle-orm'
import { db } from '../../db/client'
import { subscribers } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  return await db
    .select()
    .from(subscribers)
    .orderBy(desc(subscribers.subscribedAt))
})

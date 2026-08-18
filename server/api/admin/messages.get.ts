import { desc } from 'drizzle-orm'
import { db } from '../../db/client'
import { messages } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  return await db
    .select()
    .from(messages)
    .orderBy(desc(messages.createdAt))
})

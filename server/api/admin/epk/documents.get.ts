import { asc, desc } from 'drizzle-orm'
import { db } from '../../../db/client'
import { epkDocuments } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  return await db
    .select()
    .from(epkDocuments)
    .orderBy(asc(epkDocuments.sortOrder), desc(epkDocuments.createdAt))
})

import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { epkDocuments } from '../../db/schema'

export default defineEventHandler(async () => {
  return await db
    .select()
    .from(epkDocuments)
    .where(eq(epkDocuments.isActive, true))
    .orderBy(asc(epkDocuments.sortOrder), desc(epkDocuments.createdAt))
})

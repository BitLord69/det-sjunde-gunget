import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { gigs } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.id) {
    throw createError({ statusCode: 400, message: 'ID is required' })
  }

  await db.delete(gigs).where(eq(gigs.id, body.id))

  return { success: true, deleted: body.id }
})

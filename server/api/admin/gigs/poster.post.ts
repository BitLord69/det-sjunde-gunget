import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { gigs } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.gigId || !body.posterUrl) {
    throw createError({ statusCode: 400, message: 'gigId och posterUrl krävs' })
  }

  await db
    .update(gigs)
    .set({
      posterUrl: body.posterUrl,
      updatedAt: new Date(),
    })
    .where(eq(gigs.id, body.gigId))

  return {
    success: true,
    gigId: body.gigId,
    posterUrl: body.posterUrl,
  }
})

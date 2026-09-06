import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { fanSubmissions } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  const { id, action } = body
  if (!id || !action) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID och åtgärd (action) är obligatoriska fält.',
    })
  }

  const existing = await db
    .select()
    .from(fanSubmissions)
    .where(eq(fanSubmissions.id, id))
    .limit(1)

  if (existing.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bilden hittades inte.',
    })
  }

  const now = new Date()

  if (action === 'delete') {
    await db.delete(fanSubmissions).where(eq(fanSubmissions.id, id))
    return { success: true, message: 'Bilden raderades permanent.' }
  }

  if (action === 'approve') {
    await db
      .update(fanSubmissions)
      .set({
        status: 'approved',
        reviewedAt: now,
        updatedAt: now,
        ...(body.rotation !== undefined ? { rotation: parseInt(body.rotation, 10) } : {}),
        ...(body.fastenerType ? { fastenerType: body.fastenerType } : {}),
        ...(body.pinColor ? { pinColor: body.pinColor } : {}),
        ...(body.caption !== undefined ? { caption: body.caption } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.takenWhen !== undefined ? { takenWhen: body.takenWhen } : {}),
        ...(body.isMachineFan !== undefined ? { isMachineFan: Boolean(body.isMachineFan) } : {}),
      })
      .where(eq(fanSubmissions.id, id))

    return { success: true, message: 'Bilden godkändes och är nu publicerad på korktavlan.' }
  }

  if (action === 'reject') {
    await db
      .update(fanSubmissions)
      .set({
        status: 'rejected',
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(fanSubmissions.id, id))

    return { success: true, message: 'Bilden avvisades.' }
  }

  throw createError({
    statusCode: 400,
    statusMessage: `Okänd åtgärd: ${action}`,
  })
})
